import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { usePublicLibrary } from '../store/useLibrary';
import Cover from './Cover';

interface Props {
  size?: 'lg' | 'md';
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
}

export default function SearchBar({
  size = 'md',
  placeholder = 'ابحث عن كتاب، مؤلف، رواية أو موضوع…',
  autoFocus,
  initialValue = '',
}: Props) {
  const { search, categoryBySlug } = usePublicLibrary();
  const [q, setQ] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => (q.trim() ? search(q).slice(0, 6) : []), [q, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submit(query: string) {
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') submit(q);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) navigate(`/book/${results[active].id}`);
      else submit(q);
      setOpen(false);
    } else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className={`searchbar searchbar--${size}`} ref={boxRef}>
      <div className="searchbar-field">
        <Search size={size === 'lg' ? 22 : 18} className="searchbar-icon" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="بحث في المكتبة"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="search-suggestions"
        />
        {q && (
          <button className="searchbar-clear" onClick={() => { setQ(''); setOpen(false); }} aria-label="مسح">
            <X size={16} />
          </button>
        )}
        <button className="btn btn-primary searchbar-btn" onClick={() => submit(q)}>
          بحث
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="search-suggest" id="search-suggestions" role="listbox">
          {results.map((b, i) => {
            const cat = categoryBySlug(b.categorySlugs[0]);
            return (
              <li
                key={b.id}
                role="option"
                aria-selected={active === i}
                className={active === i ? 'is-active' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); navigate(`/book/${b.id}`); setOpen(false); }}
              >
                <span className="suggest-cover"><Cover book={b} /></span>
                <span className="suggest-text">
                  <span className="suggest-title">{b.title}</span>
                  <span className="suggest-sub muted">{b.authorName}{cat ? ` · ${cat.name}` : ''}</span>
                </span>
              </li>
            );
          })}
          <li className="search-suggest-all" onMouseDown={(e) => { e.preventDefault(); submit(q); }}>
            عرض كل النتائج عن «{q}»
          </li>
        </ul>
      )}
    </div>
  );
}
