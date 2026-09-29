import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Book } from '../data/types';
import { usePublicLibrary } from '../store/useLibrary';
import { chapterCountLabel } from '../utils/format';
import Cover from './Cover';

/** List-view representation of a book. */
export default function BookRow({ book }: { book: Book }) {
  const { categoryBySlug } = usePublicLibrary();
  return (
    <Link to={`/book/${book.id}`} className="book-row">
      <div className="book-row-cover">
        <Cover book={book} />
      </div>
      <div className="book-row-body">
        <h3 className="book-row-title">{book.title}</h3>
        <span className="book-row-author">{book.authorName}</span>
        <div className="book-row-tags">
          {book.categorySlugs.map((s) => {
            const c = categoryBySlug(s);
            return c ? <span key={s} className="badge badge-ink">{c.name}</span> : null;
          })}
          <span className="muted book-row-meta">{chapterCountLabel(book.chapters.length)}</span>
        </div>
        <p className="book-row-desc muted">{book.teaser}</p>
      </div>
      <span className="book-row-cta" aria-hidden="true">
        عرض <ArrowLeft size={16} />
      </span>
    </Link>
  );
}
