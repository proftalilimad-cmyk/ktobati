import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="مسار التنقل">
      <ol>
        <li>
          <Link to="/" className="crumb-home">
            <Home size={15} /> الرئيسية
          </Link>
        </li>
        {items.map((item, i) => (
          <Fragment key={i}>
            <li className="crumb-sep" aria-hidden="true">
              <ChevronLeft size={15} />
            </li>
            <li>
              {item.to ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
