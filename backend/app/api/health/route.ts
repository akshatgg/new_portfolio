import { knowledgeStatus } from '@/lib/knowledge';
import { isConfigured, listPages } from '@/lib/confluence';
import * as github from '@/lib/github';
import { DOC_NAMES, readDoc } from '@/lib/resume';

export const runtime = 'nodejs';

/**
 * Deploy check. Exercises each dependency the chat route needs — Gemini creds,
 * the system prompt, live Confluence, and PDF extraction — without leaking any
 * credential. Reaching Confluence here means the tools will work in a chat.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    allowedOriginsConfigured: Boolean(process.env.ALLOWED_ORIGINS),
    atlassianConfigured: isConfigured(),
    ...knowledgeStatus(),
  };

  // Confluence: does a real call succeed?
  if (isConfigured()) {
    try {
      const pages = await listPages();
      checks.confluence = { ok: true, pageCount: pages.length };
    } catch (error) {
      checks.confluence = {
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  } else {
    checks.confluence = { ok: false, error: 'ATLASSIAN_EMAIL / ATLASSIAN_API_TOKEN not set' };
  }

  // GitHub: optional, so it reports but never fails the check. Without a token
  // the tools still read public repos, just under a far smaller rate limit.
  try {
    const repos = await github.listRepos();
    checks.github = {
      ok: true,
      owner: github.owner(),
      tokenConfigured: github.isConfigured(),
      repoCount: repos.length,
      privateRepoCount: repos.filter((r) => r.private).length,
    };
  } catch (error) {
    checks.github = {
      ok: false,
      tokenConfigured: github.isConfigured(),
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }

  // PDFs: does extraction actually work in this runtime?
  try {
    const sizes: Record<string, number> = {};
    for (const name of DOC_NAMES) sizes[name] = (await readDoc(name)).length;
    checks.documents = { ok: true, extractedChars: sizes };
  } catch (error) {
    checks.documents = {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }

  const ok =
    Boolean(process.env.GEMINI_API_KEY) &&
    (checks.confluence as { ok: boolean }).ok &&
    (checks.documents as { ok: boolean }).ok;

  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503 });
}
