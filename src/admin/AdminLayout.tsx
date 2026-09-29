import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlusCircle, Upload, Tags, Users,
  FolderOpen, ImageIcon, LinkIcon, Settings, LogOut, Menu, X, ExternalLink, ChevronDown,
} from 'lucide-react';
import { useAdminAuth } from './AdminAuth';
import { useAdminBase } from './base';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  children?: { to: string; label: string }[];
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const base = useAdminBase();
  const { email, logout } = useAdminAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const nav: NavItem[] = [
    { to: base, label: 'لوحة التحكم', icon: <LayoutDashboard size={19} />, end: true },
    {
      to: `${base}/books`, label: 'الكتب', icon: <BookOpen size={19} />,
      children: [
        { to: `${base}/books`, label: 'كل الكتب' },
        { to: `${base}/books/new`, label: 'إضافة كتاب' },
        { to: `${base}/books/import`, label: 'استيراد (CSV)' },
      ],
    },
    { to: `${base}/categories`, label: 'التصنيفات', icon: <Tags size={19} /> },
    { to: `${base}/authors`, label: 'المؤلفون', icon: <Users size={19} /> },
    { to: `${base}/resources`, label: 'الموارد', icon: <FolderOpen size={19} /> },
    { to: `${base}/covers`, label: 'الأغلفة', icon: <ImageIcon size={19} /> },
    { to: `${base}/links`, label: 'الروابط', icon: <LinkIcon size={19} /> },
    { to: `${base}/settings`, label: 'الإعدادات', icon: <Settings size={19} /> },
  ];

  return (
    <div className={`admin-shell ${mobileOpen ? 'is-open' : ''}`}>
      {/* sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark"><BookOpen size={20} /></span>
          <span>
            <strong>لوحة الإدارة</strong>
            <small className="muted">نظام إدارة المكتبة</small>
          </span>
          <button className="icon-btn admin-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {nav.map((item) => (
            <div key={item.to} className="admin-nav-group">
              <NavLink to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}>
                {item.icon}
                <span>{item.label}</span>
                {item.children && <ChevronDown size={15} className="admin-nav-caret" />}
              </NavLink>
              {item.children && (
                <div className="admin-nav-sub">
                  {item.children.map((c) => (
                    <NavLink key={c.to} to={c.to} end className={({ isActive }) => `admin-subnav-link ${isActive ? 'is-active' : ''}`}>
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/" className="admin-nav-link" target="_blank">
            <ExternalLink size={18} /> <span>عرض الموقع</span>
          </Link>
          <button className="admin-nav-link admin-logout" onClick={logout}>
            <LogOut size={18} /> <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* scrim for mobile */}
      <div className="admin-scrim" onClick={() => setMobileOpen(false)} />

      {/* main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="icon-btn admin-menu-btn" onClick={() => setMobileOpen(true)} aria-label="القائمة">
            <Menu size={20} />
          </button>
          <div className="admin-topbar-spacer" />
          <div className="admin-user">
            <span className="admin-avatar">{(email ?? 'A').slice(0, 1).toUpperCase()}</span>
            <span className="admin-user-meta">
              <strong>{email ?? 'Admin'}</strong>
              <small className="muted">مدير</small>
            </span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
