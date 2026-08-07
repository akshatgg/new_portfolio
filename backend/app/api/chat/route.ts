import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { buildSystemInstruction } from '@/lib/knowledge';
import { corsHeaders, isAllowedOrigin } from '@/lib/cors';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { declarations, execute } from '@/lib/tools';

// Node runtime: the tools read PDFs and the prompt from disk.
export const runtime = 'nodejs';
// Tool rounds mean several sequential model calls, so allow more wall clock
// than a single-shot completion would need.
export const maxDuration = 60;

// Pinned deliberately. `gemini-flash-lite-latest` also works and auto-upgrades,
// but a pinned id fails loudly when it is retired rather than silently changing
// behaviour — 2.5-flash-lite was withdrawn from new users exactly this way.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10);

// Bound on the agent loop. Each round is a model call plus its tool calls, so
// this caps both latency and spend if the model ever fails to converge.
// list_documents → search → read → read is four rounds on its own, so the cap
// has to leave room for a fifth round that actually answers.
const MAX_TOOL_ROUNDS = 6;

// Guardrails on what a client may send. The browser holds conversation history
// in IndexedDB and replays it on every request, so these caps also bound how
// much a long-running conversation can grow.
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2_000;

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
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      return `Messages are limited to ${MAX_CHARS_PER_MESSAGE} characters.`;
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
    maxOutputTokens: 1_200,
    temperature: 0.7,
  };

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

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
          contents,
          config: {
            systemInstruction:
              buildSystemInstruction() +
              '\n\nYou have gathered enough. Answer now from what you have retrieved. ' +
              'Do not request anything further.',
            maxOutputTokens: 1_200,
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
