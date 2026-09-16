import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { buildSystemInstruction } from '@/lib/knowledge';
import { corsHeaders, isAllowedOrigin } from '@/lib/cors';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { declarations, execute } from '@/lib/tools';

// Node runtime: the tools read PDFs and the prompt from disk.
export const runtime = 'nodejs';
// Tool rounds mean several sequential model calls, so allow more wall clock
// than a single-shot completion would need.
export const maxDuration = 120;

// Pinned deliberately. `gemini-flash-lite-latest` also works and auto-upgrades,
// but a pinned id fails loudly when it is retired rather than silently changing
// behaviour — 2.5-flash-lite was withdrawn from new users exactly this way.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);

// Bound on the agent loop. Each round is a model call plus its tool calls, so
// this caps both latency and spend if the model ever fails to converge.
// The 3.x models make one lookup per round and like to cross-check the portfolio
// against the code, so a thorough answer can take eight or nine rounds.
const MAX_TOOL_ROUNDS = 10;

// Technical questions can want a code sample or a design walkthrough, which a
// short-answer budget cuts off mid-block. Still well under MAX_CHARS_PER_REPLY,
// so the reply can be replayed as history.
const MAX_OUTPUT_TOKENS = 4_000;

// Guardrails on what a client may send. The browser holds conversation history
// in IndexedDB and replays it on every request, so these caps also bound how
// much a long-running conversation can grow.
// The client replays its last 10 exchanges (20 messages) plus the new question,
// so this must clear 21 with room to spare — otherwise the cap the client is
// respecting is still the cap that rejects it.
const MAX_MESSAGES = 24;
// What a visitor may type — an abuse guard on the one field they control. Roomy
// enough to paste a whole job description in front of a question.
const MAX_CHARS_PER_MESSAGE = 8_000;
// Assistant turns are this API's own prior output being replayed, so holding them
// to the visitor's limit rejects a conversation for the crime of having answered
// well: one long reply and every following request 400s.
const MAX_CHARS_PER_REPLY = 24_000;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

let client: GoogleGenAI | null = null;

function genai(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * The conversation with every tool call and tool result rewritten as plain text.
 * Used for the final forced answer: with no function parts left and no tools
 * declared, the model has nothing to call and has to write. Switching calling
 * off with toolConfig mode NONE is not enough — gemini-3.8-flash still answers a
 * tool-heavy history with a function call and an empty text part.
 */
function flattenToolTurns(contents: Content[]): Content[] {
  return contents.map((content) => {
    const parts = (content.parts ?? []).flatMap((part): Part[] => {
      if (part.functionCall) {
        return [{ text: `[I looked up ${part.functionCall.name} ${JSON.stringify(part.functionCall.args ?? {})}]` }];
      }
      if (part.functionResponse) {
        return [{ text: `[Result of ${part.functionResponse.name}]\n${JSON.stringify(part.functionResponse.response ?? {})}` }];
      }
      if (part.text) return [{ text: part.text }];
      return [];
    });
    return { role: content.role, parts: parts.length ? parts : [{ text: '…' }] };
  });
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** Returns the validated messages, or an error string explaining the rejection. */
function parseMessages(input: unknown): ChatMessage[] | string {
  if (!Array.isArray(input)) return 'Body must include a "messages" array.';
  if (input.length === 0) return 'At least one message is required.';
  if (input.length > MAX_MESSAGES) {
    return `Too many messages — send at most the last ${MAX_MESSAGES}.`;
  }

  const messages: ChatMessage[] = [];

  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) return 'Each message must be an object.';
    const { role, content } = raw as Record<string, unknown>;

    if (role !== 'user' && role !== 'assistant') {
      return 'Each message needs a role of "user" or "assistant".';
    }
    if (typeof content !== 'string' || content.trim() === '') {
      return 'Each message needs non-empty string content.';
    }
    const limit = role === 'user' ? MAX_CHARS_PER_MESSAGE : MAX_CHARS_PER_REPLY;
    if (content.length > limit) {
      return `Messages are limited to ${limit} characters.`;
    }

    messages.push({ role, content });
  }

  if (messages[messages.length - 1].role !== 'user') {
    return 'The last message must come from the user.';
  }

  return messages;
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return json({ error: 'Origin not allowed.' }, 403, headers);
  }

  const limit = rateLimit(clientKey(request.headers), RATE_LIMIT);
  if (!limit.allowed) {
    return json({ error: 'Too many requests. Try again shortly.' }, 429, {
      ...headers,
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body must be valid JSON.' }, 400, headers);
  }

  const parsed = parseMessages((body as Record<string, unknown>)?.messages);
  if (typeof parsed === 'string') {
    return json({ error: parsed }, 400, headers);
  }

  // Gemini calls the assistant turn "model"; everything else maps straight over.
  const contents: Content[] = parsed.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const config = {
    systemInstruction: buildSystemInstruction(),
    tools: [{ functionDeclarations: declarations }],
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.7,
  };

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Every byte the client gets goes through here, which makes this the one
      // place that can tell whether it got anything at all.
      let sent = 0;
      const send = (text: string) => {
        sent += text.length;
        controller.enqueue(encoder.encode(text));
      };

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = await genai().models.generateContentStream({
            model: MODEL,
            contents,
            config,
          });

          // Accumulate the model's parts so the turn can be replayed as history,
          // and stream any prose to the client as it arrives.
          const modelParts: Part[] = [];
          const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

          for await (const chunk of stream) {
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
              modelParts.push(part);
              if (part.text) send(part.text);
              if (part.functionCall?.name) {
                calls.push({
                  name: part.functionCall.name,
                  args: (part.functionCall.args ?? {}) as Record<string, unknown>,
                });
              }
            }
          }

          // No tool calls means this was the answer.
          if (calls.length === 0) return;

          contents.push({ role: 'model', parts: modelParts });

          // Independent lookups — run them together rather than serially.
          const responses = await Promise.all(
            calls.map(async (call) => ({
              functionResponse: {
                name: call.name,
                response: await execute(call.name, call.args),
              },
            })),
          );

          contents.push({ role: 'user', parts: responses as Part[] });
        }

        // Out of rounds and still reaching for tools. Rather than apologising, ask
        // once more with no tools available — it has plenty of retrieved context
        // by now and just needs to be made to commit to an answer.
        const forced = await genai().models.generateContentStream({
          model: MODEL,
          contents: flattenToolTurns(contents),
          config: {
            systemInstruction:
              config.systemInstruction +
              '\n\nYou have gathered enough. Answer now from what you have retrieved. ' +
              'Do not request anything further.',
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.7,
          },
        });

        for await (const chunk of forced) {
          for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
            if (part.text) send(part.text);
          }
        }
      } catch (error) {
        console.error('[chat] failed:', error);
        // Headers are already sent, so the status cannot change; surface the
        // failure in the body rather than truncating silently.
        send('\n\n[The assistant hit an error and could not finish this answer.]');
      } finally {
        // Nothing streamed and nothing thrown. The forced pass answers with a
        // tool call it was no longer offered often enough to matter, and a round
        // can return neither prose nor a call; both land here having sent zero
        // bytes. An empty 200 renders as a silent, broken chat, so say something
        // rather than nothing.
        if (sent === 0) {
          console.error('[chat] produced no output');
          send(
            "Sorry — I went looking for that and couldn't pull it together. Ask me " +
              'again, or narrow it down a little and I will answer straight.',
          );
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      ...headers,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
