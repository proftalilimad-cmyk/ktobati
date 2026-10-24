import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookMarked, ChevronDown, Menu, Search, X, LayoutDashboard } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import SearchBar from './SearchBar';

const NAV = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/books', label: 'الكتب' },
  { to: '/categories', label: 'التصنيفات', mega: true },
  { to: '/authors', label: 'المؤلفون' },
  { to: '/books/popular', label: 'الأكثر قراءة' },
  { to: '/books/new', label: 'الجديد' },
];

export default function Header() {
  const { categories } = usePublicLibrary();
  const groups = [...new Set(categories.map((c) => c.group))];
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container site-header-inner">
        <Link to="/" className="brand" aria-label="المكتبة الإلكترونية العربية">
          <span className="brand-mark"><BookMarked size={22} /></span>
          <span className="brand-text">
            <span className="brand-name">المكتبة</span>
            <span className="brand-sub">الإلكترونية العربية</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <ul>
            {NAV.map((item) => (
              <li
                key={item.to}
                className={item.mega ? 'has-mega' : ''}
                onMouseEnter={() => item.mega && setMegaOpen(true)}
                onMouseLeave={() => item.mega && setMegaOpen(false)}
              >
                <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                  {item.label}
                  {item.mega && <ChevronDown size={15} className="nav-caret" />}
                </NavLink>

                {item.mega && (
                  <div className={`mega ${megaOpen ? 'is-open' : ''}`} role="menu">
                    <div className="mega-inner">
                      {groups.map((g) => (
                        <div key={g} className="mega-col">
                          <h4>{g}</h4>
                          <ul>
                            {categories
                              .filter((c) => c.group === g)
                              .map((c) => (
                                <li key={c.slug}>
                                  <Link to={`/category/${c.slug}`}>
                                    <span aria-hidden="true">{c.icon}</span> {c.name}
                                  </Link>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">
          <button className="icon-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="بحث" aria-expanded={searchOpen}>
            <Search size={20} />
          </button>
          <Link to="/admin" className="btn btn-primary btn-sm header-admin-btn">
            <LayoutDashboard size={17} /> لوحة التحكم
          </Link>
          <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)} aria-label="القائمة">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="header-search-drop">
          <div className="container">
            <SearchBar autoFocus />
          </div>
        </div>
      )}

    </header>

    {/* Mobile drawer — rendered in a body-level portal so the header's
        backdrop-filter does not become its containing block (which would
        mis-position these fixed overlays). */}
    {createPortal(
      <>
        <div className={`drawer-scrim ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} />
        <aside className={`drawer ${mobileOpen ? 'is-open' : ''}`} aria-hidden={!mobileOpen}>
          <div className="drawer-head">
            <span className="brand-name">القائمة</span>
            <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="إغلاق">
              <X size={22} />
            </button>
          </div>
          <div className="drawer-search">
            <SearchBar />
          </div>
          <nav aria-label="التنقل للجوال">
            <ul className="drawer-nav">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <NavLink to="/admin" className={({ isActive }) => (isActive ? 'is-active' : '')}>
                  لوحة التحكم
                </NavLink>
              </li>
            </ul>
            <div className="drawer-cats">
              <h4>التصنيفات</h4>
              <ul>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <button onClick={() => navigate(`/category/${c.slug}`)}>
                      <span aria-hidden="true">{c.icon}</span> {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>
      </>,
      document.body,
    )}
    </>
  );
}
