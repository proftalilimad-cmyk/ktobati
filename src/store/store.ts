import type {
  ActivityEntry,
  Author,
  AuthorMeta,
  Book,
  BookRecord,
  Category,
} from '../data/types';
import { rawBooks } from '../data/books.raw';
import { categories as seedCategories } from '../data/categories';
import { buildSearchIndex, deriveAuthors, deriveBooks, runSearch, slugify } from './derive';
import { deleteAsset, preloadAssets } from './assets';

const KEY = 'maktaba-catalog-v2';

interface Persisted {
  version: number;
  records: BookRecord[];
  categories: Category[];
  authorMeta: AuthorMeta[];
  activity: ActivityEntry[];
}

export interface Snapshot {
  records: BookRecord[];
  allBooks: Book[];
  publicBooks: Book[];
  categories: Category[];
  activeCategories: Category[];
  authors: Author[];
  activity: ActivityEntry[];
}

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

function seed(): Persisted {
  const records: BookRecord[] = rawBooks.map((r) => ({
    ...r,
    status: 'published',
    visibility: 'public',
    source: 'seed',
    slug: slugify(r.title),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return {
    version: 2,
    records,
    categories: seedCategories.map((c) => ({ ...c, active: true })),
    authorMeta: [],
    activity: [],
  };
}

function load(): Persisted {
  if (typeof localStorage === 'undefined') return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.records) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

class LibraryStore {
  private data: Persisted;
  private snap: Snapshot;
  private listeners = new Set<() => void>();

  constructor() {
    this.data = load();
    this.snap = this.build();
    // preload uploaded assets, then refresh snapshot so covers/files resolve
    const ids = this.data.records.flatMap((r) =>
      [
        r.coverAssetId,
        r.fileAssetId,
        ...(r.files ?? []).map((f) => f.assetId),
      ].filter(Boolean) as string[],
    );
    if (ids.length) {
      preloadAssets(ids).then(() => this.commit(false));
    }
  }

  private catName = (slug: string) =>
    this.data.categories.find((c) => c.slug === slug)?.name ?? slug;

  private build(): Snapshot {
    const allBooks = deriveBooks(this.data.records);
    const publicBooks = allBooks.filter(
      (b) => b.status === 'published' && b.visibility === 'public',
    );
    const authors = deriveAuthors(this.data.records, this.data.authorMeta);
    return {
      records: this.data.records,
      allBooks,
      publicBooks,
      categories: this.data.categories,
      activeCategories: this.data.categories.filter((c) => c.active !== false),
      authors,
      activity: this.data.activity,
    };
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* quota — ignore */
    }
  }

  private commit(persist = true) {
    if (persist) this.persist();
    this.snap = this.build();
    this.listeners.forEach((l) => l());
  }

  private log(type: ActivityEntry['type'], action: string, target: string) {
    this.data.activity.unshift({
      id: uid(),
      date: new Date().toISOString(),
      user: 'Admin',
      action,
      target,
      type,
    });
    this.data.activity = this.data.activity.slice(0, 100);
  }

  // ---- subscription API (useSyncExternalStore) ----
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  getSnapshot = () => this.snap;

  // ---- search ----
  search(query: string, publicOnly = true): Book[] {
    const books = publicOnly ? this.snap.publicBooks : this.snap.allBooks;
    return runSearch(buildSearchIndex(books, this.catName), query);
  }

  // ---- books ----
  uniqueSlug(title: string, ignoreId?: string): string {
    const base = slugify(title);
    let slug = base;
    let i = 2;
    const taken = (s: string) =>
      this.data.records.some((r) => r.slug === s && r.id !== ignoreId);
    while (taken(slug)) slug = `${base}-${i++}`;
    return slug;
  }

  addBook(rec: Omit<BookRecord, 'id'> & { id?: string }): BookRecord {
    const id = rec.id ?? uid();
    const now = new Date().toISOString();
    const record: BookRecord = {
      ...rec,
      id,
      source: 'custom',
      slug: this.uniqueSlug(rec.slug || rec.title, id),
      createdAt: now,
      updatedAt: now,
    };
    this.data.records.unshift(record);
    this.log(record.status === 'published' ? 'publish' : 'create',
      record.status === 'published' ? 'نشر كتاب' : 'إضافة كتاب (مسودة)', record.title);
    this.commit();
    return record;
  }

  updateBook(id: string, patch: Partial<BookRecord>) {
    const idx = this.data.records.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const prev = this.data.records[idx];
    const next: BookRecord = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
    if (patch.slug || patch.title) next.slug = this.uniqueSlug(patch.slug || next.slug || next.title, id);
    this.data.records[idx] = next;
    this.log('update', 'تعديل كتاب', next.title);
    this.commit();
  }

  setStatus(id: string, status: BookRecord['status']) {
    const rec = this.data.records.find((r) => r.id === id);
    if (!rec) return;
    rec.status = status;
    rec.updatedAt = new Date().toISOString();
    this.log('publish', status === 'published' ? 'نشر كتاب' : status === 'archived' ? 'أرشفة كتاب' : 'إلغاء نشر', rec.title);
    this.commit();
  }

  duplicateBook(id: string): BookRecord | undefined {
    const rec = this.data.records.find((r) => r.id === id);
    if (!rec) return;
    const copy = { ...rec, id: undefined, title: `${rec.title} (نسخة)`, status: 'draft' as const, source: 'custom' as const };
    return this.addBook(copy);
  }

  async deleteBook(id: string) {
    const rec = this.data.records.find((r) => r.id === id);
    if (!rec) return;
    if (rec.coverAssetId) await deleteAsset(rec.coverAssetId).catch(() => {});
    if (rec.fileAssetId) await deleteAsset(rec.fileAssetId).catch(() => {});
    for (const f of rec.files ?? []) {
      if (f.assetId) await deleteAsset(f.assetId).catch(() => {});
    }
    this.data.records = this.data.records.filter((r) => r.id !== id);
    this.log('delete', 'حذف كتاب', rec.title);
    this.commit();
  }

  importBooks(records: Array<Omit<BookRecord, 'id'>>): number {
    const now = new Date().toISOString();
    for (const rec of records) {
      const id = uid();
      this.data.records.unshift({
        ...rec,
        id,
        source: 'custom',
        slug: this.uniqueSlug(rec.slug || rec.title, id),
        createdAt: now,
        updatedAt: now,
      });
    }
    this.log('import', `استيراد ${records.length} كتاب`, 'CSV');
    this.commit();
    return records.length;
  }

  // ---- categories ----
  categoryInUse(slug: string): number {
    return this.data.records.filter((r) => r.categorySlugs.includes(slug)).length;
  }

  addCategory(cat: Category): { ok: boolean; error?: string } {
    if (this.data.categories.some((c) => c.slug === cat.slug))
      return { ok: false, error: 'المعرّف (slug) مستخدم بالفعل' };
    this.data.categories.push({ ...cat, active: cat.active ?? true });
    this.log('create', 'إضافة تصنيف', cat.name);
    this.commit();
    return { ok: true };
  }

  updateCategory(slug: string, patch: Partial<Category>) {
    const idx = this.data.categories.findIndex((c) => c.slug === slug);
    if (idx < 0) return;
    this.data.categories[idx] = { ...this.data.categories[idx], ...patch, slug };
    this.log('update', 'تعديل تصنيف', this.data.categories[idx].name);
    this.commit();
  }

  deleteCategory(slug: string): { ok: boolean; error?: string } {
    const used = this.categoryInUse(slug);
    if (used > 0) return { ok: false, error: `لا يمكن الحذف: هناك ${used} كتاب في هذا التصنيف` };
    const cat = this.data.categories.find((c) => c.slug === slug);
    this.data.categories = this.data.categories.filter((c) => c.slug !== slug);
    if (cat) this.log('delete', 'حذف تصنيف', cat.name);
    this.commit();
    return { ok: true };
  }

  toggleCategory(slug: string) {
    const cat = this.data.categories.find((c) => c.slug === slug);
    if (!cat) return;
    cat.active = cat.active === false;
    this.commit();
  }

  // ---- authors ----
  upsertAuthor(meta: AuthorMeta): AuthorMeta {
    const id = meta.id || uid();
    const idx = this.data.authorMeta.findIndex((a) => a.id === id);
    const next = { ...meta, id };
    if (idx >= 0) {
      this.data.authorMeta[idx] = next;
      this.log('update', 'تعديل مؤلف', next.name);
    } else {
      this.data.authorMeta.push(next);
      this.log('create', 'إضافة مؤلف', next.name);
    }
    this.commit();
    return next;
  }

  deleteAuthorMeta(id: string) {
    this.data.authorMeta = this.data.authorMeta.filter((a) => a.id !== id);
    this.commit();
  }

  // ---- misc ----
  resetToSeed() {
    this.data = seed();
    this.log('update', 'إعادة تعيين البيانات', 'seed');
    this.commit();
  }

  newId = uid;
}

export const store = new LibraryStore();
export type { BookRecord };
