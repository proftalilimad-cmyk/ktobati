import { useMemo } from 'react';
import { FileText, Link as LinkIcon, HardDrive, Globe } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { PROVIDER_LABEL } from '../../store/links';

function humanSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ResourcesAdmin() {
  const { snap } = useAdminLibrary();

  const files = useMemo(() => snap.allBooks.flatMap((b) => b.files.map((f) => ({ book: b, f }))), [snap.allBooks]);

  const localCount = files.filter((x) => x.f.provider === 'local').length;
  const externalCount = files.filter((x) => x.f.provider !== 'local').length;
  const pdfCount = files.filter((x) => x.f.fileType === 'pdf').length;
  const epubCount = files.filter((x) => x.f.fileType === 'epub').length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>الموارد</h1>
          <p className="muted">ملفات الكتب حسب المستضيف والصيغة — لا تُخزَّن الملفات الكبيرة داخل الموقع</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-teal"><span className="stat-icon"><HardDrive size={20} /></span><span className="stat-value">{localCount}</span><span className="stat-label">مرفوع محليًا</span></div>
        <div className="stat-card stat-blue"><span className="stat-icon"><Globe size={20} /></span><span className="stat-value">{externalCount}</span><span className="stat-label">روابط خارجية</span></div>
        <div className="stat-card stat-slate"><span className="stat-icon"><FileText size={20} /></span><span className="stat-value">{pdfCount}</span><span className="stat-label">PDF</span></div>
        <div className="stat-card stat-violet"><span className="stat-icon"><FileText size={20} /></span><span className="stat-value">{epubCount}</span><span className="stat-label">EPUB</span></div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>الكتاب</th><th>الصيغة</th><th>المستضيف</th><th>الرابط</th></tr></thead>
          <tbody>
            {files.map(({ book, f }) => (
              <tr key={f.id}>
                <td><span className="table-title">{book.title}</span></td>
                <td><span className="chip">{f.fileType.toUpperCase()}{f.fileSize ? ` · ${humanSize(f.fileSize)}` : ''}</span></td>
                <td>
                  {f.provider === 'local'
                    ? <span className="chip chip--ok"><HardDrive size={13} /> {PROVIDER_LABEL[f.provider]}</span>
                    : <span className="chip"><Globe size={13} /> {PROVIDER_LABEL[f.provider]}</span>}
                </td>
                <td>
                  {f.provider === 'local'
                    ? <span className="muted">{f.fileName}</span>
                    : <a href={f.downloadUrl} target="_blank" rel="noreferrer" className="link-more" dir="ltr"><LinkIcon size={13} /> {f.downloadUrl.slice(0, 46)}…</a>}
                </td>
              </tr>
            ))}
            {files.length === 0 && <tr><td colSpan={4} className="admin-empty">لا توجد ملفات.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
