import { Link, useParams } from 'react-router-dom';
import { BookOpen, Download, ExternalLink, FileText, Globe, Layers, Tag, User, Calendar, Hash } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import Breadcrumb from '../components/Breadcrumb';
import BookGrid from '../components/BookGrid';
import Cover from '../components/Cover';
import Reveal from '../components/Reveal';
import NotFound from './NotFound';
import { useSeo } from '../hooks/useSeo';
import { chapterCountLabel, formatWords, toArabicDigits } from '../utils/format';

const roleLabel: Record<string, string> = {
  author: 'تأليف',
  translator: 'ترجمة',
  reviewer: 'مراجعة',
};

export default function BookDetails() {
  const { id = '' } = useParams();
  const { getBook, categoryBySlug, books } = usePublicLibrary();
  const book = getBook(id);

  useSeo({
    title: book ? `${book.title} — ${book.authorName} | قراءة وتحميل مجاني` : 'كتاب',
    description: book ? book.description.slice(0, 155) : undefined,
    jsonLd: book
      ? {
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: book.title,
          inLanguage: 'ar',
          author: book.contributors.filter((c) => c.role === 'author').map((c) => ({ '@type': 'Person', name: c.name })),
          numberOfPages: undefined,
          datePublished: book.yearOriginal,
          genre: book.categorySlugs.map((s) => categoryBySlug(s)?.name).filter(Boolean),
          description: book.description,
          image: book.cover,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        }
      : null,
  });

  if (!book) return <NotFound />;

  const primaryCat = categoryBySlug(book.categorySlugs[0]);
  const readUrl = book.chapters[0]?.url || book.sourceUrl || book.pdf || book.epub;
  const related = books
    .filter((b) => b.id !== book.id && b.categorySlugs.some((s) => book.categorySlugs.includes(s)))
    .slice(0, 6);

  const info: { icon: JSX.Element; label: string; value: React.ReactNode }[] = [
    { icon: <Tag size={16} />, label: 'التصنيف', value: book.categorySlugs.map((s) => categoryBySlug(s)?.name).filter(Boolean).join('، ') },
    { icon: <Globe size={16} />, label: 'اللغة', value: book.language },
    ...(book.yearOriginal ? [{ icon: <Calendar size={16} />, label: 'سنة التأليف', value: toArabicDigits(book.yearOriginal) }] : []),
    ...(book.yearPublished ? [{ icon: <Calendar size={16} />, label: 'سنة النشر', value: toArabicDigits(book.yearPublished) }] : []),
    ...(book.words ? [{ icon: <Hash size={16} />, label: 'عدد الكلمات', value: formatWords(book.words) }] : []),
    ...(book.isbn ? [{ icon: <Hash size={16} />, label: 'ISBN', value: book.isbn }] : []),
    ...(book.chapters.length > 0
      ? [{ icon: <Layers size={16} />, label: 'المحتوى', value: chapterCountLabel(book.chapters.length) }]
      : []),
  ];

  return (
    <div className="page">
      <div className="container">
        <Breadcrumb
          items={[
            ...(primaryCat ? [{ label: primaryCat.name, to: `/category/${primaryCat.slug}` }] : []),
            { label: book.title },
          ]}
        />
      </div>

      {/* ---------------- HERO ---------------- */}
      <section className="book-hero">
        <div className="container book-hero-inner">
          <Reveal className="book-hero-cover">
            <div className="book-hero-cover-frame">
              <Cover book={book} eager />
            </div>
          </Reveal>

          <Reveal delay={100} className="book-hero-main">
            <div className="book-hero-tags">
              {book.categorySlugs.map((s) => {
                const c = categoryBySlug(s);
                return c ? (
                  <Link key={s} to={`/category/${s}`} className="badge">{c.icon} {c.name}</Link>
                ) : null;
              })}
              {book.featured && <span className="badge badge-amber">⭐ مميّز</span>}
            </div>

            <h1 className="book-hero-title">{book.title}</h1>

            <div className="book-hero-people">
              {book.contributors.map((c) => (
                <span key={c.id + c.role} className="book-hero-person">
                  <span className="muted">{roleLabel[c.role]}:</span>{' '}
                  {c.role === 'author' ? (
                    <Link to={`/author/${c.id}`}>{c.name}</Link>
                  ) : (
                    <span>{c.name}</span>
                  )}
                </span>
              ))}
            </div>

            <p className="book-hero-teaser">{book.teaser}</p>

            <div className="book-hero-actions">
              {book.hasRead && readUrl && (
                <a href={readUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <BookOpen size={18} /> قراءة الكتاب
                </a>
              )}
              {book.pdf && (
                <a href={book.pdf} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  <Download size={18} /> تحميل PDF
                </a>
              )}
              {book.epub && (
                <a href={book.epub} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  <FileText size={18} /> تحميل ePub
                </a>
              )}
              {!book.hasRead && !book.hasDownload && (
                <span className="muted">لا تتوفر نسخة رقمية للقراءة أو التحميل حاليًا.</span>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container book-body">
        <div className="book-main">
          {/* نبذة */}
          <Reveal>
            <section className="book-block">
              <h2 className="subhead">نبذة عن الكتاب</h2>
              <p className="book-desc">{book.description}</p>
            </section>
          </Reveal>

          {/* الفهرس / السومير */}
          {book.chapters.length > 0 && (
            <Reveal>
              <section className="book-block">
                <h2 className="subhead">الفهرس والمحتوى</h2>
                <p className="muted" style={{ marginBottom: 14 }}>
                  اضغط على أي فصل لقراءته مباشرةً في نافذة جديدة.
                </p>
                <ol className="toc">
                  {book.chapters.map((ch, i) => (
                    <li key={ch.url}>
                      <a href={ch.url} target="_blank" rel="noopener noreferrer" className="toc-item">
                        <span className="toc-num">{toArabicDigits(i + 1)}</span>
                        <span className="toc-title">{ch.title}</span>
                        <ExternalLink size={16} className="toc-ext" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          )}

          {/* عن المؤلف */}
          {book.authorBio && (
            <Reveal>
              <section className="book-block author-block">
                <h2 className="subhead">عن المؤلف</h2>
                <div className="author-block-inner">
                  <span className="author-avatar author-avatar--lg" aria-hidden="true">
                    <User size={26} />
                  </span>
                  <div>
                    <Link to={`/author/${book.authorId}`} className="author-block-name">{book.authorName}</Link>
                    <p className="muted">{book.authorBio}</p>
                    <Link to={`/author/${book.authorId}`} className="link-more">كل كتب المؤلف ←</Link>
                  </div>
                </div>
              </section>
            </Reveal>
          )}
        </div>

        {/* aside: معلومات الكتاب */}
        <aside className="book-aside">
          <Reveal delay={80}>
            <div className="info-card">
              <h3>معلومات الكتاب</h3>
              <dl className="info-list">
                <div className="info-row">
                  <dt><User size={16} /> المؤلف</dt>
                  <dd><Link to={`/author/${book.authorId}`}>{book.authorName}</Link></dd>
                </div>
                {info.map((row, i) => (
                  <div className="info-row" key={i}>
                    <dt>{row.icon} {row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              {book.hasDownload ? (
                <div className="info-downloads">
                  {book.pdf && (
                    <a href={book.pdf} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">
                      <Download size={17} /> تحميل PDF
                    </a>
                  )}
                  {(book.epub || book.kfx) && (
                    <div className="info-downloads-row">
                      {book.epub && <a href={book.epub} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">ePub</a>}
                      {book.kfx && <a href={book.kfx} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Kindle</a>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 12 }}>لا يتوفر ملف للتحميل.</p>
              )}
            </div>
          </Reveal>
        </aside>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="section-tight">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>📚 كتب ذات صلة</h2>
              </div>
            </Reveal>
            <BookGrid books={related} />
          </div>
        </section>
      )}
    </div>
  );
}
