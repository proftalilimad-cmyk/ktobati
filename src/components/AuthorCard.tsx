import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Author } from '../data/types';
import { bookCountLabel } from '../utils/format';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export default function AuthorCard({ author }: { author: Author }) {
  return (
    <Link to={`/author/${author.id}`} className="author-card">
      <span className="author-avatar" aria-hidden="true">{initials(author.name)}</span>
      <span className="author-info">
        <span className="author-name">{author.name}</span>
        <span className="author-count muted">{bookCountLabel(author.bookIds.length)}</span>
      </span>
      <ArrowLeft size={18} className="author-arrow" aria-hidden="true" />
    </Link>
  );
}
