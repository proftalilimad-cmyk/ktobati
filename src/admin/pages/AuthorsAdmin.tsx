import { useMemo, useState } from 'react';
import { Search, Pencil, PlusCircle, Globe, MapPin } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useToast } from '../Toast';
import Modal from '../components/Modal';
import { normalizeAr } from '../../utils/search';
import type { AuthorMeta } from '../../data/types';

const blank: AuthorMeta = { id: '', name: '', bio: '', photo: '', country: '', website: '' };

export default function AuthorsAdmin() {
  const { snap, store } = useAdminLibrary();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AuthorMeta | null>(null);

  const rows = useMemo(() => {
    const n = normalizeAr(q);
    return snap.authors.filter((a) => !n || normalizeAr(a.name).includes(n));
  }, [snap.authors, q]);

  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { toast('الاسم مطلوب', 'error'); return; }
    store.upsertAuthor(editing);
    toast('تم حفظ بيانات المؤلف', 'success');
    setEditing(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>المؤلفون</h1>
          <p className="muted">{snap.authors.length} مؤلف — الاسم، السيرة، الصورة، البلد، الموقع</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...blank })}><PlusCircle size={17} /> مؤلف جديد</button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن مؤلف…" />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>الاسم</th><th>البلد</th><th>الموقع</th><th>عدد الكتب</th><th>إجراءات</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <span className="table-title">{a.name}</span>
                  {a.bio && <span className="muted table-sub">{a.bio.slice(0, 70)}…</span>}
                </td>
                <td>{a.country ? <span className="chip"><MapPin size={13} /> {a.country}</span> : '—'}</td>
                <td>{a.website ? <a href={a.website} target="_blank" rel="noreferrer" className="link-more"><Globe size={14} /> رابط</a> : '—'}</td>
                <td>{a.bookIds.length}</td>
                <td>
                  <button className="icon-btn" title="تعديل" onClick={() => setEditing({ id: a.id, name: a.name, bio: a.bio ?? '', photo: a.photo ?? '', country: a.country ?? '', website: a.website ?? '' })}><Pencil size={16} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="admin-empty">لا يوجد مؤلفون.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'تعديل مؤلف' : 'مؤلف جديد'}
        onClose={() => setEditing(null)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setEditing(null)}>إلغاء</button>
          <button className="btn btn-primary" onClick={save}>حفظ</button>
        </>}
      >
        {editing && (
          <div className="form-col">
            <label className="field"><span className="field-label">الاسم *</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="field"><span className="field-label">نبذة</span>
              <textarea rows={4} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
            </label>
            <div className="field-row">
              <label className="field"><span className="field-label">البلد</span>
                <input value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
              </label>
              <label className="field"><span className="field-label">الموقع</span>
                <input dir="ltr" value={editing.website} onChange={(e) => setEditing({ ...editing, website: e.target.value })} placeholder="https://…" />
              </label>
            </div>
            <label className="field"><span className="field-label">صورة (رابط)</span>
              <input dir="ltr" value={editing.photo} onChange={(e) => setEditing({ ...editing, photo: e.target.value })} placeholder="https://…" />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
