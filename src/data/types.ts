export interface Contributor {
  id: string;
  name: string;
  /** author | translator | reviewer */
  role: 'author' | 'translator' | 'reviewer';
}

export interface Chapter {
  title: string;
  /** real reading URL on the source library (external) */
  url: string;
}

export type BookStatus = 'draft' | 'published' | 'archived';
export type Visibility = 'public' | 'private';

/** External storage providers for book files (PDF/EPUB). Extensible. */
export type StorageProvider =
  | 'onedrive'
  | 'up4ever'
  | 'fileink'
  | 'rapidfiles'
  | 'filefire'
  | 'supabase'
  | 'local'
  | 'external';

export type BookFileType = 'pdf' | 'epub';
export type LinkStatus = 'active' | 'unverified' | 'broken';

/** A single downloadable/readable file for a book, hosted anywhere. */
export interface BookFile {
  id: string;
  provider: StorageProvider;
  fileType: BookFileType;
  fileName?: string;
  fileSize?: number;
  /** real download URL provided by the admin / provider (never faked) */
  downloadUrl: string;
  /** optional online-reading URL */
  readUrl?: string;
  /** optional provider-specific file id (e.g. OneDrive item id) */
  externalFileId?: string;
  /** id of an uploaded blob in IndexedDB (provider === 'local') */
  assetId?: string;
  isPrimary?: boolean;
  status?: LinkStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileMeta {
  name: string;
  size: number;
  format: string;
  importedAt: string;
}

export interface BookRecord {
  id: string;
  title: string;
  contributors: Contributor[];
  categorySlugs: string[];
  /** short teaser / opening quote */
  teaser: string;
  /** full synopsis */
  description: string;
  words?: number;
  yearOriginal?: string;
  yearPublished?: string;
  language: string;
  chapters: Chapter[];
  authorBio?: string;
  featured?: boolean;

  /* ---- CMS fields ---- */
  slug?: string;
  status?: BookStatus;
  visibility?: Visibility;
  source?: 'seed' | 'custom';
  isbn?: string;
  pages?: number;
  subcategory?: string;
  /** external cover URL (used instead of derived/uploaded) */
  coverUrl?: string;
  /** id of an uploaded cover blob in IndexedDB */
  coverAssetId?: string;
  /** external file URL (PDF/EPUB hosted elsewhere) — LEGACY, kept for migration */
  fileUrl?: string;
  /** id of an uploaded book file blob in IndexedDB — LEGACY */
  fileAssetId?: string;
  fileMeta?: FileMeta;
  /** NEW: one or more files (PDF/EPUB) hosted on external providers */
  files?: BookFile[];
  /** admin confirmed they hold distribution rights before publishing files */
  rightsConfirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Book extends BookRecord {
  authorName: string;
  authorId: string;
  cover: string;
  coverLarge: string;
  /** resolved, ready-to-use file list (migrated from legacy/seed when needed) */
  files: BookFile[];
  pdf: string;
  epub: string;
  kfx: string;
  /** landing page on source (external) */
  sourceUrl: string;
  /** whether a real online-reading target exists */
  hasRead: boolean;
  /** whether a real downloadable file exists */
  hasDownload: boolean;
  status: BookStatus;
  visibility: Visibility;
  slug: string;
}

export interface Category {
  slug: string;
  name: string;
  icon: string;
  description: string;
  group: string;
  active?: boolean;
  image?: string;
}

export interface Author {
  id: string;
  name: string;
  bookIds: string[];
  bio?: string;
  photo?: string;
  country?: string;
  website?: string;
}

/** Stored author metadata managed via the admin dashboard. */
export interface AuthorMeta {
  id: string;
  name: string;
  bio?: string;
  photo?: string;
  country?: string;
  website?: string;
}

export interface ActivityEntry {
  id: string;
  date: string;
  user: string;
  action: string;
  target: string;
  type: 'create' | 'update' | 'delete' | 'publish' | 'import' | 'auth';
}

