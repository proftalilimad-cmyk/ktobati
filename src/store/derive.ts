import type { Author, AuthorMeta, Book, BookFile, BookRecord } from '../data/types';
import { assetUrl } from './assets';
import { providerFromUrl } from './links';

const CDN = 'https://downloads.hindawi.org';
const SRC = 'https://www.safahat.org';

/** URL-safe slug supporting Arabic + Latin. */
export function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u0652\u0670]/g, '') // tashkeel
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'book'
  );
}

export function normalizeAr(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\u0640/g, '')
    .replace(/[«»"',.:؛؟!()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const isHindawiId = (id: string) => /^\d{6,}$/.test(id);

/**
 * Resolve the file list for a book. Prefers the new `files[]`; otherwise
 * migrates legacy single-file fields; seed books derive from their Hindawi id.
 * This is non-destructive — the stored record keeps its original fields.
 */
export function resolveFiles(r: BookRecord): BookFile[] {
  // 1) new multi-file model
  if (r.files && r.files.length > 0) {
    return r.files.map((f) => ({
      ...f,
      downloadUrl: f.provider === 'local' && f.assetId ? assetUrl(f.assetId) || f.downloadUrl : f.downloadUrl,
    }));
  }

  const out: BookFile[] = [];
  // 2) legacy uploaded blob
  const uploadedFile = assetUrl(r.fileAssetId);
  if (r.fileAssetId) {
    const fmt = (r.fileMeta?.format ?? '').toLowerCase();
    out.push({
      id: `legacy-local-${r.id}`,
      provider: 'local',
      fileType: fmt.includes('epub') ? 'epub' : 'pdf',
      fileName: r.fileMeta?.name,
      fileSize: r.fileMeta?.size,
      downloadUrl: uploadedFile,
      assetId: r.fileAssetId,
      isPrimary: true,
      status: 'active',
    });
  }
  // 3) legacy external URL
  if (r.fileUrl) {
    out.push({
      id: `legacy-url-${r.id}`,
      provider: providerFromUrl(r.fileUrl),
      fileType: /\.epub($|\?)/i.test(r.fileUrl) ? 'epub' : 'pdf',
      downloadUrl: r.fileUrl,
      isPrimary: out.length === 0,
      status: 'unverified',
    });
  }
  // 4) seed (Hindawi) — real canonical file URLs derived from id
  if (out.length === 0 && isHindawiId(r.id)) {
    out.push(
      { id: `seed-pdf-${r.id}`, provider: 'external', fileType: 'pdf', downloadUrl: `${CDN}/books/${r.id}.pdf`, isPrimary: true, status: 'active' },
      { id: `seed-epub-${r.id}`, provider: 'external', fileType: 'epub', downloadUrl: `${CDN}/books/${r.id}.epub`, status: 'active' },
    );
  }
  return out;
}

export function toBook(r: BookRecord): Book {
  const primary = r.contributors.find((c) => c.role === 'author') ?? r.contributors[0];
  const seedCover = isHindawiId(r.id) ? `${CDN}/covers/svg/270x360/${r.id}.svg` : '';
  const uploadedCover = assetUrl(r.coverAssetId);
  const cover = uploadedCover || r.coverUrl || seedCover || '';

  const files = resolveFiles(r).filter((f) => f.downloadUrl);
  const pdfFile = files.find((f) => f.fileType === 'pdf');
  const epubFile = files.find((f) => f.fileType === 'epub');
  const seedKfx = isHindawiId(r.id) ? `${CDN}/books/${r.id}.kfx` : '';

  const firstChapter = r.chapters[0]?.url;
  const fileReadUrl = files.find((f) => f.readUrl)?.readUrl;
  const sourceUrl = isHindawiId(r.id) ? `${SRC}/books/${r.id}/` : '';
  const hasDownload = files.length > 0;
  const hasRead = Boolean(firstChapter || fileReadUrl || pdfFile?.downloadUrl);

  return {
    ...r,
    status: r.status ?? 'published',
    visibility: r.visibility ?? 'public',
    slug: r.slug ?? slugify(r.title),
    authorName: primary?.name ?? 'غير معروف',
    authorId: primary?.id ?? 'unknown',
    cover,
    coverLarge: cover,
    files,
    pdf: pdfFile?.downloadUrl ?? '',
    epub: epubFile?.downloadUrl ?? '',
    kfx: seedKfx,
    sourceUrl,
    hasRead,
    hasDownload,
  };
}

export function deriveBooks(records: BookRecord[]): Book[] {
  return records.map(toBook);
}

/** Build the authors list, merging stored metadata with contributor-derived data. */
export function deriveAuthors(records: BookRecord[], meta: AuthorMeta[]): Author[] {
  const map = new Map<string, Author>();
  for (const r of records) {
    for (const c of r.contributors) {
      if (c.role !== 'author') continue;
      const existing = map.get(c.id);
      if (existing) existing.bookIds.push(r.id);
      else map.set(c.id, { id: c.id, name: c.name, bookIds: [r.id], bio: r.authorBio });
    }
  }
  // overlay explicit metadata + include authors with zero books
  for (const m of meta) {
    const existing = map.get(m.id);
    if (existing) {
      Object.assign(existing, {
        name: m.name || existing.name,
        bio: m.bio ?? existing.bio,
        photo: m.photo,
        country: m.country,
        website: m.website,
      });
    } else {
      map.set(m.id, { id: m.id, name: m.name, bookIds: [], bio: m.bio, photo: m.photo, country: m.country, website: m.website });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

interface IndexEntry {
  book: Book;
  hay: string;
}

export function buildSearchIndex(books: Book[], catName: (slug: string) => string): IndexEntry[] {
  return books.map((b) => {
    const cats = b.categorySlugs.map(catName).join(' ');
    const people = b.contributors.map((c) => c.name).join(' ');
    return {
      book: b,
      hay: normalizeAr([b.title, people, cats, b.description, b.teaser, b.language, b.isbn ?? ''].join(' ')),
    };
  });
}

export function runSearch(index: IndexEntry[], query: string): Book[] {
  const q = normalizeAr(query);
  if (!q) return [];
  const terms = q.split(' ').filter(Boolean);
  return index
    .map(({ book, hay }) => {
      let score = 0;
      const titleN = normalizeAr(book.title);
      const authorN = normalizeAr(book.authorName);
      for (const t of terms) {
        if (!hay.includes(t)) return { book, score: -1 };
        if (titleN.includes(t)) score += 5;
        if (authorN.includes(t)) score += 3;
        score += 1;
      }
      if (titleN.startsWith(q)) score += 4;
      return { book, score };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.book);
}
