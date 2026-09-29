import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Eye, Pencil, Copy, Trash2, ExternalLink } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useAdminPath } from '../base';
import { useToast } from '../Toast';
import { StatusBadge, VisibilityBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import Cover from '../../components/Cover';
import { normalizeAr } from '../../utils/search';
import { PROVIDER_LABEL, SELECTABLE_PROVIDERS } from '../../store/links';
import type { BookStatus, StorageProvider, BookFileType } from '../../data/types';

export default function BooksList() {
  const { snap, store } = useAdminLibrary();
  const path = useAdminPath();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | BookStatus>('all');
  const [cat, setCat] = useState('all');
  const [provider, setProvider] = useState<'all' | StorageProvider>('all');
  const [format, setFormat] = useState<'all' | BookFileType>('all');
  const [toDelete, setToDelete] = useState<string | null>(null);

  const catName = (slug: string) => snap.categories.find((c) => c.slug === slug)?.name ?? slug;

  const rows = useMemo(() => {
    const n = normalizeAr(q);
    return snap.allBooks.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (cat !== 'all' && !b.categorySlugs.includes(cat)) return false;
      if (provider !== 'all' && !b.files.some((f) => f.provider === provider)) return false;
      if (format !== 'all' && !b.files.some((f) => f.fileType === format)) return false;
      if (!n) return true;
      const urls = b.files.map((f) => `${f.downloadUrl} ${f.readUrl ?? ''}`).join(' ');
      const hay = normalizeAr(
        [b.title, b.authorName, b.categorySlugs.map(catName).join(' '), b.isbn ?? '', b.id, urls, b.slug].join(' '),
      );
      return hay.includes(n);
    });
  }, [snap.allBooks, q, status, cat, provider, format]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = snap.records.find((r) => r.id === toDelete);

  async function confirmDelete() {
    if (!toDelete) return;
    await store.deleteBook(toDelete);
    toast('تم حذف الكتاب', 'success');
    setToDelete(null);
  }

  function duplicate(id: string) {
    const copy = store.duplicateBook(id);
    if (copy) toast('تم إنشاء نسخة (مسودة)', 'success');
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>الكتب</h1>
          <p className="muted">{rows.length} من {snap.allBooks.length} كتاب</p>
        </div>
        <Link to={path('books/new')} className="btn btn-primary"><PlusCircle size={17} /> إضافة كتاب</Link>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث: عنوان، مؤلف، تصنيف، ISBN، مُعرّف، رابط…"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">كل الحالات</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
          <option value="archived">مؤرشف</option>
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">كل التصنيفات</option>
          {snap.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
          <option value="all">كل المستضيفين</option>
          {SELECTABLE_PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
          <option value="all">كل الصيغ</option>
          <option value="pdf">PDF</option>
          <option value="epub">EPUB</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>الغلاف</th>
              <th>العنوان</th>
              <th>المؤلف</th>
              <th>التصنيف</th>
              <th>التخزين</th>
              <th>الرابط</th>
              <th>الحالة</th>
              <th>الظهور</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="table-cover"><Cover book={b} /></span>
                </td>
                <td>
                  <span className="table-title">{b.title}</span>
                  <span className="muted table-sub">/{b.slug}</span>
                </td>
                <td>{b.authorName}</td>
                <td>
                  {b.categorySlugs.map((s) => <span key={s} className="chip">{catName(s)}</span>)}
                </td>
                <td>
                  {b.files.length === 0 ? (
                    <span className="muted">—</span>
                  ) : (
                    b.files.map((f) => (
                      <span key={f.id} className="chip">{f.fileType.toUpperCase()} · {PROVIDER_LABEL[f.provider]}</span>
                    ))
                  )}
                </td>
                <td>
                  {b.files.length === 0 ? (
                    <span className="muted">—</span>
                  ) : b.files.some((f) => f.status === 'broken') ? (
                    <span className="chip chip--warn">⚠️ غير صالح</span>
                  ) : b.files.every((f) => f.status === 'active') ? (
                    <span className="chip chip--ok">✓ صالح</span>
                  ) : (
                    <span className="chip">⚠️ للتحقق</span>
                  )}
                </td>
                <td><StatusBadge status={b.status} /></td>
                <td><VisibilityBadge visibility={b.visibility} /></td>
                <td>
                  <div className="table-actions">
                    <Link to={`/livre/${b.slug}`} target="_blank" className="icon-btn" title="عرض"><Eye size={16} /></Link>
                    <Link to={path(`books/${b.id}/edit`)} className="icon-btn" title="تعديل"><Pencil size={16} /></Link>
                    <button className="icon-btn" title="تكرار" onClick={() => duplicate(b.id)}><Copy size={16} /></button>
                    <button className="icon-btn icon-btn--danger" title="حذف" onClick={() => setToDelete(b.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="admin-empty">لا توجد كتب مطابقة.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(toDelete)}
        title="حذف كتاب"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setToDelete(null)}>إلغاء</button>
            <button className="btn btn-danger" onClick={confirmDelete}>حذف نهائي</button>
          </>
        }
      >
        <p>هل تريد حذف «<strong>{target?.title}</strong>»؟ لا يمكن التراجع عن هذا الإجراء.</p>
        {target?.source === 'seed' && (
          <p className="admin-alert admin-alert--warn"><ExternalLink size={15} /> هذا كتاب من البيانات الأصلية؛ سيُحذف من مكتبتك المحلية فقط.</p>
        )}
      </Modal>
    </div>
  );
}
