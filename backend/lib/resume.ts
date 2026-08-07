import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Text extraction from the PDFs committed at data/docs/.
 *
 * These are the same files the Svelte site serves from static/ — copied in
 * because Vercel's Root Directory is `backend`, so the function cannot read
 * anything above it.
 *
 * Extraction is a few hundred milliseconds, so results are cached for the
 * lifetime of the instance. The files only change on deploy.
 */

const DOCS = {
  resume: { file: 'resume.pdf', label: 'Résumé (one page)' },
  cv: { file: 'cv.pdf', label: 'CV (long form, three pages)' },
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
