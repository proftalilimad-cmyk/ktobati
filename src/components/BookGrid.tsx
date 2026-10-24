import type { Book } from '../data/types';
import BookCard from './BookCard';
import BookRow from './BookRow';
import Reveal from './Reveal';

interface Props {
  books: Book[];
  view?: 'grid' | 'list';
  eagerCount?: number;
}

export default function BookGrid({ books, view = 'grid', eagerCount = 0 }: Props) {
  if (view === 'list') {
    return (
      <div className="book-list">
        {books.map((b, i) => (
          <Reveal key={b.id} delay={Math.min(i * 40, 240)}>
            <BookRow book={b} />
          </Reveal>
        ))}
      </div>
    );
  }
  return (
    <div className="book-grid">
      {books.map((b, i) => (
        <Reveal key={b.id} delay={Math.min(i * 45, 300)}>
          <BookCard book={b} eager={i < eagerCount} />
        </Reveal>
      ))}
    </div>
  );
}
