import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useToast } from '../Toast';
import Modal from '../components/Modal';
import { putAsset } from '../../store/assets';

interface Candidate {
  file: File;
  preview: string;
  base: string;
  matchId?: string;
  matchTitle?: string;
  willOverwrite: boolean;
}

export default function CoversAdmin() {
  const { snap, store } = useAdminLibrary();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [confirm, setConfirm] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const out: Candidate[] = [];
    for (const file of Array.from(files)) {
      if (!/\.(jpe?g|png|webp|svg)$/i.test(file.name)) continue;
      const base = file.name.replace(/\.[^.]+$/, '').trim();
      const rec = snap.records.find((r) => r.id === base || r.slug === base);
      out.push({
        file,
        preview: URL.createObjectURL(file),
        base,
        matchId: rec?.id,
        matchTitle: rec?.title,
        willOverwrite: Boolean(rec?.coverAssetId || rec?.coverUrl),
      });
    }
    setCandidates(out);
  }

  const matched = candidates.filter((c) => c.matchId);
  const overwrites = matched.filter((c) => c.willOverwrite);

  async function apply() {
    let n = 0;
    for (const c of matched) {
      if (!c.matchId) continue;
      const assetId = store.newId();
      await putAsset(assetId, c.file);
      store.updateBook(c.matchId, { coverAssetId: assetId, coverUrl: undefined });
      n++;
    }
    toast(`تم تحديث ${n} غلاف`, 'success');
    setCandidates([]);
    setConfirm(false);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>استيراد الأغلفة</h1>
          <p className="muted">ارفع عدة صور؛ تتم المطابقة تلقائيًا حسب اسم الملف (مُعرّف الكتاب أو الـ slug)</p>
        </div>
      </div>

      <section className="admin-card">
        <label className="dropzone" style={{ display: 'block' }}>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          <span className="dropzone-icon"><UploadCloud size={26} /></span>
          <span className="dropzone-text">اختر صور الأغلفة (متعددة)</span>
          <span className="dropzone-hint muted">سمّ الملف باسم مُعرّف الكتاب أو الـ slug، مثل: 19319180.jpg</span>
        </label>
      </section>

      {candidates.length > 0 && (
        <section className="admin-card">
          <div className="import-summary">
            <span className="chip chip--ok"><CheckCircle2 size={14} /> {matched.length} مطابقة</span>
            <span className="chip chip--warn"><AlertTriangle size={14} /> {candidates.length - matched.length} بدون مطابقة</span>
            {overwrites.length > 0 && <span className="chip chip--warn">{overwrites.length} ستُستبدل</span>}
          </div>
          <div className="cover-import-grid">
            {candidates.map((c, i) => (
              <div key={i} className={`cover-import-item ${c.matchId ? '' : 'is-unmatched'}`}>
                <img src={c.preview} alt={c.base} />
                <span className="cover-import-name" dir="ltr">{c.file.name}</span>
                {c.matchId ? (
                  <span className="chip chip--ok">{c.matchTitle}{c.willOverwrite ? ' (استبدال)' : ''}</span>
                ) : (
                  <span className="chip chip--warn">لا يوجد كتاب مطابق</span>
                )}
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" disabled={matched.length === 0} onClick={() => setConfirm(true)}>
              <ImageIcon size={16} /> تطبيق على {matched.length} كتاب
            </button>
            <button className="btn btn-outline" onClick={() => setCandidates([])}>إلغاء</button>
          </div>
        </section>
      )}

      <Modal
        open={confirm}
        title="تأكيد تحديث الأغلفة"
        onClose={() => setConfirm(false)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setConfirm(false)}>إلغاء</button>
          <button className="btn btn-primary" onClick={apply}>تأكيد</button>
        </>}
      >
        <p>سيتم تحديث <strong>{matched.length}</strong> غلاف.</p>
        {overwrites.length > 0 && (
          <p className="admin-alert admin-alert--warn"><AlertTriangle size={15} /> {overwrites.length} منها ستستبدل غلافًا موجودًا. لا يمكن التراجع.</p>
        )}
      </Modal>
    </div>
  );
}
