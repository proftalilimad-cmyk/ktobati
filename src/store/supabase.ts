// ============================================================================
//  Supabase data layer — the "SUPABASE DB" node of the storage architecture.
// ----------------------------------------------------------------------------
//  BIBLIOTHÈQUE → SUPABASE DB → (OneDrive | Up-4ever) → SITE PUBLIC → 📥
//
//  The DB stores ONLY metadata + URLs/ids — never the PDF/EPUB bytes.
//  This module is OPTIONAL: when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
//  absent the whole app runs on the local (browser) store exactly as before.
//
//  Security:
//    • Only the ANON key ships to the browser (it is public by design and
//      guarded by Row-Level-Security in supabase/schema.sql).
//    • The service_role key and any provider API secret must stay server-side.
//    • With the anon key + RLS, reads return only published+public books.
//      Admin WRITES require a real Supabase Auth session whose user id is in
//      the `admins` table (see schema.sql). Until that is wired, writes are
//      rejected by RLS and this layer logs a warning — it never fakes success.
// ============================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookFile, BookRecord, Category, Contributor } from '../data/types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

/**
 * Lazily create the client. `@supabase/supabase-js` is dynamically imported so
 * it is only downloaded when the app is actually configured to use Supabase —
 * the default (local-only) bundle stays small.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(URL as string, ANON as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
//  Row shapes (subset of supabase/schema.sql)
// ---------------------------------------------------------------------------
interface BookRow {
  id: string; slug: string; title: string; teaser: string | null; description: string | null;
  language: string | null; year_original: string | null; year_published: string | null;
  isbn: string | null; pages: number | null; words: number | null; author_bio: string | null;
  featured: boolean | null; status: string | null; visibility: string | null;
  cover_url: string | null; rights_confirmed: boolean | null;
  created_at: string | null; updated_at: string | null;
  book_categories?: { category_slug: string }[];
  book_contributors?: { author_id: string; role: string; position: number; authors?: { id: string; name: string } | null }[];
  book_chapters?: { title: string; url: string; position: number }[];
  book_files?: BookFileRow[];
}
interface BookFileRow {
  id: number | string; provider: string; file_type: string; file_name: string | null;
  file_size: number | null; download_url: string | null; read_url: string | null;
  external_file_id: string | null; is_primary: boolean | null; status: string | null;
  created_at: string | null; updated_at: string | null;
}
interface CategoryRow {
  slug: string; name: string; icon: string | null; description: string | null;
  group: string | null; image: string | null; active: boolean | null;
}

// ---------------------------------------------------------------------------
//  Row → frontend record mappers
// ---------------------------------------------------------------------------
function rowToFile(f: BookFileRow): BookFile {
  return {
    id: String(f.id),
    provider: (f.provider as BookFile['provider']) ?? 'external',
    fileType: (f.file_type as BookFile['fileType']) ?? 'pdf',
    fileName: f.file_name ?? undefined,
    fileSize: f.file_size ?? undefined,
    downloadUrl: f.download_url ?? '',
    readUrl: f.read_url ?? undefined,
    externalFileId: f.external_file_id ?? undefined,
    isPrimary: f.is_primary ?? false,
    status: (f.status as BookFile['status']) ?? 'unverified',
    createdAt: f.created_at ?? undefined,
    updatedAt: f.updated_at ?? undefined,
  };
}

function rowToRecord(b: BookRow): BookRecord {
  const contributors: Contributor[] = (b.book_contributors ?? [])
    .sort((x, y) => x.position - y.position)
    .map((c) => ({
      id: c.authors?.id ?? c.author_id,
      name: c.authors?.name ?? c.author_id,
      role: (c.role as Contributor['role']) ?? 'author',
    }));
  return {
    id: b.id,
    title: b.title,
    slug: b.slug,
    contributors,
    categorySlugs: (b.book_categories ?? []).map((c) => c.category_slug),
    teaser: b.teaser ?? '',
    description: b.description ?? '',
    words: b.words ?? undefined,
    yearOriginal: b.year_original ?? undefined,
    yearPublished: b.year_published ?? undefined,
    language: b.language ?? 'العربية',
    chapters: (b.book_chapters ?? []).sort((x, y) => x.position - y.position).map((c) => ({ title: c.title, url: c.url })),
    authorBio: b.author_bio ?? undefined,
    featured: b.featured ?? false,
    status: (b.status as BookRecord['status']) ?? 'published',
    visibility: (b.visibility as BookRecord['visibility']) ?? 'public',
    source: 'custom',
    isbn: b.isbn ?? undefined,
    pages: b.pages ?? undefined,
    coverUrl: b.cover_url ?? undefined,
    files: (b.book_files ?? []).map(rowToFile),
    rightsConfirmed: b.rights_confirmed ?? false,
    createdAt: b.created_at ?? undefined,
    updatedAt: b.updated_at ?? undefined,
  };
}

function rowToCategory(c: CategoryRow): Category {
  return {
    slug: c.slug,
    name: c.name,
    icon: c.icon ?? '📚',
    description: c.description ?? '',
    group: c.group ?? 'عام',
    image: c.image ?? undefined,
    active: c.active ?? true,
  };
}

const BOOK_SELECT = `
  *,
  book_categories(category_slug),
  book_contributors(author_id, role, position, authors(id, name)),
  book_chapters(title, url, position),
  book_files(*)
`;

export interface SupabaseCatalog {
  records: BookRecord[];
  categories: Category[];
}

/**
 * Read the public catalog from Supabase. With the anon key + RLS this returns
 * only published + public books. Returns null on any failure so the caller can
 * keep using the local store (never throws into the UI).
 */
export async function fetchCatalogFromSupabase(): Promise<SupabaseCatalog | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const [books, cats] = await Promise.all([
      sb.from('books').select(BOOK_SELECT).eq('status', 'published').eq('visibility', 'public'),
      sb.from('categories').select('*').eq('active', true),
    ]);
    if (books.error) throw books.error;
    if (cats.error) throw cats.error;
    return {
      records: (books.data as BookRow[] | null ?? []).map(rowToRecord),
      categories: (cats.data as CategoryRow[] | null ?? []).map(rowToCategory),
    };
  } catch (err) {
    console.warn('[supabase] fetchCatalog failed, staying on local store:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Write path (requires a Supabase Auth admin session — see header note).
//  Each function is fire-and-forget from the store's perspective and never
//  fakes success: it returns false + logs when RLS/auth rejects the write.
// ---------------------------------------------------------------------------
export async function upsertBookToSupabase(rec: BookRecord): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  try {
    const { error: bookErr } = await sb.from('books').upsert({
      id: rec.id,
      slug: rec.slug ?? rec.id,
      title: rec.title,
      teaser: rec.teaser,
      description: rec.description,
      language: rec.language,
      year_original: rec.yearOriginal ?? null,
      year_published: rec.yearPublished ?? null,
      isbn: rec.isbn ?? null,
      pages: rec.pages ?? null,
      words: rec.words ?? null,
      author_bio: rec.authorBio ?? null,
      featured: rec.featured ?? false,
      status: rec.status ?? 'draft',
      visibility: rec.visibility ?? 'public',
      cover_url: rec.coverUrl ?? null,
      rights_confirmed: rec.rightsConfirmed ?? false,
    });
    if (bookErr) throw bookErr;

    // Replace child rows (categories, contributors, chapters, files).
    await sb.from('book_categories').delete().eq('book_id', rec.id);
    if (rec.categorySlugs.length) {
      await sb.from('book_categories').insert(rec.categorySlugs.map((category_slug) => ({ book_id: rec.id, category_slug })));
    }
    await sb.from('book_chapters').delete().eq('book_id', rec.id);
    if (rec.chapters.length) {
      await sb.from('book_chapters').insert(rec.chapters.map((c, i) => ({ book_id: rec.id, title: c.title, url: c.url, position: i })));
    }
    // NOTE: contributors need author rows to exist first; upsert authors then links.
    await sb.from('book_contributors').delete().eq('book_id', rec.id);
    if (rec.contributors.length) {
      await sb.from('authors').upsert(rec.contributors.map((c) => ({ id: c.id, name: c.name })));
      await sb.from('book_contributors').insert(rec.contributors.map((c, i) => ({
        book_id: rec.id, author_id: c.id, role: c.role, position: i,
      })));
    }
    // book_files — metadata + URLs only, never file bytes.
    await sb.from('book_files').delete().eq('book_id', rec.id);
    const files = rec.files ?? [];
    if (files.length) {
      await sb.from('book_files').insert(files.map((f) => ({
        book_id: rec.id,
        provider: f.provider,
        file_type: f.fileType,
        file_name: f.fileName ?? null,
        file_size: f.fileSize ?? null,
        download_url: f.downloadUrl,
        read_url: f.readUrl ?? null,
        external_file_id: f.externalFileId ?? null,
        is_primary: f.isPrimary ?? false,
        status: f.status ?? 'unverified',
      })));
    }
    return true;
  } catch (err) {
    console.warn('[supabase] upsertBook failed (auth/RLS?). Local store is authoritative:', err);
    return false;
  }
}

export async function deleteBookFromSupabase(id: string): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('books').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[supabase] deleteBook failed:', err);
    return false;
  }
}

export async function upsertCategoryToSupabase(cat: Category): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('categories').upsert({
      slug: cat.slug, name: cat.name, icon: cat.icon, description: cat.description,
      group: cat.group, image: cat.image ?? null, active: cat.active ?? true,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[supabase] upsertCategory failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
//  Auth (real admin sessions). Only used when Supabase is configured; the app
//  otherwise falls back to the front-end-only demo gate. A successful sign-in
//  is what lets RLS accept admin writes (user id must be in the `admins` table).
// ---------------------------------------------------------------------------
export interface AuthResult { ok: boolean; email?: string; error?: string }

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'Supabase غير مُهيّأ' };
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, email: data.user?.email ?? email.trim() };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function signOutSupabase(): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  try { await sb.auth.signOut(); } catch { /* ignore */ }
}

export async function getCurrentEmail(): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user?.email ?? null;
  } catch {
    return null;
  }
}
