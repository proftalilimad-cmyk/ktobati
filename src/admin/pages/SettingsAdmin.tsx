import { useState } from 'react';
import { Download, RotateCcw, ShieldAlert, Database } from 'lucide-react';
import { useAdminLibrary } from '../../store/useLibrary';
import { useToast } from '../Toast';
import Modal from '../components/Modal';

export default function SettingsAdmin() {
  const { snap, store } = useAdminLibrary();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  function exportJson() {
    const blob = new Blob([JSON.stringify({ records: snap.records, categories: snap.categories }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maktaba-catalog.json';
    a.click();
    toast('تم تصدير البيانات', 'success');
  }

  function doReset() {
    store.resetToSeed();
    toast('تمت إعادة التعيين إلى البيانات الأصلية', 'success');
    setConfirmReset(false);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>الإعدادات</h1>
          <p className="muted">إدارة البيانات والأمان</p>
        </div>
      </div>

      <section className="admin-card">
        <h2 className="form-section-title"><Database size={18} /> البيانات</h2>
        <p className="muted">يُحفظ الكتالوج محليًا في متصفحك (localStorage) والملفات المرفوعة في IndexedDB.</p>
        <div className="row" style={{ gap: 10, marginTop: 12 }}>
          <button className="btn btn-outline" onClick={exportJson}><Download size={16} /> تصدير JSON</button>
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> إعادة التعيين</button>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="form-section-title"><ShieldAlert size={18} /> الأمان</h2>
        <div className="admin-alert admin-alert--warn">
          <ShieldAlert size={16} />
          <div>
            <strong>تنبيه:</strong> بوابة الدخول الحالية أمامية فقط (للعرض) ولا توفّر حماية حقيقية.
            في الإنتاج استخدم Supabase Auth مع سياسات RLS. الملف <code>supabase/schema.sql</code> يحتوي المخطط الجاهز.
          </div>
        </div>
        <ul className="muted" style={{ lineHeight: 1.9, marginTop: 12 }}>
          <li>لا تضع أي مفتاح <code>service_role</code> أو أسرار في كود الواجهة.</li>
          <li>القراءة العامة مقصورة على الكتب المنشورة عبر سياسة RLS.</li>
          <li>الإضافة/التعديل/الحذف تتطلب حساب مسؤول موثّق.</li>
        </ul>
      </section>

      <Modal
        open={confirmReset}
        title="إعادة التعيين"
        onClose={() => setConfirmReset(false)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setConfirmReset(false)}>إلغاء</button>
          <button className="btn btn-danger" onClick={doReset}>إعادة التعيين</button>
        </>}
      >
        <p>سيؤدي هذا إلى حذف كل التغييرات المحلية والعودة إلى البيانات الأصلية. متابعة؟</p>
      </Modal>
    </div>
  );
}
