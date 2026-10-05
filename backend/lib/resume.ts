import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Text extraction from the PDFs committed at data/docs/.
 *
 * The résumé and CV are the same files the Svelte site serves from static/; the
 * rest are exports of the Confluence portfolio pages. All of them are copied in
 * because Vercel's Root Directory is `backend`, so the function cannot read
 * anything above it.
 *
 * Together they are the assistant's memory: the whole set goes into the system
 * prompt, so an answer never depends on the model choosing the right lookup.
 *
 * Extraction is a few hundred milliseconds, so results are cached for the
 * lifetime of the instance. The files only change on deploy.
 */

const DOCS = {
  overview: { file: 'overview.pdf', label: 'Portfolio overview' },
  experience: { file: 'experience.pdf', label: 'Professional experience, every role' },
  'mark-ai': { file: 'mark-ai.pdf', label: 'Mark AI — what I built (current role)' },
  vibemonitor: { file: 'vibemonitor.pdf', label: 'VibeMonitor — what I built (previous role)' },
  projects: { file: 'projects.pdf', label: 'Personal projects' },
  skills: { file: 'skills.pdf', label: 'Languages, tools and tech stack, and where I used each' },
  dashboard: { file: 'dashboard.pdf', label: 'Engineering dashboard — numbers at a glance' },
  cv: { file: 'cv.pdf', label: 'CV (long form, four pages)' },
  resume: { file: 'resume.pdf', label: 'Résumé (one page)' },
} as const;

export type DocName = keyof typeof DOCS;

export const DOC_NAMES = Object.keys(DOCS) as DocName[];

const cache = new Map<DocName, string>();

export function isDocName(value: string): value is DocName {
  return value in DOCS;
}

export function describeDocs(): string {
  return DOC_NAMES.map((n) => `"${n}" — ${DOCS[n].label}`).join('; ');
}

export async function readDoc(name: DocName): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const path = join(process.cwd(), 'data', 'docs', DOCS[name].file);
  const bytes = await readFile(path);

  // unpdf is a serverless-friendly pdf.js build — no native modules, so it
  // works inside a Vercel function where pdf-parse and friends do not.
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });

  const clean = (Array.isArray(text) ? text.join('\n') : text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  cache.set(name, clean);
  return clean;
}

/** Every document, labelled, as one block for the system prompt. */
export async function readAllDocs(): Promise<string> {
  const texts = await Promise.all(DOC_NAMES.map(readDoc));
  return DOC_NAMES.map((name, i) => `### ${DOCS[name].label}\n\n${texts[i]}`).join('\n\n---\n\n');
}
