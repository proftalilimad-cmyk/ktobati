export default function PageLoader() {
  return (
    <div className="container section">
      <div className="book-grid" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="book-card book-card--skeleton">
            <div className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 'var(--r-md)' }} />
            <div className="skeleton" style={{ height: 16, marginTop: 12, width: '85%' }} />
            <div className="skeleton" style={{ height: 12, marginTop: 8, width: '60%' }} />
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}
