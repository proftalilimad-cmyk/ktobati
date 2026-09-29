import { Link } from 'react-router-dom';
import type { Category } from '../data/types';
import { usePublicLibrary } from '../store/useLibrary';
import { bookCountLabel } from '../utils/format';

export default function CategoryCard({ category, large }: { category: Category; large?: boolean }) {
  const { booksByCategory } = usePublicLibrary();
  const count = booksByCategory(category.slug).length;
  return (
    <Link to={`/category/${category.slug}`} className={`cat-card ${large ? 'cat-card--lg' : ''}`}>
      <span className="cat-card-icon" aria-hidden="true">
        {category.icon}
      </span>
      <span className="cat-card-name">{category.name}</span>
      {large && <span className="cat-card-desc muted">{category.description}</span>}
      <span className="cat-card-count">{bookCountLabel(count)}</span>
    </Link>
  );
}
