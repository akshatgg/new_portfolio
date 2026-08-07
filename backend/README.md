# portfolio-backend

The chat agent behind the portfolio. A Next.js app with **no frontend** — API routes
only. The SvelteKit site at the repo root calls it.

It is a **tool-calling agent**, not a stuffed prompt. The system prompt is a short
orientation; the actual facts are fetched at question time from Akshat's live Confluence
space and the PDFs in this repo. Edit a Confluence page and the next answer reflects it —
no redeploy.

## Architecture

```
Browser (Svelte)                  This service                   External
──────────────────                ─────────────                  ────────
IndexedDB: chat history
      │
      │ POST /api/chat
      │ { messages: [...entire history...] }
      ▼
                        validate → CORS → rate limit
                                  │
                                  ▼
                        ┌── agent loop (max 4 rounds) ──┐
                        │                                │
                        │   Gemini  ──────────────────────────▶ Gemini API
                        │     │ wants a tool?             │
                        │     ▼                           │
                        │   search_confluence      ───────────▶ Confluence
                        │   read_confluence_page   ───────────▶ (live)
                        │   list_documents         ───────────▶
                        │   read_resume            ──▶ data/docs/*.pdf
                        │     │                           │
                        │     └── results back to Gemini ─┘
                        └────────────────────────────────┘
                                  │
      ◀─── text/plain stream ─────┘
      │
   append turn to IndexedDB
```

**This service is stateless.** It stores nothing. Conversation history lives in the
browser's IndexedDB and is replayed on every request, which is why `/api/chat` takes the
whole `messages` array rather than a session id.

## The tools

| Tool | Purpose |
|---|---|
| `list_documents` | Every Confluence page (title + id) and the available PDFs. Cheap orientation when the model doesn't know where to look. |
| `search_confluence(query)` | CQL full-text search across the space. Returns titles, ids, excerpts. |
| `read_confluence_page(page_id)` | Full text of one page, converted from Confluence storage format to readable Markdown. |
| `read_resume(document)` | Text of `resume` or `cv`, extracted from the PDFs in `data/docs/`. |

Tool results are capped at 24k characters each, and the loop stops after 4 rounds — both
bound latency and spend if the model fails to converge.

## Setup

```bash
npm install
cp .env.example .env     # fill in the keys below
npm run dev              # http://localhost:4000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini Developer API key ([AI Studio](https://aistudio.google.com/apikey)). |
| `ATLASSIAN_EMAIL` | for live docs | The Atlassian account email — `akshatg9636@gmail.com`. |
| `ATLASSIAN_API_TOKEN` | for live docs | [Create one here](https://id.atlassian.com/manage-profile/security/api-tokens). |
| `ALLOWED_ORIGINS` | in production | Comma-separated origins permitted to call the API. Without it, only localhost. |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.5-flash-lite`. |
| `RATE_LIMIT_PER_MINUTE` | no | Per-IP cap, default 10. |
| `CONFLUENCE_CACHE_TTL_MS` | no | Per-instance cache lifetime, default 15 min. |

**No Confluence app is required** — not a Marketplace app, not Forge, not OAuth. A plain
API token over Basic auth is enough, because this is one account reading its own space.
Apps are only needed when third parties authorise an integration.

If the Atlassian variables are missing the agent still runs: it falls back to the static
`data/about-me.md` snapshot and is told not to call the Confluence tools.

## API

### `GET /api/health`

Exercises every dependency — Gemini config, the system prompt, a real Confluence call, and
PDF extraction. Returns 503 if any fails. Never returns a credential.

```json
{ "ok": true, "model": "gemini-3.5-flash-lite", "mode": "live-confluence",
  "confluence": { "ok": true, "pageCount": 10 },
  "documents": { "ok": true, "extractedChars": { "resume": 5278, "cv": 13060 } } }
```

### `POST /api/chat`

**Request**

```json
{ "messages": [ { "role": "user", "content": "What did he build at Mark AI?" } ] }
```

- `role` is `user` or `assistant`; the last message must be from `user`.
- Max 20 messages per request, max 2,000 characters each.

**Response** — a `text/plain` stream, not JSON and not SSE. Read it with a standard reader;
no event parsing needed.

**Errors** are JSON: `400` invalid body, `403` origin not allowed, `429` rate limited
(with `Retry-After`).

### Calling it from SvelteKit

```js
const res = await fetch(`${API_BASE}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })   // the full history from IndexedDB
});

if (!res.ok) throw new Error((await res.json()).error);

const reader = res.body.getReader();
const decoder = new TextDecoder();
let answer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  answer += decoder.decode(value, { stream: true });
  // render `answer` as it grows
}
```

Then append `{ role: 'assistant', content: answer }` to IndexedDB alongside the user turn.

## Content sources

| What | Where | Refresh |
|---|---|---|
| Confluence pages | `akshatg9636.atlassian.net`, space `~7120200844476cfa4946c3b51daf1ada4a318d` | Edit the page — live, no deploy |
| Résumé / CV | `data/docs/resume.pdf`, `data/docs/cv.pdf` (copies of `static/Akshat.pdf` and `static/Akshat_CV.pdf`) | Replace the file and redeploy |
| Behaviour rules | `data/system-prompt.md` | Edit and redeploy |
| Offline fallback | `data/about-me.md` | Only used when Atlassian credentials are absent |

`data/system-prompt.md` also carries two standing corrections: don't quote a Mark AI fleet
size, and don't describe the Android player as using a WebSocket. Both are stale résumé
claims, and the model is told to avoid them even if it reads them in a document.

Everything under `data/` is traced into the deployed function by `next.config.mjs`.

## Deploying

Already wired: the Vercel project `portfolio-backend` is Git-connected to this repo with
**Root Directory `backend`**, so a push to `master` deploys it. `vercel.json` sets an
ignore command so pushes that touch nothing under `backend/` skip the build.

Root Directory is not settable from the Vercel CLI — it was set via
`PATCH https://api.vercel.com/v9/projects/{id}`.

## Cost and latency

`gemini-3.5-flash-lite` with a ~3.4k-token system prompt. A question needing two tool
rounds makes three model calls and pulls up to ~24k characters of document text, so expect
roughly a cent per conversation rather than a tenth of one — the tools trade tokens for
accuracy and currency.

Confluence responses are cached per serverless instance for 15 minutes, so a burst of
questions hits Atlassian once, not once per message.

## Rate limiting

`lib/ratelimit.ts` is an in-memory fixed window, so the limit is per serverless instance
rather than global — a visitor spread across instances gets a higher effective cap than
configured. That is enough to stop a script hammering the endpoint in a loop, which is its
actual job. If it ever needs to be exact, swap the `Map` for Upstash Redis; the function
signature won't change.
