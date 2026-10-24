import { Link } from 'react-router-dom';
import { BookOpen, Users, Tags, FileEdit, CheckCircle2, Archive, PlusCircle, Upload, Clock, TrendingUp, FileText, Link2, Cloud, Download } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useAdminPath } from '../base';
import { StatusBadge } from '../components/StatusBadge';

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function Dashboard() {
  const { snap } = useAdminLibrary();
  const path = useAdminPath();

  const books = snap.allBooks;
  const published = books.filter((b) => b.status === 'published').length;
  const drafts = books.filter((b) => b.status === 'draft').length;
  const archived = books.filter((b) => b.status === 'archived').length;

  const allFiles = books.flatMap((b) => b.files);
  const pdfCount = allFiles.filter((f) => f.fileType === 'pdf').length;
  const epubCount = allFiles.filter((f) => f.fileType === 'epub').length;
  const activeLinks = allFiles.filter((f) => f.status === 'active').length;
  const toVerifyLinks = allFiles.filter((f) => f.status !== 'active').length;
  const onedriveBooks = books.filter((b) => b.files.some((f) => f.provider === 'onedrive')).length;
  const up4everBooks = books.filter((b) => b.files.some((f) => f.provider === 'up4ever')).length;

  const stats = [
    { icon: <BookOpen size={20} />, value: books.length, label: 'إجمالي الكتب', color: 'teal' },
    { icon: <Users size={20} />, value: snap.authors.length, label: 'المؤلفون', color: 'blue' },
    { icon: <Tags size={20} />, value: snap.categories.length, label: 'التصنيفات', color: 'violet' },
    { icon: <CheckCircle2 size={20} />, value: published, label: 'منشور', color: 'green' },
    { icon: <FileEdit size={20} />, value: drafts, label: 'مسودات', color: 'amber' },
    { icon: <Archive size={20} />, value: archived, label: 'مؤرشف', color: 'slate' },
    { icon: <FileText size={20} />, value: pdfCount, label: 'ملفات PDF', color: 'teal' },
    { icon: <FileText size={20} />, value: epubCount, label: 'ملفات EPUB', color: 'blue' },
    { icon: <Cloud size={20} />, value: onedriveBooks, label: 'كتب على OneDrive', color: 'blue' },
    { icon: <Download size={20} />, value: up4everBooks, label: 'كتب على Up-4ever', color: 'violet' },
    { icon: <Link2 size={20} />, value: activeLinks, label: 'روابط نشطة', color: 'green' },
    { icon: <Link2 size={20} />, value: toVerifyLinks, label: 'روابط للتحقق', color: 'amber' },
  ];

  const recent = [...snap.records]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 6);
  const edited = [...snap.records]
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, 6);

  const catUsage = snap.categories
    .map((c) => ({ ...c, count: snap.records.filter((r) => r.categorySlugs.includes(c.slug)).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCat = Math.max(1, ...catUsage.map((c) => c.count));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>لوحة التحكم</h1>
          <p className="muted">نظرة عامة على المكتبة والإحصائيات الحيّة</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link to={path('books/new')} className="btn btn-primary"><PlusCircle size={17} /> كتاب جديد</Link>
          <Link to={path('books/import')} className="btn btn-outline"><Upload size={17} /> استيراد</Link>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card stat-${s.color}`}>
            <span className="stat-icon">{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2><Clock size={18} /> أحدث الكتب المضافة</h2>
            <Link to={path('books')} className="link-more">الكل</Link>
          </div>
          <ul className="admin-list">
            {recent.map((r) => (
              <li key={r.id}>
                <Link to={path(`books/${r.id}/edit`)} className="admin-list-title">{r.title}</Link>
                <span className="admin-list-meta">
                  <StatusBadge status={r.status ?? 'draft'} />
                  <span className="muted">{fmtDate(r.createdAt)}</span>
                </span>
              </li>
            ))}
            {recent.length === 0 && <li className="muted">لا توجد كتب بعد.</li>}
          </ul>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2><FileEdit size={18} /> آخر التعديلات</h2>
          </div>
          <ul className="admin-list">
            {edited.map((r) => (
              <li key={r.id}>
                <Link to={path(`books/${r.id}/edit`)} className="admin-list-title">{r.title}</Link>
                <span className="admin-list-meta">
                  <StatusBadge status={r.status ?? 'draft'} />
                  <span className="muted">{fmtDate(r.updatedAt)}</span>
                </span>
              </li>
            ))}
            {edited.length === 0 && <li className="muted">لا توجد تعديلات.</li>}
          </ul>
        </section>
      </div>

      <div className="admin-grid-2">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2><TrendingUp size={18} /> التصنيفات الأكثر استخدامًا</h2>
          </div>
          <ul className="bar-list">
            {catUsage.map((c) => (
              <li key={c.slug}>
                <span className="bar-label">{c.icon} {c.name}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${(c.count / maxCat) * 100}%` }} /></span>
                <span className="bar-value">{c.count}</span>
              </li>
            ))}
            {catUsage.length === 0 && <li className="muted">لا توجد بيانات.</li>}
          </ul>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2><Clock size={18} /> سجل النشاط</h2>
          </div>
          <ul className="activity-list">
            {snap.activity.slice(0, 8).map((a) => (
              <li key={a.id}>
                <span className={`activity-dot activity-${a.type}`} />
                <span className="activity-text"><strong>{a.action}</strong> — {a.target}</span>
                <span className="muted activity-date">{fmtDate(a.date)}</span>
              </li>
            ))}
            {snap.activity.length === 0 && <li className="muted">لا يوجد نشاط مسجّل.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
