import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useAdminPath } from '../base';
import { useToast } from '../Toast';
import { slugify } from '../../store/derive';
import { providerFromUrl, fileTypeFromUrl } from '../../store/links';
import type { BookRecord, BookStatus, Visibility, BookFile } from '../../data/types';

const COLUMNS = ['title', 'author', 'category', 'file_type', 'storage_provider', 'download_url', 'read_url', 'description', 'language', 'year'];
const SAMPLE = `title,author,category,file_type,storage_provider,download_url,read_url,description,language,year
1984,George Orwell,روايات,pdf,onedrive,https://1drv.ms/xxxx,,رواية ديستوبية,العربية,1949
الأمير الصغير,أنطوان دو سانت إكزوبيري,أدب,epub,up4ever,https://up-4ever.net/xxxx,,حكاية فلسفية,العربية,1943`;

const STEPS = ['رفع الملف', 'مطابقة الأعمدة', 'التحقق', 'التصنيفات', 'إعدادات النشر', 'تأكيد', 'النتيجة'];

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function isValidUrl(u: string): boolean {
  if (!u) return true;
  try { const url = new URL(u); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
}

export default function ImportBooks() {
  const { snap, store } = useAdminLibrary();
  const path = useAdminPath();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [raw, setRaw] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<BookStatus>('published');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [autoCreateCats, setAutoCreateCats] = useState(true);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);

  function loadText(text: string) {
    setRaw(text);
    const { headers: h, rows } = parseCsv(text);
    setHeaders(h);
    setRawRows(rows);
    // auto-map by exact name
    const m: Record<string, string> = {};
    for (const col of COLUMNS) {
      const found = h.find((x) => x.toLowerCase() === col.toLowerCase());
      if (found) m[col] = found;
    }
    setMapping(m);
  }

  function onUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  const catByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of snap.categories) {
      map.set(c.name.trim().toLowerCase(), c.slug);
      map.set(c.slug.toLowerCase(), c.slug);
    }
    return map;
  }, [snap.categories]);

  const parsed: ParsedRow[] = useMemo(() => {
    const col = (row: string[], key: string) => {
      const header = mapping[key];
      const idx = header ? headers.indexOf(header) : -1;
      return idx >= 0 ? (row[idx] ?? '').trim() : '';
    };
    return rawRows.map((row) => {
      const data: Record<string, string> = {};
      for (const c of COLUMNS) data[c] = col(row, c);
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!data.title) errors.push('العنوان مفقود');
      if (!data.author) errors.push('المؤلف مفقود');
      if (!data.category) warnings.push('لا يوجد تصنيف');
      else if (!catByName.has(data.category.trim().toLowerCase())) warnings.push(`تصنيف جديد: «${data.category}»`);
      const provider = data.storage_provider?.trim().toLowerCase();
      if (provider && provider !== 'onedrive' && provider !== 'up4ever') errors.push('المستضيف يجب أن يكون onedrive أو up4ever');
      const ft = data.file_type?.trim().toLowerCase();
      if (ft && ft !== 'pdf' && ft !== 'epub') errors.push('الصيغة يجب أن تكون pdf أو epub');
      if (data.download_url && provider && !isValidUrl(data.download_url)) errors.push('رابط التحميل غير صالح');
      if (data.download_url && !provider) warnings.push('رابط تحميل بدون مستضيف — سيُكتشف تلقائيًا');
      if (!isValidUrl(data.read_url)) errors.push('رابط القراءة غير صالح');
      if (!data.download_url && !data.read_url) warnings.push('لا يوجد رابط قراءة أو تحميل');
      if (data.year && !/^\d{3,4}$/.test(data.year)) warnings.push('سنة غير صحيحة');
      return { data, errors, warnings };
    });
  }, [rawRows, mapping, headers, catByName]);

  const validRows = parsed.filter((r) => r.errors.length === 0);
  const newCats = useMemo(() => {
    const set = new Set<string>();
    for (const r of parsed) {
      if (r.errors.length) continue;
      const c = r.data.category?.trim();
      if (c && !catByName.has(c.toLowerCase())) set.add(c);
    }
    return [...set];
  }, [parsed, catByName]);

  async function runImport() {
    setStep(6);
    // create new categories first
    if (autoCreateCats) {
      for (const name of newCats) {
        const slug = slugify(name);
        if (!snap.categories.some((c) => c.slug === slug)) {
          store.addCategory({ slug, name, icon: '📚', description: '', group: 'مستورد', active: true });
        }
      }
    }
    const now = new Date().toISOString();
    const records: Array<Omit<BookRecord, 'id'>> = validRows.map((r, ri) => {
      const d = r.data;
      const catSlug = catByName.get(d.category?.trim().toLowerCase()) ?? (autoCreateCats && d.category ? slugify(d.category) : '');
      const chapters = d.read_url ? [{ title: 'قراءة الكتاب', url: d.read_url }] : [];
      const provRaw = d.storage_provider?.trim().toLowerCase();
      const provider = provRaw === 'onedrive' || provRaw === 'up4ever' ? provRaw : providerFromUrl(d.download_url);
      const ftRaw = d.file_type?.trim().toLowerCase();
      const fileType = ftRaw === 'pdf' || ftRaw === 'epub' ? ftRaw : (fileTypeFromUrl(d.download_url) ?? 'pdf');
      const files: BookFile[] = d.download_url
        ? [{
            id: `imp-${ri}-${now}`,
            provider,
            fileType,
            downloadUrl: d.download_url,
            readUrl: d.read_url || undefined,
            isPrimary: true,
            status: 'unverified',
            createdAt: now,
          }]
        : [];
      return {
        title: d.title,
        contributors: [{ id: `c-${slugify(d.author)}`, name: d.author, role: 'author' as const }],
        categorySlugs: catSlug ? [catSlug] : [],
        teaser: d.description?.slice(0, 120) ?? '',
        description: d.description ?? '',
        language: d.language || 'العربية',
        yearOriginal: d.year || undefined,
        chapters,
        files,
        rightsConfirmed,
        status,
        visibility,
        slug: slugify(d.title),
      };
    });

    // simulate progress for UX
    for (let i = 0; i <= records.length; i++) {
      setProgress(Math.round((i / Math.max(1, records.length)) * 100));
      await new Promise((res) => setTimeout(res, 40));
    }
    const n = store.importBooks(records);
    setImported(n);
    toast(`تم استيراد ${n} كتاب`, 'success');
  }

  const canNext = (() => {
    if (step === 0) return rawRows.length > 0;
    if (step === 1) return Boolean(mapping.title && mapping.author);
    if (step === 2) return validRows.length > 0;
    return true;
  })();

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>استيراد كتب (CSV)</h1>
          <p className="muted">معالج من 7 خطوات مع تحقق قبل التأكيد</p>
        </div>
        <button className="btn btn-outline" onClick={() => { const blob = new Blob([SAMPLE], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sample.csv'; a.click(); }}>
          <Download size={16} /> نموذج CSV
        </button>
      </div>

      {/* stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}>
            <span className="step-num">{i < step ? <CheckCircle2 size={16} /> : i + 1}</span>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      <section className="admin-card">
        {/* Step 0 */}
        {step === 0 && (
          <div>
            <h2 className="form-section-title"><FileSpreadsheet size={18} /> رفع ملف CSV</h2>
            <label className="dropzone" style={{ display: 'block' }}>
              <input type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files && onUpload(e.target.files[0])} />
              <span className="dropzone-icon"><UploadCloud size={26} /></span>
              <span className="dropzone-text">اختر ملف CSV</span>
              <span className="dropzone-hint muted">الأعمدة: {COLUMNS.join('، ')}</span>
            </label>
            <div className="or-sep"><span>أو الصق المحتوى</span></div>
            <textarea rows={6} className="mono-input" dir="ltr" value={raw} onChange={(e) => loadText(e.target.value)} placeholder={SAMPLE} />
            {rawRows.length > 0 && <p className="muted" style={{ marginTop: 10 }}>تم اكتشاف {rawRows.length} صف و{headers.length} عمود.</p>}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h2 className="form-section-title">مطابقة الأعمدة</h2>
            <p className="muted">اربط أعمدة ملفك بالحقول المطلوبة.</p>
            <div className="map-grid">
              {COLUMNS.map((c) => (
                <label key={c} className="field">
                  <span className="field-label">{c} {(c === 'title' || c === 'author') && '*'}</span>
                  <select value={mapping[c] ?? ''} onChange={(e) => setMapping({ ...mapping, [c]: e.target.value })}>
                    <option value="">— تجاهل —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h2 className="form-section-title">التحقق من البيانات</h2>
            <div className="import-summary">
              <span className="chip chip--ok"><CheckCircle2 size={14} /> {validRows.length} صالح</span>
              <span className="chip chip--warn"><AlertTriangle size={14} /> {parsed.filter((r) => r.errors.length).length} مرفوض</span>
            </div>
            <div className="admin-table-wrap" style={{ marginTop: 14 }}>
              <table className="admin-table">
                <thead><tr><th></th><th>العنوان</th><th>المؤلف</th><th>التصنيف</th><th>ملاحظات</th></tr></thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className={r.errors.length ? 'row-error' : ''}>
                      <td>{r.errors.length ? <AlertTriangle size={16} className="txt-danger" /> : <CheckCircle2 size={16} className="txt-ok" />}</td>
                      <td>{r.data.title || <span className="muted">—</span>}</td>
                      <td>{r.data.author || <span className="muted">—</span>}</td>
                      <td>{r.data.category || <span className="muted">—</span>}</td>
                      <td>
                        {r.errors.map((e, j) => <span key={j} className="chip chip--warn">{e}</span>)}
                        {r.warnings.map((w, j) => <span key={j} className="chip">{w}</span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <h2 className="form-section-title">التصنيفات الجديدة</h2>
            {newCats.length === 0 ? (
              <p className="muted">كل التصنيفات موجودة بالفعل. لا حاجة لإنشاء تصنيفات.</p>
            ) : (
              <>
                <p className="muted">التصنيفات التالية غير موجودة:</p>
                <div className="import-summary">
                  {newCats.map((c) => <span key={c} className="chip">{c}</span>)}
                </div>
                <label className="switch-field" style={{ marginTop: 14 }}>
                  <input type="checkbox" checked={autoCreateCats} onChange={(e) => setAutoCreateCats(e.target.checked)} />
                  <span>إنشاء هذه التصنيفات تلقائيًا</span>
                </label>
                {!autoCreateCats && <p className="muted" style={{ marginTop: 8 }}>الكتب ستُستورد بدون تصنيف مطابق.</p>}
              </>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div>
            <h2 className="form-section-title">إعدادات النشر</h2>
            <div className="field-row">
              <label className="field"><span className="field-label">الحالة</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </label>
              <label className="field"><span className="field-label">الظهور</span>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                  <option value="public">عام</option>
                  <option value="private">خاص</option>
                </select>
              </label>
            </div>
            <label className={`rights-box ${rightsConfirmed ? 'is-on' : ''}`} style={{ marginTop: 8 }}>
              <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} />
              <span>أؤكد امتلاكي الحقوق اللازمة لتوزيع هذه الملفات، والتزامي بشروط المستضيفين وحقوق النشر.</span>
            </label>
            {status === 'published' && !rightsConfirmed && (
              <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>⚠️ يُنصح بتأكيد الحقوق قبل النشر.</p>
            )}
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div>
            <h2 className="form-section-title">تأكيد الاستيراد</h2>
            <ul className="confirm-list">
              <li><CheckCircle2 size={16} className="txt-ok" /> سيتم استيراد <strong>{validRows.length}</strong> كتاب.</li>
              <li><CheckCircle2 size={16} className="txt-ok" /> إنشاء <strong>{autoCreateCats ? newCats.length : 0}</strong> تصنيف جديد.</li>
              <li><CheckCircle2 size={16} className="txt-ok" /> الحالة: <strong>{status === 'published' ? 'منشور' : status === 'draft' ? 'مسودة' : 'مؤرشف'}</strong> — الظهور: <strong>{visibility === 'public' ? 'عام' : 'خاص'}</strong></li>
            </ul>
          </div>
        )}

        {/* Step 6 */}
        {step === 6 && (
          <div>
            <h2 className="form-section-title">جارٍ الاستيراد…</h2>
            <div className="progress"><span className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <p className="muted" style={{ marginTop: 10 }}>{progress}%</p>
            {imported > 0 && (
              <div className="admin-alert admin-alert--ok" style={{ marginTop: 16 }}>
                <CheckCircle2 size={18} /> تم استيراد {imported} كتاب بنجاح.
              </div>
            )}
            {imported > 0 && (
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => navigate(path('books'))}>عرض الكتب</button>
                <button className="btn btn-outline" onClick={() => { setStep(0); setRaw(''); setRawRows([]); setHeaders([]); setImported(0); setProgress(0); }}>استيراد آخر</button>
              </div>
            )}
          </div>
        )}
      </section>

      {step < 6 && (
        <div className="wizard-nav">
          <button className="btn btn-outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowRight size={16} /> السابق</button>
          {step < 5 ? (
            <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>التالي <ArrowLeft size={16} /></button>
          ) : (
            <button className="btn btn-primary" onClick={runImport}>بدء الاستيراد</button>
          )}
        </div>
      )}
    </div>
  );
}
