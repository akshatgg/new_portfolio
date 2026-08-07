/**
 * Live reader for Akshat's Confluence space.
 *
 * Auth is a plain Atlassian API token over Basic auth — no Marketplace app,
 * no Forge app, no OAuth. Apps are only needed when third parties authorise an
 * integration; this is one account reading its own space.
 *
 * Everything is cached per serverless instance. Without that, a single chat
 * turn that calls two tools would hit Atlassian twice, and every message would
 * pay the round trip again.
 */

const SITE = process.env.CONFLUENCE_SITE ?? 'akshatg9636.atlassian.net';
const SPACE_KEY =
  process.env.CONFLUENCE_SPACE_KEY ?? '~7120200844476cfa4946c3b51daf1ada4a318d';
const CACHE_TTL_MS = Number(process.env.CONFLUENCE_CACHE_TTL_MS ?? 15 * 60 * 1000);

export type ConfluencePage = {
  id: string;
  title: string;
  text: string;
  url: string;
};

export type SearchHit = {
  id: string;
  title: string;
  excerpt: string;
};

export function isConfigured(): boolean {
  return Boolean(process.env.ATLASSIAN_EMAIL && process.env.ATLASSIAN_API_TOKEN);
}

function authHeader(): string {
  const email = process.env.ATLASSIAN_EMAIL;
  const token = process.env.ATLASSIAN_API_TOKEN;
  if (!email || !token) {
    throw new Error('ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must both be set.');
  }
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
}

async function api(path: string): Promise<unknown> {
  const res = await fetch(`https://${SITE}${path}`, {
    headers: { Authorization: authHeader(), Accept: 'application/json' },
    // Atlassian is occasionally slow; fail fast rather than hold the function open.
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Confluence ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Confluence "storage format" is XHTML with custom `ac:` / `ri:` macro tags.
 * The model reads this, so it needs to be legible text — not perfect Markdown,
 * but with headings, lists and emphasis preserved and markup stripped.
 */
export function storageToText(html: string): string {
  return (
    html
      // Drop macro parameter noise but keep the human text inside rich bodies.
      .replace(/<ac:parameter[^>]*>.*?<\/ac:parameter>/gs, '')
      .replace(/<ri:[^>]*\/?>/g, '')
      .replace(/<\/?ac:[^>]*>/g, '')
      // Structure
      .replace(/<h1[^>]*>/gi, '\n\n# ')
      .replace(/<h2[^>]*>/gi, '\n\n## ')
      .replace(/<h3[^>]*>/gi, '\n\n### ')
      .replace(/<h4[^>]*>/gi, '\n\n#### ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/li>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/t[dh]>/gi, ' | ')
      // Emphasis
      .replace(/<(strong|b)[^>]*>/gi, '**')
      .replace(/<\/(strong|b)>/gi, '**')
      .replace(/<(em|i)[^>]*>/gi, '_')
      .replace(/<\/(em|i)>/gi, '_')
      // Everything else
      .replace(/<[^>]+>/g, '')
      // Entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '…')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      // Collapse the whitespace all that stripping leaves behind
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

// ── caches ───────────────────────────────────────────────────────────────────

type Cached<T> = { value: T; at: number };

const pageCache = new Map<string, Cached<ConfluencePage>>();
const searchCache = new Map<string, Cached<SearchHit[]>>();
let indexCache: Cached<SearchHit[]> | null = null;

function fresh<T>(entry: Cached<T> | null | undefined): T | null {
  if (!entry) return null;
  return Date.now() - entry.at < CACHE_TTL_MS ? entry.value : null;
}

// ── public API ───────────────────────────────────────────────────────────────

/** Every page in the space — titles and ids only. Orients the model cheaply. */
export async function listPages(): Promise<SearchHit[]> {
  const hit = fresh(indexCache);
  if (hit) return hit;

  const cql = encodeURIComponent(`type=page and space="${SPACE_KEY}"`);
  const data = (await api(`/wiki/rest/api/search?cql=${cql}&limit=50`)) as {
    results?: Array<{ content?: { id?: string }; title?: string; excerpt?: string }>;
  };

  const pages: SearchHit[] = (data.results ?? [])
    .filter((r) => r.content?.id)
    .map((r) => ({
      id: r.content!.id!,
      title: stripHighlight(r.title ?? ''),
      excerpt: stripHighlight(r.excerpt ?? ''),
    }));

  indexCache = { value: pages, at: Date.now() };
  return pages;
}

export async function search(query: string, limit = 5): Promise<SearchHit[]> {
  const key = `${query}::${limit}`;
  const hit = fresh(searchCache.get(key));
  if (hit) return hit;

  // Escape quotes so a quoted query can't break out of the CQL string.
  const safe = query.replace(/["\\]/g, ' ').trim();
  const cql = encodeURIComponent(
    `type=page and space="${SPACE_KEY}" and text ~ "${safe}"`,
  );

  const data = (await api(`/wiki/rest/api/search?cql=${cql}&limit=${limit}`)) as {
    results?: Array<{ content?: { id?: string }; title?: string; excerpt?: string }>;
  };

  const hits: SearchHit[] = (data.results ?? [])
    .filter((r) => r.content?.id)
    .map((r) => ({
      id: r.content!.id!,
      title: stripHighlight(r.title ?? ''),
      excerpt: stripHighlight(r.excerpt ?? ''),
    }));

  searchCache.set(key, { value: hits, at: Date.now() });
  return hits;
}

export async function readPage(pageId: string): Promise<ConfluencePage> {
  const hit = fresh(pageCache.get(pageId));
  if (hit) return hit;

  const data = (await api(
    `/wiki/api/v2/pages/${encodeURIComponent(pageId)}?body-format=storage`,
  )) as {
    id: string;
    title: string;
    body?: { storage?: { value?: string } };
  };

  const page: ConfluencePage = {
    id: data.id,
    title: data.title,
    text: storageToText(data.body?.storage?.value ?? ''),
    url: `https://${SITE}/wiki/spaces/${SPACE_KEY}/pages/${data.id}`,
  };

  pageCache.set(pageId, { value: page, at: Date.now() });
  return page;
}

/** Search results wrap matches in `@@@hl@@@ … @@@endhl@@@`. */
function stripHighlight(s: string): string {
  return s.replace(/@@@(end)?hl@@@/g, '').trim();
}
