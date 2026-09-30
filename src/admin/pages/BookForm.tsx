import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Send, Eye, ArrowRight, AlertTriangle, FileText, Image as ImageIcon, X, Search, Loader2, Star, ExternalLink, HelpCircle } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useAdminPath } from '../base';
import { useToast } from '../Toast';
import Dropzone from '../components/Dropzone';
import { putAsset } from '../../store/assets';
import { slugify, resolveFiles } from '../../store/derive';
import { SELECTABLE_PROVIDERS, PROVIDER_LABEL, PROVIDER_META, providerFromUrl, testLink, fetchLinkMeta, fileTypeFromUrl, isValidHttpUrl, type LinkTestResult } from '../../store/links';
import type { BookRecord, Contributor, BookStatus, Visibility, BookFile, StorageProvider, BookFileType } from '../../data/types';

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
  files: BookFile[];
  rightsConfirmed: boolean;
}

const emptyForm: FormState = {
  title: '', slug: '', contributors: [{ id: '', name: '', role: 'author' }],
  categorySlugs: [], language: 'العربية', yearOriginal: '', yearPublished: '',
  isbn: '', pages: '', words: '', teaser: '', description: '', authorBio: '',
  featured: false, status: 'draft', visibility: 'public',
  coverUrl: '', files: [], rightsConfirmed: false,
};

let fileSeq = 0;
const newFileId = () => `f-${Date.now().toString(36)}-${fileSeq++}`;

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
        files: resolveFiles(existing).map((f) => ({ ...f })),
        rightsConfirmed: Boolean(existing.rightsConfirmed),
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

  // ---- files manager ----
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [helpOpen, setHelpOpen] = useState<Record<string, boolean>>({});

  function addFileLink(provider: StorageProvider = 'onedrive') {
    set('files', [
      ...form.files,
      {
        id: newFileId(),
        provider,
        fileType: 'pdf',
        downloadUrl: '',
        readUrl: '',
        isPrimary: form.files.length === 0,
        status: 'unverified',
      },
    ]);
  }

  function updateFile(id: string, patch: Partial<BookFile>) {
    set('files', form.files.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFile(id: string) {
    const next = form.files.filter((f) => f.id !== id);
    if (next.length > 0 && !next.some((f) => f.isPrimary)) next[0].isPrimary = true;
    set('files', next);
  }

  function setPrimaryFile(id: string) {
    set('files', form.files.map((f) => ({ ...f, isPrimary: f.id === id })));
  }

  async function runTest(f: BookFile) {
    setTesting((t) => ({ ...t, [f.id]: true }));
    if (f.provider === 'local') {
      updateFile(f.id, { status: 'active' });
      setTesting((t) => ({ ...t, [f.id]: false }));
      toast('✓ ملف محلي', 'success');
      return;
    }
    // 1) verify the link
    const res: LinkTestResult = await testLink(f.downloadUrl);
    const patch: Partial<BookFile> = { status: res.status };
    let message = res.message;
    // 2) after verification, fetch real info from the book file (no faking)
    if (res.level !== 'error') {
      const meta = await fetchLinkMeta(f.downloadUrl);
      if (meta.fileType) patch.fileType = meta.fileType;
      if (meta.fileName && !f.fileName?.trim()) patch.fileName = meta.fileName;
      if (meta.fileSize) patch.fileSize = meta.fileSize;
      const bits: string[] = [];
      if (patch.fileName ?? f.fileName) bits.push((patch.fileName ?? f.fileName) as string);
      if (patch.fileType ?? f.fileType) bits.push(((patch.fileType ?? f.fileType) as string).toUpperCase());
      if (meta.fileSize) bits.push(humanSize(meta.fileSize));
      if (bits.length) message += ` — ${bits.join(' · ')}`;
      if (!meta.headersRead && !meta.fileSize) message += ' (تعذّر قراءة الحجم تلقائيًا بسبب قيود المضيف)';
    }
    updateFile(f.id, patch);
    setTesting((t) => ({ ...t, [f.id]: false }));
    toast(message, res.level === 'ok' ? 'success' : res.level === 'warn' ? 'info' : 'error');
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
  const filesWithUrl = form.files.filter((f) => f.downloadUrl.trim() || f.assetId);
  const hasChapters = Boolean(existing && existing.chapters.length > 0);
  const hasResource = filesWithUrl.length > 0 || hasChapters;

  function validate(forPublish: boolean): string[] {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push('العنوان مطلوب.');
    const authors = form.contributors.filter((c) => c.role === 'author' && c.name.trim());
    if (authors.length === 0) errs.push('يجب إضافة مؤلف واحد على الأقل.');
    if (form.categorySlugs.length === 0) errs.push('اختر تصنيفًا واحدًا على الأقل.');
    if (form.coverUrl && !isValidUrl(form.coverUrl)) errs.push('رابط الغلاف غير صالح.');
    // per-file URL validation
    for (const f of form.files) {
      if (f.provider === 'local') continue;
      const prov = PROVIDER_LABEL[f.provider];
      if (forPublish && !f.downloadUrl.trim()) errs.push(`رابط التحميل مطلوب (${f.fileType.toUpperCase()} · ${prov}).`);
      if (f.downloadUrl && !isValidHttpUrl(f.downloadUrl).ok) errs.push(`رابط التحميل غير صالح (${f.fileType.toUpperCase()} · ${prov}).`);
      if (f.readUrl && !isValidHttpUrl(f.readUrl).ok) errs.push(`رابط القراءة غير صالح (${f.fileType.toUpperCase()} · ${prov}).`);
    }
    // slug uniqueness
    const slug = slugify(form.slug || form.title);
    const dupe = snap.records.some((r) => r.slug === slug && r.id !== id);
    if (dupe) errs.push('المُعرّف (slug) مستخدم بالفعل — سيتم توليد معرّف فريد تلقائيًا.');
    if (forPublish) {
      if (!hasCover) errs.push('يجب توفير غلاف قبل النشر.');
      if (!hasResource) errs.push('يجب توفير ملف (PDF/EPUB) أو رابط خارجي قبل النشر.');
      if (filesWithUrl.length > 0 && !form.rightsConfirmed) errs.push('يجب تأكيد امتلاك حقوق التوزيع قبل نشر الملفات.');
    }
    return errs;
  }

  function cleanFiles(): BookFile[] {
    const files = form.files.filter((f) => f.downloadUrl.trim() || f.assetId);
    if (files.length > 0 && !files.some((f) => f.isPrimary)) files[0].isPrimary = true;
    const now = new Date().toISOString();
    return files.map((f) => ({
      ...f,
      downloadUrl: f.downloadUrl.trim(),
      readUrl: f.readUrl?.trim() || undefined,
      fileName: f.fileName || (f.downloadUrl ? f.downloadUrl.split('/').pop()?.split('?')[0] : undefined),
      provider: f.provider,
      updatedAt: now,
      createdAt: f.createdAt ?? now,
    }));
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
      files: cleanFiles(),
      rightsConfirmed: form.rightsConfirmed,
      // legacy single-file fields intentionally cleared (migrated into `files`)
      fileUrl: undefined,
      fileAssetId: undefined,
      fileMeta: undefined,
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
            <h2 className="form-section-title"><FileText size={17} /> 📁 ملفات الكتاب</h2>
            <p className="muted" style={{ marginTop: -6, marginBottom: 12, fontSize: 13 }}>
              أضف PDF و/أو EPUB عبر <strong>OneDrive</strong> (تخزين) أو <strong>Up-4ever</strong> (تحميل). لا تُخزَّن الملفات داخل الموقع — تُحفظ الروابط فقط.
            </p>

            {form.files.length === 0 && (
              <p className="muted" style={{ marginBottom: 12 }}>لا توجد ملفات بعد.</p>
            )}

            <div className="filecard-list">
              {form.files.map((f) => {
                const statusChip = f.status === 'active'
                  ? <span className="chip chip--ok">✓ صالح</span>
                  : f.status === 'broken'
                    ? <span className="chip chip--warn">⚠️ رابط غير صالح</span>
                    : <span className="chip">⚠️ للتحقق</span>;
                return (
                  <div className="filecard" key={f.id}>
                    <div className="filecard-head">
                      <label className="filecard-primary" title="الملف الرئيسي">
                        <input type="radio" name="primaryFile" checked={Boolean(f.isPrimary)} onChange={() => setPrimaryFile(f.id)} />
                        <Star size={14} className={f.isPrimary ? 'txt-amber' : ''} />
                      </label>
                      {statusChip}
                      <button className="icon-btn icon-btn--danger" style={{ marginInlineStart: 'auto' }} onClick={() => removeFile(f.id)}><Trash2 size={15} /></button>
                    </div>
                    <div className="field-row">
                      <label className="field"><span className="field-label">الصيغة</span>
                        <select value={f.fileType} onChange={(e) => updateFile(f.id, { fileType: e.target.value as BookFileType })}>
                          <option value="pdf">PDF</option>
                          <option value="epub">EPUB</option>
                        </select>
                      </label>
                      <label className="field"><span className="field-label">المستضيف</span>
                        <select value={f.provider} onChange={(e) => updateFile(f.id, { provider: e.target.value as StorageProvider })} disabled={f.provider === 'local'}>
                          {SELECTABLE_PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDER_META[p]?.icon} {PROVIDER_LABEL[p]}</option>)}
                          {!SELECTABLE_PROVIDERS.includes(f.provider) && <option value={f.provider}>{PROVIDER_LABEL[f.provider]} (قديم)</option>}
                        </select>
                      </label>
                    </div>
                    {f.provider === 'local' ? (
                      <div className="file-chip" style={{ marginTop: 6 }}>
                        <FileText size={18} />
                        <div>
                          <strong>{f.fileName}</strong>
                          <small className="muted">{f.fileType.toUpperCase()}{f.fileSize ? ` · ${humanSize(f.fileSize)}` : ''}</small>
                        </div>
                      </div>
                    ) : (
                      <>
                        {PROVIDER_META[f.provider] && (
                          <div className="provider-banner">
                            <span className="provider-banner-title">
                              {PROVIDER_META[f.provider]!.icon} {PROVIDER_META[f.provider]!.label}
                              <button type="button" className="link-btn" style={{ marginInlineStart: 'auto' }}
                                onClick={() => setHelpOpen((h) => ({ ...h, [f.id]: !h[f.id] }))}>
                                <HelpCircle size={13} /> كيفية الحصول على الرابط
                              </button>
                            </span>
                            <span className="muted">{PROVIDER_META[f.provider]!.hint}</span>
                            {helpOpen[f.id] && PROVIDER_META[f.provider]?.helpSteps && (
                              <ol className="provider-help">
                                {PROVIDER_META[f.provider]!.helpSteps.map((s, i) => <li key={i} dir="rtl">{s}</li>)}
                              </ol>
                            )}
                          </div>
                        )}
                        <label className="field"><span className="field-label">رابط التحميل (download_url) *</span>
                          <div className="input-with-btn">
                            <input className="mono-input" dir="ltr" value={f.downloadUrl}
                              onChange={(e) => updateFile(f.id, { downloadUrl: e.target.value, fileType: fileTypeFromUrl(e.target.value) ?? f.fileType, status: 'unverified' })}
                              placeholder={PROVIDER_META[f.provider]?.urlPlaceholder ?? 'https://…'} />
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => runTest(f)} disabled={testing[f.id] || !f.downloadUrl}>
                              {testing[f.id] ? <Loader2 size={14} className="spin" /> : <Search size={14} />} اختبار
                            </button>
                            <a className={`btn btn-outline btn-sm ${f.downloadUrl && isValidHttpUrl(f.downloadUrl).ok ? '' : 'is-disabled'}`}
                              href={f.downloadUrl || undefined} target="_blank" rel="noopener noreferrer" title="فتح الرابط في تبويب جديد للتحقق">
                              <ExternalLink size={14} /> فتح
                            </a>
                          </div>
                          {(() => {
                            const url = f.downloadUrl.trim();
                            if (!url) return null;
                            const v = isValidHttpUrl(url);
                            if (!v.ok) return <small className="field-note field-note--err">⚠️ رابط غير صالح.</small>;
                            if (!v.https) return <small className="field-note field-note--warn">⚠️ الرابط ليس HTTPS.</small>;
                            const detected = providerFromUrl(url);
                            if (SELECTABLE_PROVIDERS.includes(detected) && detected !== f.provider) {
                              return (
                                <small className="field-note field-note--warn">
                                  يبدو أن هذا الرابط من {PROVIDER_LABEL[detected]}.{' '}
                                  <button type="button" className="link-btn" onClick={() => updateFile(f.id, { provider: detected })}>
                                    تبديل المستضيف إلى {PROVIDER_LABEL[detected]}
                                  </button>
                                </small>
                              );
                            }
                            return <small className="field-note field-note--ok">✓ الرابط يطابق المستضيف المحدد.</small>;
                          })()}
                        </label>
                        <label className="field"><span className="field-label">رابط القراءة (اختياري)</span>
                          <input className="mono-input" dir="ltr" value={f.readUrl ?? ''}
                            onChange={(e) => updateFile(f.id, { readUrl: e.target.value })} placeholder="https://… (قراءة أونلاين)" />
                        </label>
                        <label className="field"><span className="field-label">اسم الملف (اختياري)</span>
                          <input value={f.fileName ?? ''}
                            onChange={(e) => updateFile(f.id, { fileName: e.target.value })} placeholder="مثال: كتاب-١٩٨٤.pdf" />
                        </label>
                        {(f.fileName || f.fileSize) && (
                          <p className="file-meta-note">
                            <FileText size={13} /> معلومات مُستخرَجة:
                            {' '}{f.fileType.toUpperCase()}
                            {f.fileSize ? ` · ${humanSize(f.fileSize)}` : ''}
                            {f.fileName ? ` · ${f.fileName}` : ''}
                          </p>
                        )}
                        {f.provider === 'onedrive' && (
                          <>
                            <label className="field"><span className="field-label">معرّف ملف OneDrive (اختياري)</span>
                              <input className="mono-input" dir="ltr" value={f.externalFileId ?? ''}
                                onChange={(e) => updateFile(f.id, { externalFileId: e.target.value })} placeholder="OneDrive item id (لتكامل Microsoft Graph مستقبلًا)" />
                            </label>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled
                              title="يتطلب إعداد Microsoft Graph من جهة الخادم (غير مُفعّل)"
                            >
                              📁 اختيار من OneDrive (يتطلب إعداد Graph)
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-outline btn-sm" onClick={() => addFileLink('onedrive')}>☁️ إضافة ملف OneDrive</button>
              <button className="btn btn-outline btn-sm" onClick={() => addFileLink('up4ever')}>📥 إضافة ملف Up-4ever</button>
            </div>

            {filesWithUrl.length > 0 && (
              <label className={`rights-box ${form.rightsConfirmed ? 'is-on' : ''}`}>
                <input type="checkbox" checked={form.rightsConfirmed} onChange={(e) => set('rightsConfirmed', e.target.checked)} />
                <span>أؤكد امتلاكي الحقوق اللازمة لتوزيع هذا الملف، والتزامي بشروط المستضيف وحقوق النشر.</span>
              </label>
            )}

            {hasChapters && (
              <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                يحتوي هذا الكتاب على {existing?.chapters.length} فصل قراءة خارجي محفوظ.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
