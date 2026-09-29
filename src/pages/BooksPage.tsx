import { useMemo, useState } from 'react';
import { BookX } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import type { Book } from '../data/types';
import BookGrid from '../components/BookGrid';
import FilterBar, { type FilterState } from '../components/FilterBar';
import ViewToggle, { type ViewMode } from '../components/ViewToggle';
import Breadcrumb from '../components/Breadcrumb';
import Reveal from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';
import { bookCountLabel } from '../utils/format';

interface Props {
  mode?: 'all' | 'new' | 'featured';
}

export default function BooksPage({ mode = 'all' }: Props) {
  const { books, authors, categories, featured, newest } = usePublicLibrary();
  const [view, setView] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState('newest');

  const LANGS = useMemo(() => [...new Set(books.map((b) => b.language))], [books]);

  const base: Book[] =
    mode === 'new' ? newest : mode === 'featured' ? featured : books;

  const title =
    mode === 'new' ? 'أحدث الكتب' : mode === 'featured' ? 'الأكثر قراءة' : 'كل الكتب';

  useSeo({
    title: `${title} — كتب عربية مجانية للقراءة والتحميل`,
    description: 'تصفّح مكتبة الكتب العربية المجانية بحسب التصنيف والمؤلف واللغة، مع القراءة والتحميل المباشر.',
  });

  const filtered = useMemo(() => {
    let list = base.filter((b) => {
      if (filters.category && !b.categorySlugs.includes(filters.category)) return false;
      if (filters.author && !b.contributors.some((c) => c.id === filters.author && c.role === 'author')) return false;
      if (filters.language && b.language !== filters.language) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title, 'ar');
      if (sort === 'longest') return (b.words ?? 0) - (a.words ?? 0);
      return Number(b.yearPublished ?? 0) - Number(a.yearPublished ?? 0);
    });
    return list;
  }, [base, filters, sort]);

  const groups = [
    {
      id: 'category',
      label: 'التصنيف',
      options: categories.map((c) => ({ value: c.slug, label: c.name })),
    },
    {
      id: 'author',
      label: 'المؤلف',
      options: authors.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      id: 'language',
      label: 'اللغة',
      options: LANGS.map((l) => ({ value: l, label: l })),
    },
  ];

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: title }]} />
      <Reveal>
        <div className="page-head">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="muted">{bookCountLabel(filtered.length)} متاحة الآن</p>
          </div>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </Reveal>

      <FilterBar
        groups={groups}
        value={filters}
        onChange={setFilters}
        sort={{ value: sort, onChange: setSort }}
      />

      {filtered.length === 0 ? (
        <div className="state">
          <span className="state-icon"><BookX size={30} /></span>
          <h3>لا توجد كتب مطابقة</h3>
          <p>جرّب تعديل الفلاتر أو مسحها لعرض كل الكتب.</p>
          <button className="btn btn-outline" onClick={() => setFilters({})}>مسح الفلاتر</button>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <BookGrid books={filtered} view={view} eagerCount={view === 'grid' ? 4 : 0} />
        </div>
      )}
    </div>
  );
}
