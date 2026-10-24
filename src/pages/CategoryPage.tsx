import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookX, Search } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import { normalizeAr } from '../utils/search';
import BookGrid from '../components/BookGrid';
import ViewToggle, { type ViewMode } from '../components/ViewToggle';
import Breadcrumb from '../components/Breadcrumb';
import Reveal from '../components/Reveal';
import NotFound from './NotFound';
import { useSeo } from '../hooks/useSeo';
import { bookCountLabel } from '../utils/format';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const { categoryBySlug, booksByCategory } = usePublicLibrary();
  const category = categoryBySlug(slug);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<ViewMode>('grid');

  const all = category ? booksByCategory(slug) : [];

  const list = useMemo(() => {
    let out = all;
    if (q.trim()) {
      const n = normalizeAr(q);
      out = out.filter(
        (b) => normalizeAr(b.title).includes(n) || normalizeAr(b.authorName).includes(n),
      );
    }
    out = [...out].sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title, 'ar');
      if (sort === 'longest') return (b.words ?? 0) - (a.words ?? 0);
      return Number(b.yearPublished ?? 0) - Number(a.yearPublished ?? 0);
    });
    return out;
  }, [all, q, sort]);

  useSeo({
    title: category ? `${category.name} — كتب ${category.name} مجانية | المكتبة الإلكترونية العربية` : 'تصنيف',
    description: category?.description,
  });

  if (!category) return <NotFound />;

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'التصنيفات', to: '/categories' }, { label: category.name }]} />

      <Reveal>
        <div className="category-hero">
          <span className="category-hero-icon" aria-hidden="true">{category.icon}</span>
          <div>
            <h1 className="page-title">{category.name}</h1>
            <p className="muted">{category.description}</p>
            <span className="badge" style={{ marginTop: 10 }}>{bookCountLabel(all.length)}</span>
          </div>
        </div>
      </Reveal>

      <div className="category-toolbar">
        <div className="inline-search">
          <Search size={18} className="inline-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`البحث داخل ${category.name}…`}
            aria-label="بحث داخل القسم"
          />
        </div>
        <div className="row wrap" style={{ gap: 12 }}>
          <label className="filter-select">
            <span className="filter-select-label">الترتيب</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">الأحدث</option>
              <option value="alpha">الأبجدية</option>
              <option value="longest">الأطول</option>
            </select>
          </label>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <h2 className="subhead">جميع الكتب</h2>
      {list.length === 0 ? (
        <div className="state">
          <span className="state-icon"><BookX size={30} /></span>
          <h3>لا توجد نتائج</h3>
          <p>لم نعثر على كتب مطابقة داخل هذا التصنيف.</p>
        </div>
      ) : (
        <BookGrid books={list} view={view} eagerCount={view === 'grid' ? 4 : 0} />
      )}
    </div>
  );
}
