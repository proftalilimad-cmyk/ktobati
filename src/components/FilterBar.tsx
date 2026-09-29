import { SlidersHorizontal, X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

export interface FilterState {
  [groupId: string]: string; // '' means all
}

interface Props {
  groups: FilterGroup[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  sort?: { value: string; onChange: (v: string) => void };
}

const SORTS: FilterOption[] = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'alpha', label: 'الأبجدية' },
  { value: 'longest', label: 'الأطول' },
];

export default function FilterBar({ groups, value, onChange, sort }: Props) {
  const active = Object.values(value).filter(Boolean).length + (0);
  const hasActive = active > 0;

  return (
    <div className="filterbar">
      <div className="filterbar-head">
        <span className="filterbar-title">
          <SlidersHorizontal size={18} /> تصفية
        </span>
        {hasActive && (
          <button className="filterbar-clear" onClick={() => onChange({})}>
            <X size={14} /> مسح الفلاتر
          </button>
        )}
      </div>
      <div className="filterbar-controls">
        {groups.map((g) => (
          <label key={g.id} className="filter-select">
            <span className="filter-select-label">{g.label}</span>
            <select
              value={value[g.id] ?? ''}
              onChange={(e) => onChange({ ...value, [g.id]: e.target.value })}
            >
              <option value="">الكل</option>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {sort && (
          <label className="filter-select">
            <span className="filter-select-label">الترتيب</span>
            <select value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
