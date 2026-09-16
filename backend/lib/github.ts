/**
 * Read-only access to Akshat's GitHub repositories.
 *
 * This backs a public chat, so anything the token can read, a visitor can ask
 * for. Two rules keep that safe:
 *
 * 1. Only repos under GITHUB_OWNER, and only public ones — unless a private repo
 *    is named in GITHUB_PRIVATE_REPOS. A private repo that isn't allowed is
 *    reported as "not found", never as "private", so its name doesn't leak.
 * 2. Files that look like secrets (.env, keys, credentials) are never returned,
 *    whatever repo they sit in.
 *
 * The token is optional for public repos, but unauthenticated calls share a
 * 60-per-hour limit per IP and code search refuses them outright.
 */

const OWNER = process.env.GITHUB_OWNER ?? 'akshatgg';
const CACHE_TTL_MS = Number(process.env.GITHUB_CACHE_TTL_MS ?? 15 * 60 * 1000);
const MAX_FILE_CHARS = 20_000;

/** Lower-cased repo names from GITHUB_PRIVATE_REPOS; `*` allows every private repo. */
function privateAllowlist(): Set<string> {
  return new Set(
    (process.env.GITHUB_PRIVATE_REPOS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPrivateAllowed(repo: string): boolean {
  const allow = privateAllowlist();
  return allow.has('*') || allow.has(repo.toLowerCase());
}

export function isConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

export function owner(): string {
  return OWNER;
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

class NotFound extends Error {}

async function api(path: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'portfolio-backend',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 404) throw new NotFound(`Not found: ${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res;
}

// ── caches ───────────────────────────────────────────────────────────────────

type Cached<T> = { value: T; at: number };
const cache = new Map<string, Cached<unknown>>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { value, at: Date.now() });
  return value;
}

// ── guards ───────────────────────────────────────────────────────────────────

const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

/** Paths whose contents are secrets or close enough that we never serve them. */
const SECRET_PATH = [
  /(^|\/)\.env($|\.(?!example$|sample$|template$)[^/]*$)/i,
  /(^|\/)\.(npmrc|pypirc|netrc|git-credentials|htpasswd)$/i,
  /\.(pem|key|p12|pfx|jks|keystore|ppk|asc|gpg)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /(^|\/)(secrets?|credentials?)(\.[a-z]+)?$/i,
  /(^|\/)(service[-_]?account|google-services|firebase-adminsdk)[^/]*\.json$/i,
  /(^|\/)local\.properties$/i,
  /(^|\/)(terraform\.tfstate|.*\.tfvars)$/i,
];

export function isSecretPath(path: string): boolean {
  return SECRET_PATH.some((re) => re.test(path));
}

/** Belt and braces: mask token-shaped strings that were committed into ordinary files. */
function redact(text: string): string {
  return text
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g, '[redacted]')
    .replace(/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, '[redacted]')
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, '[redacted]')
    .replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}\b/g, '[redacted]')
    .replace(/\bsk-(proj-|ant-)?[A-Za-z0-9_-]{20,}\b/g, '[redacted]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[redacted]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[redacted]');
}

type RawRepo = {
  name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  homepage: string | null;
  html_url: string;
  default_branch: string;
  created_at: string;
  pushed_at: string;
  size: number;
};

/** Metadata for one repo, or NotFound if it's missing or a private repo that isn't allowed. */
async function repoMeta(repo: string): Promise<RawRepo> {
  if (!REPO_NAME.test(repo)) throw new NotFound(`Invalid repo name: ${repo}`);
  const meta = await cached(`repo:${repo.toLowerCase()}`, async () =>
    (await api(`/repos/${OWNER}/${encodeURIComponent(repo)}`)).json() as Promise<RawRepo>,
  );
  if (meta.private && !isPrivateAllowed(meta.name)) throw new NotFound(`Not found: ${repo}`);
  return meta;
}

function summarise(r: RawRepo) {
  return {
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics ?? [],
    stars: r.stargazers_count,
    fork: r.fork,
    archived: r.archived,
    private: r.private,
    homepage: r.homepage || null,
    url: r.html_url,
    created: r.created_at.slice(0, 10),
    last_push: r.pushed_at.slice(0, 10),
  };
}

// ── public API ───────────────────────────────────────────────────────────────

export type RepoSummary = ReturnType<typeof summarise>;

/** Every readable repo, most recently pushed first. */
export async function listRepos(): Promise<RepoSummary[]> {
  return cached('repos', async () => {
    const repos: RawRepo[] = [];
    for (let page = 1; page <= 5; page++) {
      const batch = (await (
        await api(`/users/${OWNER}/repos?type=owner&sort=pushed&per_page=100&page=${page}`)
      ).json()) as RawRepo[];
      repos.push(...batch);
      if (batch.length < 100) break;
    }

    // /users/{owner}/repos only ever returns public repos, so allowed private
    // ones are fetched by name. `*` needs the authenticated listing instead.
    const allow = privateAllowlist();
    if (allow.has('*') && isConfigured()) {
      const mine = (await (
        await api('/user/repos?affiliation=owner&visibility=private&per_page=100')
      ).json()) as Array<RawRepo & { owner?: { login?: string } }>;
      repos.push(...mine.filter((r) => r.owner?.login?.toLowerCase() === OWNER.toLowerCase()));
    } else {
      for (const name of allow) {
        if (repos.some((r) => r.name.toLowerCase() === name)) continue;
        try {
          repos.push(await repoMeta(name));
        } catch {
          // A stale allowlist entry shouldn't break the listing.
        }
      }
    }

    return repos
      .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
      .map(summarise);
  });
}

/** One repo's metadata, languages, README, top-level layout and recent commits. */
export async function repoOverview(repo: string) {
  const meta = await repoMeta(repo);
  const base = `/repos/${OWNER}/${encodeURIComponent(meta.name)}`;

  return cached(`overview:${meta.name.toLowerCase()}`, async () => {
    const [languages, readme, root, commits] = await Promise.all([
      api(`${base}/languages`)
        .then((r) => r.json() as Promise<Record<string, number>>)
        .catch(() => ({})),
      api(`${base}/readme`, 'application/vnd.github.raw+json')
        .then((r) => r.text())
        .catch(() => null),
      listDir(meta.name, '').catch(() => []),
      api(`${base}/commits?per_page=10`)
        .then(
          (r) =>
            r.json() as Promise<
              Array<{ sha: string; commit: { message: string; author?: { date?: string } } }>
            >,
        )
        .catch(() => []),
    ]);

    const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;

    return {
      ...summarise(meta),
      default_branch: meta.default_branch,
      languages: Object.fromEntries(
        Object.entries(languages).map(([lang, bytes]) => [lang, `${Math.round((bytes / total) * 100)}%`]),
      ),
      root,
      recent_commits: commits.map((c) => ({
        date: c.commit.author?.date?.slice(0, 10),
        message: c.commit.message.split('\n')[0],
      })),
      readme: readme ? redact(readme).slice(0, MAX_FILE_CHARS) : null,
    };
  });
}

type ContentEntry = { name: string; path: string; type: string; size: number };

async function listDir(repo: string, path: string) {
  const res = await api(
    `/repos/${OWNER}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`,
  );
  const body = (await res.json()) as ContentEntry[] | ContentEntry;
  if (!Array.isArray(body)) throw new Error(`${path} is a file, not a directory`);
  return body
    .map((e) => ({ path: e.path, type: e.type === 'dir' ? 'dir' : 'file', size: e.size }))
    .sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1));
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|ico|bmp|svgz|pdf|zip|gz|tgz|rar|7z|jar|apk|aab|exe|dll|so|dylib|class|o|a|wasm|mp[34]|mov|avi|webm|wav|ogg|ttf|otf|woff2?|eot|pyc|db|sqlite|parquet|pkl|pt|onnx|h5|bin)$/i;

/**
 * A directory listing or a file's text. Directory for "" or a folder path,
 * file text for a file path.
 */
export async function readPath(repo: string, rawPath: string) {
  const meta = await repoMeta(repo);
  const path = rawPath.trim().replace(/^\/+|\/+$/g, '');

  if (path.split('/').some((seg) => seg === '..')) {
    return { error: 'path must not contain ".."' };
  }
  if (isSecretPath(path)) {
    return { error: 'That file may hold secrets, so it is not readable here.' };
  }

  return cached(`path:${meta.name.toLowerCase()}:${path}`, async () => {
    const res = await api(
      `/repos/${OWNER}/${encodeURIComponent(meta.name)}/contents/${encodePath(path)}`,
    );
    const body = (await res.json()) as
      | ContentEntry[]
      | (ContentEntry & { content?: string; encoding?: string; download_url?: string | null });

    if (Array.isArray(body)) {
      return {
        repo: meta.name,
        path: path || '/',
        type: 'dir',
        entries: body
          .map((e) => ({ path: e.path, type: e.type === 'dir' ? 'dir' : 'file', size: e.size }))
          .sort((a, b) =>
            a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1,
          ),
      };
    }

    if (body.type !== 'file') {
      return { repo: meta.name, path, type: body.type, note: 'Not a regular file.' };
    }
    if (BINARY_EXT.test(path)) {
      return { repo: meta.name, path, type: 'file', size: body.size, note: 'Binary file — contents not shown.' };
    }

    // The contents API inlines files up to 1 MB; beyond that, fetch the raw blob.
    let text: string;
    if (body.encoding === 'base64' && body.content) {
      text = Buffer.from(body.content, 'base64').toString('utf8');
    } else {
      text = await (
        await api(
          `/repos/${OWNER}/${encodeURIComponent(meta.name)}/contents/${encodePath(path)}`,
          'application/vnd.github.raw+json',
        )
      ).text();
    }

    if (text.includes(' ')) {
      return { repo: meta.name, path, type: 'file', size: body.size, note: 'Binary file — contents not shown.' };
    }

    const truncated = text.length > MAX_FILE_CHARS;
    return {
      repo: meta.name,
      path,
      type: 'file',
      size: body.size,
      content: redact(truncated ? text.slice(0, MAX_FILE_CHARS) : text),
      ...(truncated ? { note: `Truncated to the first ${MAX_FILE_CHARS} characters.` } : {}),
    };
  });
}

export type CodeHit = { repo: string; path: string; fragments: string[] };

/** Code search across the owner's repos, optionally narrowed to one repo. */
export async function searchCode(query: string, repo?: string): Promise<CodeHit[]> {
  if (!isConfigured()) {
    throw new Error('Code search needs GITHUB_TOKEN; browse with read_github_path instead.');
  }

  // Strip qualifiers so a query can't widen itself beyond this owner.
  const terms = query.replace(/\b[a-z]+:\S+/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!terms) throw new Error('query needs at least one search term');

  let scope = `user:${OWNER}`;
  if (repo) {
    const meta = await repoMeta(repo);
    scope = `repo:${OWNER}/${meta.name}`;
  }

  return cached(`search:${scope}:${terms}`, async () => {
    const q = encodeURIComponent(`${terms} ${scope}`);
    const data = (await (
      await api(`/search/code?q=${q}&per_page=15`, 'application/vnd.github.text-match+json')
    ).json()) as {
      items?: Array<{
        path: string;
        repository: { name: string; private: boolean };
        text_matches?: Array<{ fragment?: string }>;
      }>;
    };

    return (data.items ?? [])
      .filter((i) => !i.repository.private || isPrivateAllowed(i.repository.name))
      .filter((i) => !isSecretPath(i.path))
      .slice(0, 10)
      .map((i) => ({
        repo: i.repository.name,
        path: i.path,
        fragments: (i.text_matches ?? [])
          .map((m) => redact(m.fragment ?? '').slice(0, 600))
          .filter(Boolean)
          .slice(0, 2),
      }));
  });
}

export function isNotFound(error: unknown): boolean {
  return error instanceof NotFound;
}
