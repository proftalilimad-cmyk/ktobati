import { Link } from 'react-router-dom';
import { BookMarked, Heart } from 'lucide-react';
import { toArabicDigits } from '../utils/format';

export default function Footer() {
  const year = toArabicDigits(new Date().getFullYear());
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand brand--footer">
            <span className="brand-mark"><BookMarked size={22} /></span>
            <span className="brand-text">
              <span className="brand-name">المكتبة الإلكترونية العربية</span>
            </span>
          </Link>
          <p className="muted footer-about">
            مكتبة رقمية حديثة تتيح لك اكتشاف الكتب وقراءتها وتحميلها مجانًا،
            من الأدب والفلسفة إلى العلوم وعلم النفس والتاريخ.
          </p>
        </div>

        <div className="footer-col">
          <h4>المكتبة</h4>
          <ul>
            <li><Link to="/books">الكتب</Link></li>
            <li><Link to="/categories">التصنيفات</Link></li>
            <li><Link to="/authors">المؤلفون</Link></li>
            <li><Link to="/books/new">أحدث الإضافات</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>استكشف</h4>
          <ul>
            <li><Link to="/category/novels">الروايات</Link></li>
            <li><Link to="/category/philosophy">الفلسفة</Link></li>
            <li><Link to="/category/history">التاريخ</Link></li>
            <li><Link to="/category/psychology">علم النفس</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>عن المشروع</h4>
          <ul>
            <li><Link to="/search">البحث</Link></li>
            <li><a href="#top">الأسئلة الشائعة</a></li>
            <li><a href="#top">سياسة الاستخدام</a></li>
            <li><Link to="/admin">لوحة الإدارة (Dashboard)</Link></li>
          </ul>
          <p className="footer-note muted">
            المصادر متاحة مجانًا للاستخدام الشخصي من مكتبات عربية مفتوحة.
          </p>
        </div>
      </div>

      <div className="footer-bar">
        <div className="container footer-bar-inner">
          <span className="muted">© {year} المكتبة الإلكترونية العربية — جميع الحقوق محفوظة.</span>
          <span className="muted footer-made">
            صُمِّمت بشغف <Heart size={14} className="footer-heart" /> للقارئ العربي
          </span>
        </div>
      </div>
    </footer>
  );
}
