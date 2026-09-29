import { useMemo } from 'react';
import { FileText, Link as LinkIcon, HardDrive, Globe } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ResourcesAdmin() {
  const { snap } = useAdminLibrary();

  const rows = useMemo(() => {
    return snap.records.map((r) => {
      const uploaded = Boolean(r.fileAssetId);
      const external = Boolean(r.fileUrl);
      const seed = /^\d{6,}$/.test(r.id);
      return { r, uploaded, external, seed };
    });
  }, [snap.records]);

  const uploadedCount = rows.filter((x) => x.uploaded).length;
  const externalCount = rows.filter((x) => x.external).length;
  const seedCount = rows.filter((x) => x.seed && !x.uploaded && !x.external).length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>الموارد</h1>
          <p className="muted">ملفات الكتب المرفوعة والروابط الخارجية</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-teal"><span className="stat-icon"><HardDrive size={20} /></span><span className="stat-value">{uploadedCount}</span><span className="stat-label">ملفات مرفوعة</span></div>
        <div className="stat-card stat-blue"><span className="stat-icon"><Globe size={20} /></span><span className="stat-value">{externalCount}</span><span className="stat-label">روابط خارجية</span></div>
        <div className="stat-card stat-slate"><span className="stat-icon"><FileText size={20} /></span><span className="stat-value">{seedCount}</span><span className="stat-label">مصدر أصلي</span></div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>الكتاب</th><th>النوع</th><th>التفاصيل</th></tr></thead>
          <tbody>
            {rows.map(({ r, uploaded, external, seed }) => (
              <tr key={r.id}>
                <td><span className="table-title">{r.title}</span></td>
                <td>
                  {uploaded && <span className="chip chip--ok"><HardDrive size={13} /> مرفوع</span>}
                  {external && <span className="chip"><Globe size={13} /> خارجي</span>}
                  {seed && !uploaded && !external && <span className="chip"><FileText size={13} /> أصلي</span>}
                </td>
                <td>
                  {r.fileMeta && <span className="muted">{r.fileMeta.name} · {r.fileMeta.format} · {humanSize(r.fileMeta.size)}</span>}
                  {r.fileUrl && <a href={r.fileUrl} target="_blank" rel="noreferrer" className="link-more" dir="ltr"><LinkIcon size={13} /> {r.fileUrl.slice(0, 48)}…</a>}
                  {!r.fileMeta && !r.fileUrl && seed && <span className="muted" dir="ltr">downloads.hindawi.org/books/{r.id}.pdf</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
