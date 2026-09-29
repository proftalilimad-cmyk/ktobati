import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './AdminAuth';
import { ToastProvider } from './Toast';
import { AdminBaseContext } from './base';
import AdminLayout from './AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BooksList from './pages/BooksList';
import BookForm from './pages/BookForm';
import CategoriesAdmin from './pages/CategoriesAdmin';
import AuthorsAdmin from './pages/AuthorsAdmin';
import ImportBooks from './pages/ImportBooks';
import CoversAdmin from './pages/CoversAdmin';
import ResourcesAdmin from './pages/ResourcesAdmin';
import LinksAdmin from './pages/LinksAdmin';
import SettingsAdmin from './pages/SettingsAdmin';

function Protected({ base, children }: { base: string; children: React.ReactNode }) {
  const { isAuthed } = useAdminAuth();
  const location = useLocation();
  if (!isAuthed) return <Navigate to={`${base}/login`} state={{ from: location }} replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

export default function AdminApp({ base }: { base: string }) {
  return (
    <AdminBaseContext.Provider value={base}>
      <AdminAuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="" element={<Protected base={base}><Dashboard /></Protected>} />
            <Route path="books" element={<Protected base={base}><BooksList /></Protected>} />
            <Route path="books/new" element={<Protected base={base}><BookForm /></Protected>} />
            <Route path="books/import" element={<Protected base={base}><ImportBooks /></Protected>} />
            <Route path="books/:id/edit" element={<Protected base={base}><BookForm /></Protected>} />
            <Route path="categories" element={<Protected base={base}><CategoriesAdmin /></Protected>} />
            <Route path="authors" element={<Protected base={base}><AuthorsAdmin /></Protected>} />
            <Route path="resources" element={<Protected base={base}><ResourcesAdmin /></Protected>} />
            <Route path="covers" element={<Protected base={base}><CoversAdmin /></Protected>} />
            <Route path="links" element={<Protected base={base}><LinksAdmin /></Protected>} />
            <Route path="settings" element={<Protected base={base}><SettingsAdmin /></Protected>} />
            <Route path="*" element={<Navigate to={base} replace />} />
          </Routes>
        </ToastProvider>
      </AdminAuthProvider>
    </AdminBaseContext.Provider>
  );
}
