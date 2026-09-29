import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import { normalizeAr } from '../utils/search';
import AuthorCard from '../components/AuthorCard';
import Breadcrumb from '../components/Breadcrumb';
import Reveal from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';

export default function AuthorsPage() {
  const { authors } = usePublicLibrary();
  const [q, setQ] = useState('');
  useSeo({
    title: 'المؤلفون — تصفّح الكتب حسب الكاتب',
    description: 'قائمة المؤلفين المتاحين في المكتبة الإلكترونية العربية مع جميع أعمالهم.',
  });

  const list = useMemo(() => {
    if (!q.trim()) return authors;
    const n = normalizeAr(q);
    return authors.filter((a) => normalizeAr(a.name).includes(n));
  }, [q, authors]);

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'المؤلفون' }]} />
      <Reveal>
        <div className="page-head">
          <div>
            <h1 className="page-title">✍️ المؤلفون</h1>
            <p className="muted">اكتشف الكتّاب والمفكرين وتصفّح أعمالهم</p>
          </div>
        </div>
      </Reveal>

      <div className="inline-search inline-search--wide">
        <Search size={18} className="inline-search-icon" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن مؤلف…"
          aria-label="بحث عن مؤلف"
        />
      </div>

      {list.length === 0 ? (
        <div className="state">
          <span className="state-icon"><Users size={30} /></span>
          <h3>لا يوجد مؤلف بهذا الاسم</h3>
        </div>
      ) : (
        <div className="author-grid">
          {list.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i * 40, 240)}>
              <AuthorCard author={a} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
