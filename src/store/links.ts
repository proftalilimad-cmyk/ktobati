import type { StorageProvider, LinkStatus } from '../data/types';

/**
 * Storage-provider abstraction.
 *
 * The whole app is INDEPENDENT of any single host: a book file is just a
 * { provider, downloadUrl, readUrl } record. Adding Google Drive, Dropbox,
 * S3, Cloudflare R2, etc. later only means adding an entry here (+ an optional
 * server-side adapter). No secret/API key must ever live in this frontend.
 */
export interface ProviderInfo {
  id: StorageProvider;
  label: string;
  /** hostnames that identify this provider from a URL */
  hosts: string[];
  /** whether an official API adapter could be plugged server-side later */
  apiCapable: boolean;
  note?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'onedrive', label: 'OneDrive', hosts: ['1drv.ms', 'onedrive.live.com', 'sharepoint.com'], apiCapable: true, note: 'Microsoft Graph (côté serveur uniquement)' },
  { id: 'up4ever', label: 'Up-4ever', hosts: ['up-4ever.net', 'up-4ever.com', 'upfever'], apiCapable: true },
  { id: 'fileink', label: 'FileInk', hosts: ['fileink'], apiCapable: true },
  { id: 'rapidfiles', label: 'RapidFiles', hosts: ['rapidfiles'], apiCapable: true },
  { id: 'filefire', label: 'FileFire', hosts: ['filefire'], apiCapable: true },
  { id: 'supabase', label: 'Supabase Storage', hosts: ['supabase.co', 'supabase.in'], apiCapable: true },
  { id: 'local', label: 'Téléversé (navigateur)', hosts: [], apiCapable: false, note: 'Stocké dans IndexedDB, jamais dans le bundle' },
  { id: 'external', label: 'URL externe', hosts: [], apiCapable: false },
];

export const PROVIDER_LABEL: Record<StorageProvider, string> = PROVIDERS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p.label }),
  {} as Record<StorageProvider, string>,
);

/**
 * Providers offered in the admin UI for THIS version.
 * The mission restricts new files to OneDrive + Up-4ever. The wider
 * StorageProvider type is kept so existing/seed data (external URLs, local
 * uploads) still renders correctly and the app stays extensible.
 */
export const SELECTABLE_PROVIDERS: StorageProvider[] = ['onedrive', 'up4ever'];

export interface ProviderMeta {
  icon: string;
  label: string;
  urlPlaceholder: string;
  hint: string;
  supportsFileId: boolean;
  /** short, accurate steps to obtain a shareable link (shown in the admin help) */
  helpSteps: string[];
}

export const PROVIDER_META: Partial<Record<StorageProvider, ProviderMeta>> = {
  onedrive: {
    icon: '☁️',
    label: 'Microsoft OneDrive',
    urlPlaceholder: 'https://1drv.ms/… أو https://onedrive.live.com/…',
    hint: 'التخزين / الأرشفة. الصق رابط المشاركة العام للملف.',
    supportsFileId: true,
    helpSteps: [
      'ارفع ملف PDF/EPUB إلى OneDrive.',
      'انقر بزر يمين على الملف ← «مشاركة» (Share).',
      'اضبط الإذن على «أي شخص لديه الرابط» (Anyone with the link).',
      'انسخ الرابط والصقه هنا. لتنزيل مباشر يمكن إضافة ‎?download=1‎ في نهاية رابط onedrive.live.com.',
    ],
  },
  up4ever: {
    icon: '📥',
    label: 'Up-4ever',
    urlPlaceholder: 'https://up-4ever.net/…',
    hint: 'التحميل (وصفحة Up-4ever مع الإعلانات/الربح). الصق رابط التحميل من حسابك.',
    supportsFileId: false,
    helpSteps: [
      'سجّل الدخول إلى حسابك على up-4ever.net.',
      'ارفع ملف PDF/EPUB.',
      'انسخ «رابط التحميل» (Download link) الخاص بالملف.',
      'الصق الرابط هنا — صفحة Up-4ever تتكفّل بالتحميل والربح.',
    ],
  },
};

/** Guess a provider from a URL (falls back to 'external'). */
export function providerFromUrl(url: string): StorageProvider {
  const u = url.toLowerCase();
  for (const p of PROVIDERS) {
    if (p.hosts.some((h) => u.includes(h))) return p.id;
  }
  return 'external';
}

export function isValidHttpUrl(u: string): { ok: boolean; https: boolean } {
  try {
    const url = new URL(u);
    const ok = url.protocol === 'http:' || url.protocol === 'https:';
    return { ok, https: url.protocol === 'https:' };
  } catch {
    return { ok: false, https: false };
  }
}

export interface LinkTestResult {
  status: LinkStatus;
  level: 'ok' | 'warn' | 'error';
  message: string;
}

/**
 * Best-effort link check from the browser.
 * - Rejects only clearly invalid URLs (bad format, non-HTTP protocol).
 * - Warns (never blocks) when the server can't be reached / verified — most
 *   external hosts block CORS, which is NOT a sign the link is broken.
 */
export async function testLink(url: string): Promise<LinkTestResult> {
  const trimmed = url.trim();
  if (!trimmed) return { status: 'unverified', level: 'error', message: 'الرابط فارغ' };
  const { ok, https } = isValidHttpUrl(trimmed);
  if (!ok) return { status: 'broken', level: 'error', message: 'رابط غير صالح (بروتوكول غير مدعوم)' };
  if (!https) return { status: 'unverified', level: 'warn', message: '⚠️ الرابط ليس HTTPS' };

  try {
    // opaque check: we can't read the status under no-cors, but a thrown error
    // usually means the host is unreachable / the URL is wrong.
    await fetch(trimmed, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout?.(8000) });
    return { status: 'active', level: 'ok', message: '✓ الرابط يبدو صالحًا' };
  } catch {
    return {
      status: 'unverified',
      level: 'warn',
      message: '⚠️ تعذّر التحقق تلقائيًا (قد يكون المضيف يمنع الفحص) — الرابط ليس محظورًا',
    };
  }
}

export function fileTypeFromUrl(url: string): 'pdf' | 'epub' | undefined {
  if (/\.pdf($|\?)/i.test(url)) return 'pdf';
  if (/\.epub($|\?)/i.test(url)) return 'epub';
  return undefined;
}
