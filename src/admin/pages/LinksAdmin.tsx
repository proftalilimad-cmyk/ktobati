import { useMemo, useState } from 'react';
import { ExternalLink, Search, BookOpen, Download } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { normalizeAr } from '../../utils/search';

interface LinkRow {
  bookId: string;
  bookTitle: string;
  kind: string;
  label: string;
  url: string;
}

export default function LinksAdmin() {
  const { snap } = useAdminLibrary();
  const [q, setQ] = useState('');

  const links = useMemo<LinkRow[]>(() => {
    const out: LinkRow[] = [];
    for (const b of snap.allBooks) {
      if (b.pdf) out.push({ bookId: b.id, bookTitle: b.title, kind: 'download', label: 'PDF', url: b.pdf });
      if (b.epub) out.push({ bookId: b.id, bookTitle: b.title, kind: 'download', label: 'ePub', url: b.epub });
      for (const ch of b.chapters) out.push({ bookId: b.id, bookTitle: b.title, kind: 'read', label: ch.title, url: ch.url });
    }
    return out;
  }, [snap.allBooks]);

  const rows = useMemo(() => {
    const n = normalizeAr(q);
    if (!n) return links;
    return links.filter((l) => normalizeAr(l.bookTitle).includes(n) || l.url.toLowerCase().includes(q.toLowerCase()));
  }, [links, q]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>الروابط</h1>
          <p className="muted">{links.length} رابط قراءة وتحميل — الروابط الخارجية محفوظة كما هي</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في الروابط…" />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>الكتاب</th><th>النوع</th><th>الوصف</th><th>الرابط</th></tr></thead>
          <tbody>
            {rows.slice(0, 500).map((l, i) => (
              <tr key={i}>
                <td><span className="table-title">{l.bookTitle}</span></td>
                <td>{l.kind === 'read' ? <span className="chip"><BookOpen size={13} /> قراءة</span> : <span className="chip chip--ok"><Download size={13} /> تحميل</span>}</td>
                <td>{l.label}</td>
                <td><a href={l.url} target="_blank" rel="noreferrer" className="link-more" dir="ltr">{l.url.slice(0, 52)} <ExternalLink size={12} /></a></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="admin-empty">لا توجد روابط.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
