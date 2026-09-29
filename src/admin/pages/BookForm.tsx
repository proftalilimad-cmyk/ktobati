import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Send, Eye, ArrowRight, AlertTriangle, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useAdminPath } from '../base';
import { useToast } from '../Toast';
import Dropzone from '../components/Dropzone';
import { putAsset, fileFormat } from '../../store/assets';
import { slugify } from '../../store/derive';
import type { BookRecord, Contributor, BookStatus, Visibility, FileMeta } from '../../data/types';

const roleLabels: Record<Contributor['role'], string> = {
  author: 'تأليف',
  translator: 'ترجمة',
  reviewer: 'مراجعة',
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isValidUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface FormState {
  title: string;
  slug: string;
  contributors: Contributor[];
  categorySlugs: string[];
  language: string;
  yearOriginal: string;
  yearPublished: string;
  isbn: string;
  pages: string;
  words: string;
  teaser: string;
  description: string;
  authorBio: string;
  featured: boolean;
  status: BookStatus;
  visibility: Visibility;
  coverUrl: string;
  coverAssetId?: string;
  fileUrl: string;
  fileAssetId?: string;
  fileMeta?: FileMeta;
}

const emptyForm: FormState = {
  title: '', slug: '', contributors: [{ id: '', name: '', role: 'author' }],
  categorySlugs: [], language: 'العربية', yearOriginal: '', yearPublished: '',
  isbn: '', pages: '', words: '', teaser: '', description: '', authorBio: '',
  featured: false, status: 'draft', visibility: 'public',
  coverUrl: '', fileUrl: '',
};

export default function BookForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { snap, store } = useAdminLibrary();
  const path = useAdminPath();
  const navigate = useNavigate();
  const { toast } = useToast();

  const existing = editing ? snap.records.find((r) => r.id === id) : undefined;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [coverPreview, setCoverPreview] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        slug: existing.slug ?? slugify(existing.title),
        contributors: existing.contributors.length ? existing.contributors.map((c) => ({ ...c })) : [{ id: '', name: '', role: 'author' }],
        categorySlugs: [...existing.categorySlugs],
        language: existing.language,
        yearOriginal: existing.yearOriginal ?? '',
        yearPublished: existing.yearPublished ?? '',
        isbn: existing.isbn ?? '',
        pages: existing.pages?.toString() ?? '',
        words: existing.words?.toString() ?? '',
        teaser: existing.teaser,
        description: existing.description,
        authorBio: existing.authorBio ?? '',
        featured: Boolean(existing.featured),
        status: existing.status ?? 'draft',
        visibility: existing.visibility ?? 'public',
        coverUrl: existing.coverUrl ?? '',
        coverAssetId: existing.coverAssetId,
        fileUrl: existing.fileUrl ?? '',
        fileAssetId: existing.fileAssetId,
        fileMeta: existing.fileMeta,
      });
      setSlugTouched(true);
    }
  }, [existing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // auto-slug
  useEffect(() => {
    if (!slugTouched && form.title) set('slug', slugify(form.title));
  }, [form.title, slugTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  const seedCover = existing && /^\d{6,}$/.test(existing.id) ? `https://downloads.hindawi.org/covers/svg/270x360/${existing.id}.svg` : '';
  const shownCover = coverPreview || form.coverUrl || seedCover;

  async function onCover(file: File) {
    const ok = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ok) { toast('صيغة الغلاف غير مدعومة (JPG/PNG/WEBP)', 'error'); return; }
    const assetId = store.newId();
    await putAsset(assetId, file);
    set('coverAssetId', assetId);
    set('coverUrl', '');
    setCoverPreview(URL.createObjectURL(file));
    toast('تم رفع الغلاف', 'success');
  }

  async function onFile(file: File) {
    const ok = /\.(pdf|epub)$/i.test(file.name);
    if (!ok) { toast('صيغة الملف غير مدعومة (PDF/EPUB)', 'error'); return; }
    const assetId = store.newId();
    await putAsset(assetId, file);
    set('fileAssetId', assetId);
    set('fileUrl', '');
    set('fileMeta', { name: file.name, size: file.size, format: fileFormat(file.name), importedAt: new Date().toISOString() });
    toast('تم رفع الملف', 'success');
  }

  function addContributor() {
    set('contributors', [...form.contributors, { id: '', name: '', role: 'author' }]);
  }
  function updateContributor(i: number, patch: Partial<Contributor>) {
    set('contributors', form.contributors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeContributor(i: number) {
    set('contributors', form.contributors.filter((_, idx) => idx !== i));
  }
  function toggleCategory(slug: string) {
    set('categorySlugs', form.categorySlugs.includes(slug)
      ? form.categorySlugs.filter((s) => s !== slug)
      : [...form.categorySlugs, slug]);
  }

  const hasCover = Boolean(form.coverAssetId || form.coverUrl || seedCover);
  const hasResource = Boolean(form.fileAssetId || form.fileUrl || (existing && existing.chapters.length > 0));

  function validate(forPublish: boolean): string[] {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push('العنوان مطلوب.');
    const authors = form.contributors.filter((c) => c.role === 'author' && c.name.trim());
    if (authors.length === 0) errs.push('يجب إضافة مؤلف واحد على الأقل.');
    if (form.categorySlugs.length === 0) errs.push('اختر تصنيفًا واحدًا على الأقل.');
    if (form.coverUrl && !isValidUrl(form.coverUrl)) errs.push('رابط الغلاف غير صالح.');
    if (form.fileUrl && !isValidUrl(form.fileUrl)) errs.push('رابط الملف غير صالح.');
    // slug uniqueness
    const slug = slugify(form.slug || form.title);
    const dupe = snap.records.some((r) => r.slug === slug && r.id !== id);
    if (dupe) errs.push('المُعرّف (slug) مستخدم بالفعل — سيتم توليد معرّف فريد تلقائيًا.');
    if (forPublish) {
      if (!hasCover) errs.push('يجب توفير غلاف قبل النشر.');
      if (!hasResource) errs.push('يجب توفير ملف (PDF/EPUB) أو رابط خارجي قبل النشر.');
    }
    return errs;
  }

  function buildRecord(status: BookStatus): Omit<BookRecord, 'id'> {
    const contributors = form.contributors
      .filter((c) => c.name.trim())
      .map((c, i) => ({ id: c.id || `c-${slugify(c.name)}-${i}`, name: c.name.trim(), role: c.role }));
    return {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      contributors,
      categorySlugs: form.categorySlugs,
      teaser: form.teaser.trim(),
      description: form.description.trim(),
      language: form.language.trim() || 'العربية',
      yearOriginal: form.yearOriginal.trim() || undefined,
      yearPublished: form.yearPublished.trim() || undefined,
      isbn: form.isbn.trim() || undefined,
      pages: form.pages ? Number(form.pages) : undefined,
      words: form.words ? Number(form.words) : undefined,
      authorBio: form.authorBio.trim() || undefined,
      featured: form.featured,
      chapters: existing?.chapters ?? [],
      status,
      visibility: form.visibility,
      coverUrl: form.coverUrl.trim() || undefined,
      coverAssetId: form.coverAssetId,
      fileUrl: form.fileUrl.trim() || undefined,
      fileAssetId: form.fileAssetId,
      fileMeta: form.fileMeta,
    };
  }

  function save(status: BookStatus) {
    const errs = validate(status === 'published');
    const blocking = errs.filter((e) => !e.includes('سيتم توليد'));
    if (status === 'published' && blocking.length > 0) {
      setErrors(errs);
      toast('تعذّر النشر — تحقّق من الحقول المطلوبة', 'error');
      return;
    }
    if (status !== 'published' && !form.title.trim()) {
      setErrors(['العنوان مطلوب.']);
      return;
    }
    setErrors([]);
    const rec = buildRecord(status);
    if (editing && id) {
      store.updateBook(id, rec);
      toast(status === 'published' ? 'تم تحديث الكتاب ونشره' : 'تم حفظ التعديلات', 'success');
    } else {
      store.addBook(rec);
      toast(status === 'published' ? 'تم نشر الكتاب' : 'تم حفظ المسودة', 'success');
    }
    navigate(path('books'));
  }

  const cats = useMemo(() => snap.categories, [snap.categories]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <Link to={path('books')} className="link-back"><ArrowRight size={16} /> رجوع إلى الكتب</Link>
          <h1>{editing ? 'تعديل كتاب' : 'إضافة كتاب جديد'}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {editing && (
            <Link to={`/livre/${form.slug}`} target="_blank" className="btn btn-outline"><Eye size={16} /> معاينة</Link>
          )}
          <button className="btn btn-outline" onClick={() => save('draft')}><Save size={16} /> حفظ كمسودة</button>
          <button className="btn btn-primary" onClick={() => save('published')}><Send size={16} /> نشر</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="admin-alert admin-alert--error">
          <AlertTriangle size={16} />
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="form-grid">
        {/* main column */}
        <div className="form-col">
          <section className="admin-card">
            <h2 className="form-section-title">معلومات عامة</h2>
            <label className="field">
              <span className="field-label">العنوان *</span>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="عنوان الكتاب" />
            </label>
            <label className="field">
              <span className="field-label">المُعرّف (slug) — رابط عام /livre/…</span>
              <input value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} placeholder="auto" dir="ltr" />
            </label>

            <div className="field">
              <span className="field-label">المساهمون *</span>
              {form.contributors.map((c, i) => (
                <div className="contributor-row" key={i}>
                  <input value={c.name} onChange={(e) => updateContributor(i, { name: e.target.value })} placeholder="الاسم" />
                  <select value={c.role} onChange={(e) => updateContributor(i, { role: e.target.value as Contributor['role'] })}>
                    {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="icon-btn icon-btn--danger" onClick={() => removeContributor(i)} disabled={form.contributors.length === 1}><Trash2 size={15} /></button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={addContributor}><Plus size={15} /> إضافة مساهم</button>
            </div>

            <label className="field">
              <span className="field-label">اقتباس / تشويق قصير</span>
              <textarea rows={2} value={form.teaser} onChange={(e) => set('teaser', e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">النبذة / الوصف</span>
              <textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">عن المؤلف</span>
              <textarea rows={3} value={form.authorBio} onChange={(e) => set('authorBio', e.target.value)} />
            </label>
          </section>

          <section className="admin-card">
            <h2 className="form-section-title">التصنيفات *</h2>
            <div className="cat-checks">
              {cats.map((c) => (
                <label key={c.slug} className={`cat-check ${form.categorySlugs.includes(c.slug) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={form.categorySlugs.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
                  <span>{c.icon} {c.name}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <h2 className="form-section-title">تفاصيل إضافية</h2>
            <div className="field-row">
              <label className="field"><span className="field-label">اللغة</span><input value={form.language} onChange={(e) => set('language', e.target.value)} /></label>
              <label className="field"><span className="field-label">سنة التأليف</span><input value={form.yearOriginal} onChange={(e) => set('yearOriginal', e.target.value)} dir="ltr" /></label>
              <label className="field"><span className="field-label">سنة النشر</span><input value={form.yearPublished} onChange={(e) => set('yearPublished', e.target.value)} dir="ltr" /></label>
            </div>
            <div className="field-row">
              <label className="field"><span className="field-label">ISBN</span><input value={form.isbn} onChange={(e) => set('isbn', e.target.value)} dir="ltr" /></label>
              <label className="field"><span className="field-label">عدد الصفحات</span><input value={form.pages} onChange={(e) => set('pages', e.target.value)} dir="ltr" inputMode="numeric" /></label>
              <label className="field"><span className="field-label">عدد الكلمات</span><input value={form.words} onChange={(e) => set('words', e.target.value)} dir="ltr" inputMode="numeric" /></label>
            </div>
          </section>
        </div>

        {/* side column */}
        <div className="form-col">
          <section className="admin-card">
            <h2 className="form-section-title">النشر</h2>
            <label className="field">
              <span className="field-label">الحالة</span>
              <select value={form.status} onChange={(e) => set('status', e.target.value as BookStatus)}>
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
                <option value="archived">مؤرشف</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">الظهور</span>
              <select value={form.visibility} onChange={(e) => set('visibility', e.target.value as Visibility)}>
                <option value="public">عام</option>
                <option value="private">خاص</option>
              </select>
            </label>
            <label className="switch-field">
              <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
              <span>كتاب مميّز ⭐</span>
            </label>
          </section>

          <section className="admin-card">
            <h2 className="form-section-title"><ImageIcon size={17} /> الغلاف</h2>
            {shownCover ? (
              <div className="cover-preview">
                <img src={shownCover} alt="معاينة الغلاف" />
                <button className="btn btn-outline btn-sm" onClick={() => { setCoverPreview(''); set('coverAssetId', undefined); set('coverUrl', ''); }}>
                  <X size={14} /> إزالة
                </button>
              </div>
            ) : (
              <Dropzone accept=".jpg,.jpeg,.png,.webp" hint="JPG / JPEG / PNG / WEBP" icon={<ImageIcon size={24} />} onFile={onCover} />
            )}
            <div className="or-sep"><span>أو رابط خارجي</span></div>
            <input
              className="mono-input"
              dir="ltr"
              value={form.coverUrl}
              onChange={(e) => { set('coverUrl', e.target.value); set('coverAssetId', undefined); setCoverPreview(''); }}
              placeholder="https://…/cover.jpg"
            />
          </section>

          <section className="admin-card">
            <h2 className="form-section-title"><FileText size={17} /> ملف الكتاب</h2>
            {form.fileMeta ? (
              <div className="file-chip">
                <FileText size={20} />
                <div>
                  <strong>{form.fileMeta.name}</strong>
                  <small className="muted">{form.fileMeta.format} · {humanSize(form.fileMeta.size)}</small>
                </div>
                <button className="icon-btn icon-btn--danger" onClick={() => { set('fileAssetId', undefined); set('fileMeta', undefined); }}><X size={15} /></button>
              </div>
            ) : (
              <Dropzone accept=".pdf,.epub" hint="PDF / EPUB" icon={<FileText size={24} />} onFile={onFile} />
            )}
            <div className="or-sep"><span>أو رابط خارجي (لا تستخدم روابط وهمية)</span></div>
            <input
              className="mono-input"
              dir="ltr"
              value={form.fileUrl}
              onChange={(e) => { set('fileUrl', e.target.value); set('fileAssetId', undefined); set('fileMeta', undefined); }}
              placeholder="https://…/book.pdf"
            />
            {existing && existing.chapters.length > 0 && (
              <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                يحتوي هذا الكتاب على {existing.chapters.length} فصل قراءة خارجي محفوظ.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
