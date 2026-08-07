import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isConfigured } from '@/lib/confluence';

/**
 * The system prompt is deliberately small: orientation plus behaviour rules.
 * Facts come from tools reading the live Confluence space and the PDFs, so the
 * assistant reflects whatever Akshat published today rather than a snapshot.
 *
 * `data/about-me.md` is kept only as a fallback for when Atlassian credentials
 * are absent — without it an unconfigured deployment could answer nothing.
 */

const cache = new Map<string, string>();

function readData(file: string): string {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  const text = readFileSync(join(process.cwd(), 'data', file), 'utf8');
  cache.set(file, text);
  return text;
}

export function buildSystemInstruction(): string {
  const base = readData('system-prompt.md');

  if (isConfigured()) return base;

  // No Atlassian credentials: the Confluence tools will fail on every call, so
  // fall back to the baked snapshot and tell the model not to reach for them.
  return [
    base,
    '',
    '## Tool availability',
    '',
    'Confluence is not reachable in this deployment — do not call `list_documents`,',
    '`search_confluence`, or `read_confluence_page`. `read_resume` still works.',
    'Answer from the snapshot below, and say plainly when something is not in it.',
    '',
    '--- SNAPSHOT ---',
    '',
    readData('about-me.md'),
  ].join('\n');
}

/** Surfaced by /api/health so a deploy problem is visible without a chat turn. */
export function knowledgeStatus() {
  const live = isConfigured();
  return {
    mode: live ? 'live-confluence' : 'static-fallback',
    systemPromptChars: readData('system-prompt.md').length,
  };
}
