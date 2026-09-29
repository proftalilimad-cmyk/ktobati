import type { Author, AuthorMeta, Book, BookRecord } from '../data/types';
import { assetUrl } from './assets';

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

export function toBook(r: BookRecord): Book {
  const primary = r.contributors.find((c) => c.role === 'author') ?? r.contributors[0];
  const seedCover = isHindawiId(r.id) ? `${CDN}/covers/svg/270x360/${r.id}.svg` : '';
  const uploadedCover = assetUrl(r.coverAssetId);
  const cover = uploadedCover || r.coverUrl || seedCover || '';

  const seedPdf = isHindawiId(r.id) ? `${CDN}/books/${r.id}.pdf` : '';
  const seedEpub = isHindawiId(r.id) ? `${CDN}/books/${r.id}.epub` : '';
  const seedKfx = isHindawiId(r.id) ? `${CDN}/books/${r.id}.kfx` : '';
  const uploadedFile = assetUrl(r.fileAssetId);

  const pdf = uploadedFile || (r.fileUrl && /\.pdf($|\?)/i.test(r.fileUrl) ? r.fileUrl : '') || seedPdf;
  const epub = (r.fileUrl && /\.epub($|\?)/i.test(r.fileUrl) ? r.fileUrl : '') || seedEpub;
  const genericFile = r.fileUrl || uploadedFile;

  const firstChapter = r.chapters[0]?.url;
  const sourceUrl = isHindawiId(r.id) ? `${SRC}/books/${r.id}/` : '';
  const hasDownload = Boolean(pdf || epub || genericFile);
  const hasRead = Boolean(firstChapter || pdf || genericFile);

  return {
    ...r,
    status: r.status ?? 'published',
    visibility: r.visibility ?? 'public',
    slug: r.slug ?? slugify(r.title),
    authorName: primary?.name ?? 'غير معروف',
    authorId: primary?.id ?? 'unknown',
    cover,
    coverLarge: cover,
    pdf: pdf || genericFile || '',
    epub,
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
