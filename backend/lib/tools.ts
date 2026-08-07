import { Type, type FunctionDeclaration } from '@google/genai';
import * as confluence from '@/lib/confluence';
import { DOC_NAMES, describeDocs, isDocName, readDoc } from '@/lib/resume';

/**
 * The tool surface the model sees.
 *
 * Descriptions state *when* to call each tool, not just what it does — that is
 * what actually drives correct tool selection. `list_documents` exists so the
 * model can orient in one cheap call instead of guessing page ids.
 */
export const declarations: FunctionDeclaration[] = [
  {
    name: 'list_documents',
    description:
      "List every document available about Akshat: the pages in his Confluence engineering portfolio, plus his résumé and CV. Call this first when you do not know which document holds the answer, or when asked what information exists.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'search_confluence',
    description:
      "Full-text search across Akshat's Confluence portfolio. Use this for questions about his work, projects, employers, skills, or technical decisions when you do not already know which page to read. Returns page titles, ids and short excerpts — follow up with read_confluence_page for the detail.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            'Search terms, e.g. "VibeMonitor RCA agent" or "Kotlin player proof of play". Keywords work better than full sentences.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_confluence_page',
    description:
      'Read the full text of one Confluence page by id. Use after search_confluence or list_documents has given you an id. This is the authoritative, current source — prefer it over your own recollection.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: {
          type: Type.STRING,
          description: 'The numeric page id returned by search_confluence or list_documents.',
        },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'read_resume',
    description: `Read the full text of one of Akshat's PDF documents: ${describeDocs()}. Use for questions about his formal CV, education, contact details, or a compact summary of his experience.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        document: {
          type: Type.STRING,
          description: `Which document to read. One of: ${DOC_NAMES.join(', ')}.`,
        },
      },
      required: ['document'],
    },
  },
];

/** Cap on characters returned to the model from any single tool call. */
const MAX_TOOL_CHARS = 24_000;

function truncate(text: string): string {
  if (text.length <= MAX_TOOL_CHARS) return text;
  return text.slice(0, MAX_TOOL_CHARS) + '\n\n[…truncated]';
}

/**
 * Executes one tool call. Never throws — a failure is returned to the model as
 * an `error` field so it can recover (try another page, say it doesn't know)
 * rather than the whole turn collapsing.
 */
export async function execute(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Logged so Vercel's function logs show which documents an answer came from.
  console.log(`[tool] ${name} ${JSON.stringify(args)}`);
  try {
    switch (name) {
      case 'list_documents': {
        const pages = await confluence.listPages();
        return {
          confluence_pages: pages.map((p) => ({ id: p.id, title: p.title })),
          pdf_documents: DOC_NAMES,
        };
      }

      case 'search_confluence': {
        const query = String(args.query ?? '').trim();
        if (!query) return { error: 'query is required' };
        const hits = await confluence.search(query);
        return hits.length
          ? { results: hits }
          : { results: [], note: 'No pages matched. Try broader keywords, or call list_documents.' };
      }

      case 'read_confluence_page': {
        const pageId = String(args.page_id ?? '').trim();
        if (!/^\d+$/.test(pageId)) return { error: 'page_id must be a numeric page id' };
        const page = await confluence.readPage(pageId);
        return { id: page.id, title: page.title, content: truncate(page.text) };
      }

      case 'read_resume': {
        const doc = String(args.document ?? '').trim();
        if (!isDocName(doc)) {
          return { error: `document must be one of: ${DOC_NAMES.join(', ')}` };
        }
        return { document: doc, content: truncate(await readDoc(doc)) };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[tool:${name}] failed:`, message);
    return {
      error: `That lookup failed: ${message}. Answer from what you already have, or say you cannot retrieve it.`,
    };
  }
}
