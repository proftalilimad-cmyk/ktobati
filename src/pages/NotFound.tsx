import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';

export default function NotFound() {
  useSeo({ title: 'الصفحة غير موجودة', description: 'الصفحة المطلوبة غير موجودة.' });
  return (
    <div className="container page">
      <div className="state" style={{ padding: '90px 20px' }}>
        <span className="state-icon"><Compass size={34} /></span>
        <h1 style={{ fontSize: '2.4rem', margin: '6px 0' }}>٤٠٤</h1>
        <h3>هذه الصفحة غير موجودة</h3>
        <p>ربما انتقلت الصفحة أو لم تعد متاحة.</p>
        <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 18 }}>
          <Link to="/" className="btn btn-primary">العودة للرئيسية</Link>
          <Link to="/books" className="btn btn-outline">تصفّح الكتب</Link>
        </div>
      </div>
    </div>
  );
}
