import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isConfigured } from '@/lib/confluence';
import { readAllDocs } from '@/lib/resume';

/**
 * The system prompt is the behaviour rules plus everything Akshat has written
 * about his own work — the PDFs in data/docs, in full. He is asked the same
 * things a candidate is asked in an interview, and a candidate does not go and
 * look up their own history before answering. Tools add what memory cannot:
 * the code on GitHub, and what a company the visitor names actually does.
 */

// A deployment is immutable, so caching these files is free there. In dev it is
// the opposite of free: the prompt is the thing you iterate on, and a cache that
// outlives the edit makes it look like your change had no effect.
const cache = new Map<string, string>();
const CACHE_READS = process.env.NODE_ENV === 'production';

function readData(file: string): string {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  const text = readFileSync(join(process.cwd(), 'data', file), 'utf8');
  if (CACHE_READS) cache.set(file, text);
  return text;
}

export async function buildSystemInstruction(): Promise<string> {
  const parts = [
    readData('system-prompt.md'),
    '',
    '## My documents',
    '',
    await readAllDocs(),
  ];

  if (!isConfigured()) {
    // No Atlassian credentials: the Confluence tools would fail on every call.
    parts.push(
      '',
      '## Tool availability',
      '',
      'Confluence is not reachable in this deployment — do not call `list_documents`,',
      '`search_confluence`, or `read_confluence_page`. Everything in it is in the documents above.',
    );
  }

  return parts.join('\n');
}

/** Surfaced by /api/health so a deploy problem is visible without a chat turn. */
export function knowledgeStatus() {
  const live = isConfigured();
  return {
    mode: live ? 'live-confluence' : 'static-fallback',
    systemPromptChars: readData('system-prompt.md').length,
  };
}
