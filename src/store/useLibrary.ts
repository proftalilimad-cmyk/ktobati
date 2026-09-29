import { useSyncExternalStore } from 'react';
import { store, type Snapshot } from './store';
import type { Book, Category } from '../data/types';

export function useSnapshot(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export interface PublicLibrary {
  books: Book[];
  categories: Category[];
  authors: { id: string; name: string; bookIds: string[]; bio?: string; photo?: string; country?: string; website?: string }[];
  featured: Book[];
  newest: Book[];
  getBook: (idOrSlug: string) => Book | undefined;
  booksByCategory: (slug: string) => Book[];
  categoryBySlug: (slug: string) => Category | undefined;
  authorById: (id: string) => PublicLibrary['authors'][number] | undefined;
  booksByAuthor: (id: string) => Book[];
  search: (q: string) => Book[];
}

export function usePublicLibrary(): PublicLibrary {
  const snap = useSnapshot();
  const books = snap.publicBooks;
  const publicIds = new Set(books.map((b) => b.id));
  const authors = snap.authors
    .map((a) => ({ ...a, bookIds: a.bookIds.filter((id) => publicIds.has(id)) }))
    .filter((a) => a.bookIds.length > 0);

  return {
    books,
    categories: snap.activeCategories,
    authors,
    featured: books.filter((b) => b.featured),
    newest: [...books].sort((a, b) => Number(b.yearPublished ?? 0) - Number(a.yearPublished ?? 0)),
    getBook: (idOrSlug) => books.find((b) => b.id === idOrSlug || b.slug === idOrSlug),
    booksByCategory: (slug) => books.filter((b) => b.categorySlugs.includes(slug)),
    categoryBySlug: (slug) => snap.categories.find((c) => c.slug === slug),
    authorById: (id) => authors.find((a) => a.id === id),
    booksByAuthor: (id) => books.filter((b) => b.contributors.some((c) => c.id === id && c.role === 'author')),
    search: (q) => store.search(q, true),
  };
}

export function useAdminLibrary() {
  const snap = useSnapshot();
  return { snap, store };
}
