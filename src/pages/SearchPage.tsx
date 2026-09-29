import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import type { Book } from '../data/types';
import BookGrid from '../components/BookGrid';
import SearchBar from '../components/SearchBar';
import FilterBar, { type FilterState } from '../components/FilterBar';
import ViewToggle, { type ViewMode } from '../components/ViewToggle';
import Breadcrumb from '../components/Breadcrumb';
import Reveal from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';
import { bookCountLabel } from '../utils/format';

export default function SearchPage() {
  const [params] = useSearchParams();
  const { categories, authors, search } = usePublicLibrary();
  const q = params.get('q') ?? '';
  const [filters, setFilters] = useState<FilterState>({});
  const [view, setView] = useState<ViewMode>('grid');

  useSeo({
    title: q ? `نتائج البحث عن «${q}»` : 'البحث في المكتبة',
    description: 'ابحث في آلاف الكتب العربية حسب العنوان أو المؤلف أو التصنيف أو الموضوع.',
  });

  const baseResults = useMemo<Book[]>(() => (q ? search(q) : []), [q, search]);

  const results = useMemo(() => {
    return baseResults.filter((b) => {
      if (filters.category && !b.categorySlugs.includes(filters.category)) return false;
      if (filters.author && !b.contributors.some((c) => c.id === filters.author && c.role === 'author')) return false;
      if (filters.language && b.language !== filters.language) return false;
      return true;
    });
  }, [baseResults, filters]);

  const langs = [...new Set(baseResults.map((b) => b.language))];

  const groups = [
    { id: 'category', label: 'التصنيف', options: categories.map((c) => ({ value: c.slug, label: c.name })) },
    { id: 'author', label: 'المؤلف', options: authors.map((a) => ({ value: a.id, label: a.name })) },
    { id: 'language', label: 'اللغة', options: langs.map((l) => ({ value: l, label: l })) },
  ];

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'البحث' }]} />

      <Reveal>
        <div className="search-page-head">
          <h1 className="page-title">{q ? <>نتائج البحث عن «{q}»</> : 'ابحث في المكتبة'}</h1>
          {q && <p className="muted">{bookCountLabel(results.length)}</p>}
          <div style={{ maxWidth: 640, marginTop: 14 }}>
            <SearchBar initialValue={q} />
          </div>
        </div>
      </Reveal>

      {q && baseResults.length > 0 && (
        <>
          <div className="row wrap" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <FilterBar groups={groups} value={filters} onChange={setFilters} />
            </div>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div style={{ marginTop: 20 }}>
            {results.length > 0 ? (
              <BookGrid books={results} view={view} />
            ) : (
              <div className="state">
                <span className="state-icon"><SearchX size={30} /></span>
                <h3>لا نتائج بعد تطبيق الفلاتر</h3>
                <button className="btn btn-outline" onClick={() => setFilters({})}>مسح الفلاتر</button>
              </div>
            )}
          </div>
        </>
      )}

      {q && baseResults.length === 0 && (
        <div className="state">
          <span className="state-icon"><SearchX size={30} /></span>
          <h3>لا توجد نتائج عن «{q}»</h3>
          <p>جرّب كلمات مختلفة أو تصفّح التصنيفات.</p>
        </div>
      )}
    </div>
  );
}
