import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Book } from '../data/types';
import BookGrid from './BookGrid';
import Reveal from './Reveal';

interface Props {
  title: string;
  icon?: string;
  eyebrow?: string;
  books: Book[];
  moreTo?: string;
  limit?: number;
  eagerCount?: number;
}

export default function BookSection({ title, icon, eyebrow, books, moreTo, limit = 6, eagerCount = 0 }: Props) {
  if (books.length === 0) return null;
  return (
    <section className="section-tight">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <div>
              <h2>{icon && <span aria-hidden="true">{icon}</span>} {title}</h2>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            </div>
            {moreTo && (
              <Link to={moreTo} className="link-more">
                عرض المزيد <ArrowLeft size={18} />
              </Link>
            )}
          </div>
        </Reveal>
        <BookGrid books={books.slice(0, limit)} eagerCount={eagerCount} />
      </div>
    </section>
  );
}
