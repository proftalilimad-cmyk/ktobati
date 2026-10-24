import { useState } from 'react';
import type { Book } from '../data/types';

interface Props {
  book: Book;
  eager?: boolean;
  className?: string;
}

/** Book cover with graceful fallback if the remote SVG fails to load. */
export default function Cover({ book, eager, className = '' }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed || !book.cover) {
    return (
      <div className={`cover cover--fallback ${className}`} aria-hidden="true">
        <span className="cover-fallback-title">{book.title}</span>
        <span className="cover-fallback-author">{book.authorName}</span>
      </div>
    );
  }

  return (
    <img
      className={`cover ${className}`}
      src={book.cover}
      alt={`غلاف كتاب ${book.title}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      width={270}
      height={360}
      onError={() => setFailed(true)}
    />
  );
}
