import { loadKnowledge } from '@/lib/knowledge';

export const runtime = 'nodejs';

/**
 * Deploy check. Reports whether the pieces the chat route depends on are
 * actually present — without leaking the key itself.
 */
export async function GET() {
  let knowledgeChars = 0;
  let knowledgeError: string | null = null;

  try {
    knowledgeChars = loadKnowledge().length;
  } catch (error) {
    knowledgeError = error instanceof Error ? error.message : 'unknown error';
  }

  const ok = Boolean(process.env.GEMINI_API_KEY) && knowledgeError === null;

  return Response.json(
    {
      ok,
      model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      allowedOriginsConfigured: Boolean(process.env.ALLOWED_ORIGINS),
      knowledgeChars,
      // Rough guide only — actual tokenisation differs.
      knowledgeApproxTokens: Math.round(knowledgeChars / 4),
      knowledgeError,
    },
    { status: ok ? 200 : 503 },
  );
}
