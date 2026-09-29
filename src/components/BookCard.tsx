import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Book } from '../data/types';
import { usePublicLibrary } from '../store/useLibrary';
import { chapterCountLabel } from '../utils/format';
import Cover from './Cover';

export default function BookCard({ book, eager }: { book: Book; eager?: boolean }) {
  const { categoryBySlug } = usePublicLibrary();
  const cat = categoryBySlug(book.categorySlugs[0]);
  return (
    <article className="book-card">
      <Link to={`/book/${book.id}`} className="book-card-cover" aria-label={`عرض كتاب ${book.title}`}>
        <Cover book={book} eager={eager} />
        <span className="book-card-overlay">
          <span className="btn btn-primary btn-sm">
            <BookOpen size={16} /> عرض الكتاب
          </span>
        </span>
        {cat && <span className="book-card-tag">{cat.name}</span>}
      </Link>
      <div className="book-card-body">
        <h3 className="book-card-title">
          <Link to={`/book/${book.id}`}>{book.title}</Link>
        </h3>
        <Link to={`/author/${book.authorId}`} className="book-card-author">
          {book.authorName}
        </Link>
        <div className="book-card-foot">
          <span className="muted book-card-meta">{chapterCountLabel(book.chapters.length)}</span>
          <Link to={`/book/${book.id}`} className="book-card-open" aria-hidden="true">
            <ArrowLeft size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
