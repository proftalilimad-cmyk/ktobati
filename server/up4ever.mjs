/**
 * Up-4ever API client (official docs: https://www.up-4ever.net/pages/api).
 *
 * BASE      https://www.up-4ever.net/api
 * Auth      Authorization: Bearer <UP4EVER_API_KEY>   ← key never appears in a URL,
 *           in logs, or in any response we send to the browser.
 * GET /file/list?per_page=200&page=N   (scope: files_read)
 *     → result.files[{name,file_code,size,public,fld_id,link,uploaded}], result.results_total
 * GET /folder/list?fld_id=ID           (scope: folders)
 *     → result.folders[{fld_id,name}], result.files[{fld_id,file_code,name,link,uploaded}]
 *
 * METADATA/LINKS ONLY — this module never downloads or stores file bytes
 * (no PDF/EPUB is ever fetched; only `link` share URLs are kept).
 */

const API_BASE = 'https://www.up-4ever.net/api';
const PER_PAGE = 200;
const MIN_INTERVAL_MS = 350; // polite pacing between API calls
const MAX_PAGES = 50; // 50 × 200 = 10 000 files cap
const MAX_FOLDERS = 400; // folder-walk cap
const REQ_TIMEOUT_MS = 12000;

/** 401/403 from Up-4ever → key not approved or missing files_read/folders scopes. */
export class Up4everAuthError extends Error {
  constructor(message) { super(message); this.name = 'Up4everAuthError'; }
}
/** 429 from Up-4ever (after one polite retry). */
export class Up4everRateError extends Error {
  constructor(message) { super(message); this.name = 'Up4everRateError'; }
}
/** Network failure / invalid response / 5xx. */
export class UpstreamError extends Error {
  constructor(message) { super(message); this.name = 'UpstreamError'; }
}

/* ---- per-process request pacing (serialises all calls) ---- */
let lastAt = 0;
let gate = Promise.resolve();
function paced() {
  const run = gate.then(async () => {
    const wait = Math.max(0, lastAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
  });
  gate = run.catch(() => {});
  return run;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(path, params, apiKey, fetchImpl) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const url = `${API_BASE}${path}?${qs.toString()}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    await paced();
    let res;
    try {
      res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(REQ_TIMEOUT_MS) : undefined,
      });
      // Up-4ever documents both Bearer auth and ?key=. Some API gateways only
      // honor the query form, so retry that documented form only after a 401/403.
      // The key is never returned to the browser or written to our logs.
      if (res.status === 401 || res.status === 403) {
        const keyed = new URL(url);
        keyed.searchParams.set('key', apiKey);
        res = await fetchImpl(keyed.toString(), {
          headers: { Accept: 'application/json' },
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(REQ_TIMEOUT_MS) : undefined,
        });
      }
    } catch {
      throw new UpstreamError('up-4ever unreachable');
    }
    if (res.status === 401 || res.status === 403) {
      // fixed message — never echo the key or upstream body
      throw new Up4everAuthError('up-4ever rejected the key or required scopes (files_read/folders)');
    }
    if (res.status === 429) {
      if (attempt === 0) { await sleep(1500); continue; }
      throw new Up4everRateError('up-4ever rate limit');
    }
    if (!res.ok) {
      if (res.status >= 500 && attempt === 0) { await sleep(1000); continue; }
      throw new UpstreamError(`up-4ever responded ${res.status}`);
    }
    try {
      return await res.json();
    } catch {
      throw new UpstreamError('invalid response from up-4ever');
    }
  }
  throw new UpstreamError('up-4ever request failed');
}

function extOf(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(name ?? '').trim());
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'epub') return 'epub';
  return null; // everything else excluded (images, archives, docs…)
}

function toItem(f, folderPath) {
  const ext = extOf(f?.name);
  if (!ext) return null;
  const fileCode = f.file_code ?? f.fld_id; // file/list & folder/list both expose file_code
  if (!fileCode) return null;
  return {
    file_code: String(fileCode),
    name: String(f.name),
    link: typeof f.link === 'string' ? f.link : '',
    ext,
    size: typeof f.size === 'number' ? f.size : undefined,
    uploaded: typeof f.uploaded === 'string' ? f.uploaded : undefined,
    fld_id: f.fld_id !== undefined ? f.fld_id : undefined,
    folder: folderPath || '',
  };
}

/**
 * List the authenticated account's PDF/EPUB files:
 *  1) paginated /file/list until result.results_total (or caps) — needs files_read
 *  2) recursive /folder/list from folder 0 for paths + coverage — needs folders
 * Dedupes by file_code, excludes non-PDF/EPUB, rate-limited politely.
 * @returns {{items: object[], stats: {filesTotal: number, pages: number, folders: number, excluded: number, found: number}}}
 */
export async function listAccountFiles({ apiKey, fetchImpl = fetch }) {
  const byCode = new Map();
  const folderPathById = new Map();
  let excluded = 0;
  let pages = 0;
  let filesTotal = undefined;

  const add = (raw, folderPath) => {
    const item = toItem(raw, folderPath);
    if (!item) { excluded++; return; }
    const prev = byCode.get(item.file_code);
    if (prev) {
      // keep the richer record; overlay folder path if newly known
      if (!prev.folder && item.folder) prev.folder = item.folder;
      if (prev.size === undefined && item.size !== undefined) prev.size = item.size;
      if (prev.uploaded === undefined && item.uploaded !== undefined) prev.uploaded = item.uploaded;
      if (!prev.link && item.link) prev.link = item.link;
      return;
    }
    byCode.set(item.file_code, item);
  };

  // 1) all account files (files_read) — stop at results_total / empty / caps
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await apiGet('/file/list', { per_page: PER_PAGE, page }, apiKey, fetchImpl);
    pages = page;
    const result = data?.result ?? {};
    const files = Array.isArray(result.files) ? result.files : [];
    const total = Number(result.results_total);
    if (Number.isFinite(total) && total >= 0) filesTotal = total;
    for (const f of files) add(f, '');
    if (files.length === 0 || files.length < PER_PAGE) break;
    if (filesTotal !== undefined && byCode.size >= filesTotal) break;
  }

  // 2) folder recursion from folder 0 (folders) — paths + anything file/list missed
  const queue = [{ id: 0, path: '' }];
  const seen = new Set([0]);
  let visited = 0;
  while (queue.length > 0 && visited < MAX_FOLDERS) {
    const { id, path } = queue.shift();
    visited++;
    const data = await apiGet('/folder/list', { fld_id: id }, apiKey, fetchImpl);
    const folders = Array.isArray(data?.result?.folders) ? data.result.folders : [];
    const files = Array.isArray(data?.result?.files) ? data.result.files : [];
    for (const fo of folders) {
      const fid = fo?.fld_id;
      if (fid === undefined || fid === null || seen.has(Number(fid))) continue;
      seen.add(Number(fid));
      const childPath = path ? `${path} / ${fo.name}` : String(fo.name);
      folderPathById.set(Number(fid), childPath);
      queue.push({ id: Number(fid), path: childPath });
    }
    for (const f of files) add(f, path);
  }

  // overlay known folder paths onto file/list entries (fld_id → path)
  for (const item of byCode.values()) {
    if (!item.folder && item.fld_id !== undefined) {
      const p = folderPathById.get(Number(item.fld_id));
      if (p) item.folder = p;
    }
    if (!item.link) item.link = ''; // no fabricated URLs — blank stays blank
  }

  const items = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return {
    items,
    stats: {
      filesTotal: filesTotal ?? items.length,
      pages,
      folders: visited,
      excluded,
      found: items.length,
    },
  };
}
