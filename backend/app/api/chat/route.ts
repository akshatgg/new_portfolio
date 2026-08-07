import { GoogleGenAI } from '@google/genai';
import { buildSystemInstruction } from '@/lib/knowledge';
import { corsHeaders, isAllowedOrigin } from '@/lib/cors';
import { clientKey, rateLimit } from '@/lib/ratelimit';

// Needs the Node runtime: the knowledge base is read from disk with node:fs.
export const runtime = 'nodejs';
export const maxDuration = 30;

// Pinned deliberately. `gemini-flash-lite-latest` also works and auto-upgrades,
// but a pinned id fails loudly when it is retired rather than silently changing
// behaviour — 2.5-flash-lite was withdrawn from new users exactly this way.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10);

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
  const contents = parsed.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  let stream;
  try {
    stream = await genai().models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildSystemInstruction(),
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });
  } catch (error) {
    console.error('[chat] Gemini request failed:', error);
    return json({ error: 'The assistant is unavailable right now.' }, 502, headers);
  }

  const encoder = new TextEncoder();

  // Plain text stream rather than SSE — the client can read it with a standard
  // ReadableStream reader and needs no event parsing.
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        // The response has already begun, so the status cannot change; surface
        // the failure in the body instead of truncating silently.
        console.error('[chat] stream interrupted:', error);
        controller.enqueue(encoder.encode('\n\n[The response was cut short.]'));
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
