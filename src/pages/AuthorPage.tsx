import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import BookGrid from '../components/BookGrid';
import Breadcrumb from '../components/Breadcrumb';
import Reveal from '../components/Reveal';
import NotFound from './NotFound';
import { useSeo } from '../hooks/useSeo';
import { bookCountLabel } from '../utils/format';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export default function AuthorPage() {
  const { id = '' } = useParams();
  const { authorById, booksByAuthor } = usePublicLibrary();
  const author = authorById(id);
  const authorBooks = author ? booksByAuthor(id) : [];

  useSeo({
    title: author ? `${author.name} — جميع الكتب | المكتبة الإلكترونية العربية` : 'مؤلف',
    description: author ? `تصفّح جميع كتب ${author.name} المتاحة للقراءة والتحميل مجانًا.` : undefined,
  });

  if (!author) return <NotFound />;

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'المؤلفون', to: '/authors' }, { label: author.name }]} />

      <Reveal>
        <div className="author-hero">
          <span className="author-avatar author-avatar--xl" aria-hidden="true">{initials(author.name)}</span>
          <div>
            <h1 className="page-title">{author.name}</h1>
            <span className="badge" style={{ marginTop: 8 }}><User size={14} /> {bookCountLabel(author.bookIds.length)}</span>
            {author.bio && <p className="muted author-hero-bio">{author.bio}</p>}
          </div>
        </div>
      </Reveal>

      <h2 className="subhead">جميع كتبه</h2>
      <BookGrid books={authorBooks} eagerCount={4} />
    </div>
  );
}
