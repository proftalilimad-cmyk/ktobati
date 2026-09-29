import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Library, Sparkles } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import CategoryCard from '../components/CategoryCard';
import BookSection from '../components/BookSection';
import SearchBar from '../components/SearchBar';
import Reveal from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';
import { toArabicDigits, bookCountLabel } from '../utils/format';

export default function Home() {
  const { books, categories, authors, featured, newest, booksByCategory } = usePublicLibrary();
  useSeo({
    title: 'المكتبة الإلكترونية العربية | اكتشف آلاف الكتب والمعارف في مكان واحد',
    description:
      'مكتبة إلكترونية عربية حديثة: تصفّح الروايات والفلسفة والتاريخ وعلم النفس والعلوم، واقرأ الكتب أونلاين أو حمّلها مجانًا بصيغة PDF وePub.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'المكتبة الإلكترونية العربية',
      inLanguage: 'ar',
      about: 'كتب عربية مجانية للقراءة والتحميل',
    },
  });

  const stats = [
    { icon: <Library size={20} />, value: bookCountLabel(books.length), label: 'متاحة للقراءة' },
    { icon: <Sparkles size={20} />, value: `${toArabicDigits(categories.length)} تصنيفًا`, label: 'معرفيًّا' },
    { icon: <BookOpen size={20} />, value: `${toArabicDigits(authors.length)} مؤلفًا`, label: 'من كل العالم' },
  ];

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="hero" id="top">
        <div className="hero-bg" aria-hidden="true">
          <span className="hero-orb hero-orb--1" />
          <span className="hero-orb hero-orb--2" />
        </div>
        <div className="container hero-inner">
          <Reveal>
            <span className="badge hero-badge">📚 مكتبة رقمية عربية مجانية</span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="hero-title">المكتبة الإلكترونية العربية</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="hero-sub">اكتشف آلاف الكتب والمعارف في مكان واحد</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="hero-search">
              <SearchBar size="lg" />
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="hero-quick">
              <span className="muted">اقتراحات:</span>
              <Link to="/category/novels">الروايات</Link>
              <Link to="/category/philosophy">الفلسفة</Link>
              <Link to="/category/psychology">علم النفس</Link>
              <Link to="/category/history">التاريخ</Link>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <ul className="hero-stats">
              {stats.map((s, i) => (
                <li key={i}>
                  <span className="hero-stat-icon">{s.icon}</span>
                  <span className="hero-stat-value">{s.value}</span>
                  <span className="hero-stat-label muted">{s.label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <h2>📚 تصفّح حسب التصنيف</h2>
                <p className="eyebrow">اختر مجالك المفضّل وابدأ الاكتشاف</p>
              </div>
              <Link to="/categories" className="link-more">كل التصنيفات <ArrowLeft size={18} /></Link>
            </div>
          </Reveal>
          <div className="cat-grid">
            {categories.map((c, i) => (
              <Reveal key={c.slug} delay={Math.min(i * 40, 320)}>
                <CategoryCard category={c} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- BOOK SECTIONS ---------------- */}
      <BookSection title="أحدث الكتب" icon="📚" eyebrow="أضيفت حديثًا إلى المكتبة" books={newest} moreTo="/books/new" eagerCount={3} />
      <BookSection title="كتب مميزة" icon="⭐" eyebrow="اختيارات المحررين" books={featured} moreTo="/books/popular" />
      <BookSection title="الروايات والقصص" icon="📖" books={booksByCategory('novels')} moreTo="/category/novels" />
      <BookSection title="الفكر والفلسفة" icon="🧠" books={booksByCategory('philosophy')} moreTo="/category/philosophy" />
      <BookSection title="التاريخ والحضارات" icon="🏛️" books={[...booksByCategory('history'), ...booksByCategory('social.sciences')]} moreTo="/category/history" />
      <BookSection title="العلوم والمعرفة" icon="🔬" books={booksByCategory('science')} moreTo="/category/science" />
      <BookSection title="تطوير الذات وعلم النفس" icon="🧩" books={booksByCategory('psychology')} moreTo="/category/psychology" />

      {/* ---------------- CTA ---------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta">
              <div className="cta-text">
                <h2>مكتبةٌ كاملة في متناول يدك</h2>
                <p>
                  اقرأ أونلاين أو حمّل كتبك المفضّلة مجانًا بصيغة PDF وePub — بلا اشتراك،
                  وبتجربة قراءة أنيقة على الحاسوب والجوال.
                </p>
              </div>
              <div className="cta-actions">
                <Link to="/books" className="btn btn-accent">تصفّح كل الكتب</Link>
                <Link to="/categories" className="btn btn-ghost">استكشف التصنيفات</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
