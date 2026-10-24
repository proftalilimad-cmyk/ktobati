import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, Power } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useToast } from '../Toast';
import Modal from '../components/Modal';
import { slugify } from '../../store/derive';
import type { Category } from '../../data/types';

const blank: Category = { slug: '', name: '', icon: '📚', description: '', group: 'عام', active: true };

export default function CategoriesAdmin() {
  const { snap, store } = useAdminLibrary();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  function openNew() { setEditing({ ...blank }); setIsNew(true); }
  function openEdit(c: Category) { setEditing({ ...c }); setIsNew(false); }

  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { toast('الاسم مطلوب', 'error'); return; }
    const slug = editing.slug.trim() || slugify(editing.name);
    if (isNew) {
      const res = store.addCategory({ ...editing, slug });
      if (!res.ok) { toast(res.error ?? 'خطأ', 'error'); return; }
      toast('تمت إضافة التصنيف', 'success');
    } else {
      store.updateCategory(editing.slug, editing);
      toast('تم تحديث التصنيف', 'success');
    }
    setEditing(null);
  }

  function confirmDelete() {
    if (!toDelete) return;
    const res = store.deleteCategory(toDelete.slug);
    if (!res.ok) toast(res.error ?? 'تعذّر الحذف', 'error');
    else toast('تم حذف التصنيف', 'success');
    setToDelete(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>التصنيفات</h1>
          <p className="muted">{snap.categories.length} تصنيف — إدارة ديناميكية تظهر مباشرة على الموقع</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><PlusCircle size={17} /> تصنيف جديد</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>الأيقونة</th><th>الاسم</th><th>المُعرّف</th><th>المجموعة</th><th>عدد الكتب</th><th>الحالة</th><th>إجراءات</th></tr>
          </thead>
          <tbody>
            {snap.categories.map((c) => {
              const count = store.categoryInUse(c.slug);
              return (
                <tr key={c.slug}>
                  <td style={{ fontSize: 22 }}>{c.icon}</td>
                  <td><span className="table-title">{c.name}</span><span className="muted table-sub">{c.description}</span></td>
                  <td dir="ltr">{c.slug}</td>
                  <td>{c.group}</td>
                  <td>{count}</td>
                  <td>
                    <span className={`st-badge ${c.active !== false ? 'st-public' : 'st-private'}`}>
                      {c.active !== false ? 'مفعّل' : 'معطّل'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" title="تفعيل/تعطيل" onClick={() => store.toggleCategory(c.slug)}><Power size={16} /></button>
                      <button className="icon-btn" title="تعديل" onClick={() => openEdit(c)}><Pencil size={16} /></button>
                      <button className="icon-btn icon-btn--danger" title="حذف" onClick={() => setToDelete(c)} disabled={count > 0}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(editing)}
        title={isNew ? 'تصنيف جديد' : 'تعديل تصنيف'}
        onClose={() => setEditing(null)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setEditing(null)}>إلغاء</button>
          <button className="btn btn-primary" onClick={save}>حفظ</button>
        </>}
      >
        {editing && (
          <div className="form-col">
            <div className="field-row">
              <label className="field"><span className="field-label">الاسم *</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: isNew && !editing.slug ? '' : editing.slug })} />
              </label>
              <label className="field"><span className="field-label">الأيقونة (إيموجي)</span>
                <input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
              </label>
            </div>
            <label className="field"><span className="field-label">المُعرّف (slug)</span>
              <input dir="ltr" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto" disabled={!isNew} />
            </label>
            <label className="field"><span className="field-label">المجموعة</span>
              <input value={editing.group} onChange={(e) => setEditing({ ...editing, group: e.target.value })} />
            </label>
            <label className="field"><span className="field-label">الوصف</span>
              <textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <label className="field"><span className="field-label">صورة (رابط اختياري)</span>
              <input dir="ltr" value={editing.image ?? ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://…" />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        title="حذف تصنيف"
        onClose={() => setToDelete(null)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setToDelete(null)}>إلغاء</button>
          <button className="btn btn-danger" onClick={confirmDelete}>حذف</button>
        </>}
      >
        <p>حذف «<strong>{toDelete?.name}</strong>»؟</p>
      </Modal>
    </div>
  );
}
