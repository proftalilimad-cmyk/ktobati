import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PageLoader from './components/PageLoader';

const Home = lazy(() => import('./pages/Home'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const BookDetails = lazy(() => import('./pages/BookDetails'));
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'));
const AuthorPage = lazy(() => import('./pages/AuthorPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function PublicSite() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main id="main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/new" element={<BooksPage mode="new" />} />
            <Route path="/books/popular" element={<BooksPage mode="featured" />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/livre/:id" element={<BookDetails />} />
            <Route path="/authors" element={<AuthorsPage />} />
            <Route path="/author/:id" element={<AuthorPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    // ensure lang/dir stay correct
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location}>
        <Route path="/admin/*" element={<AdminApp base="/admin" />} />
        <Route path="/dashboard/*" element={<AdminApp base="/dashboard" />} />
        <Route path="/*" element={<PublicSite />} />
      </Routes>
    </Suspense>
  );
}
