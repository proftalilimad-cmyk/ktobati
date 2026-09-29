import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

export default function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="view-toggle" role="group" aria-label="طريقة العرض">
      <button
        className={value === 'grid' ? 'is-active' : ''}
        onClick={() => onChange('grid')}
        aria-pressed={value === 'grid'}
        title="عرض شبكي"
      >
        <LayoutGrid size={18} /> <span>شبكة</span>
      </button>
      <button
        className={value === 'list' ? 'is-active' : ''}
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
        title="عرض قائمة"
      >
        <List size={18} /> <span>قائمة</span>
      </button>
    </div>
  );
}
