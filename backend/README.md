# portfolio-backend

The chat API behind the portfolio. A Next.js app with **no frontend** — two API
routes and nothing else. The SvelteKit site at the repo root calls it.

## Why it's a separate app

The Svelte app is static and public; this holds a Gemini API key and must stay
server-side. Keeping them apart means the key never enters a browser bundle, and
the API can be reused or redeployed without touching the portfolio.

## Architecture

```
Browser (Svelte)                       This service                 Google
──────────────────                     ─────────────                ──────
IndexedDB: chat history
      │
      │ POST /api/chat
      │ { messages: [...entire history...] }
      ▼
                              validate → CORS → rate limit
                              system prompt = data/about-me.md
                                      │
                                      ├──────────────────────────▶ Gemini
                                      ◀────────── streamed text ───┘
      ◀─── text/plain stream ─────────┘
      │
   append turn to IndexedDB
```

**This service is stateless.** It stores nothing. Conversation history lives in
the browser's IndexedDB and is replayed on every request, which is why
`/api/chat` takes the whole `messages` array rather than a session id.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in GEMINI_API_KEY
npm run dev                    # http://localhost:4000
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). It is a
Gemini Developer API key — it bills to Google AI, not to a Google Cloud project.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini Developer API key. Server-side only. |
| `ALLOWED_ORIGINS` | in production | Comma-separated origins permitted to call the API. Without it, only localhost dev servers are allowed. |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.5-flash-lite`. |
| `RATE_LIMIT_PER_MINUTE` | no | Per-IP cap, default 10. |

## API

### `GET /api/health`

Deploy check. Confirms the key is present and the knowledge base loads. Returns
503 if either is missing. Never returns the key.

```json
{ "ok": true, "model": "gemini-3.5-flash-lite", "geminiKeyConfigured": true,
  "knowledgeChars": 14832, "knowledgeApproxTokens": 3708 }
```

### `POST /api/chat`

**Request**

```json
{ "messages": [ { "role": "user", "content": "What did he build at Mark AI?" } ] }
```

- `role` is `user` or `assistant`; the last message must be from `user`.
- Max 20 messages per request, max 2,000 characters each.

**Response** — a `text/plain` stream, not JSON and not SSE. Read it with a
standard reader; no event parsing needed.

**Errors** are JSON: `400` invalid body, `403` origin not allowed, `429` rate
limited (with `Retry-After`), `502` upstream failure.

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

Then append `{ role: 'assistant', content: answer }` to IndexedDB alongside the
user turn.

## The knowledge base

`data/about-me.md` is the single source of truth for what the assistant knows.
It is Markdown rather than JSON because it goes straight into the system prompt,
and Markdown costs far fewer tokens than the equivalent braces and quotes.

Edit it by hand for small corrections. Its final section, **Answering
guidance**, is instruction rather than fact — it tells the model to admit gaps,
stay in third person, and avoid three specific stale résumé claims.

It is read from disk at runtime, so `next.config.mjs` traces `./data/**` into
the deployed function. Moving that file means updating that config.

## Deploying

This lives in a subdirectory of the portfolio repo, so Vercel needs pointing at
it:

1. New Vercel project from the same repo.
2. **Root Directory** → `backend`.
3. Add `GEMINI_API_KEY` and `ALLOWED_ORIGINS` as environment variables.
4. Set an **Ignored Build Step** so pushes that only touch the Svelte app don't
   rebuild this one:
   ```
   git diff --quiet HEAD^ HEAD -- .
   ```

Then add the deployed origin to the Svelte app as the API base URL, and add the
Svelte app's origin to `ALLOWED_ORIGINS` here.

## Cost

`gemini-3.5-flash-lite` is $0.10 per million input tokens, $0.40 per million
output. With a ~4k-token knowledge base and short answers that is roughly
**$0.001 per message** — about a dollar per thousand conversations.

No context caching: Google charges cache storage per hour, which for sporadic
portfolio traffic costs more than just resending the prompt.

## Rate limiting

`lib/ratelimit.ts` is an in-memory fixed window, so the limit is per serverless
instance rather than global — a visitor spread across instances gets a higher
effective cap than configured. That is enough to stop a script hammering the
endpoint in a loop, which is its actual job. If it ever needs to be exact, swap
the `Map` for Upstash Redis; the function signature won't change.
