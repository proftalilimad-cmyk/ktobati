import type { BookStatus, Visibility } from '../../data/types';

const STATUS: Record<BookStatus, { label: string; cls: string }> = {
  published: { label: 'منشور', cls: 'st-pub' },
  draft: { label: 'مسودة', cls: 'st-draft' },
  archived: { label: 'مؤرشف', cls: 'st-arch' },
};

export function StatusBadge({ status }: { status: BookStatus }) {
  const s = STATUS[status] ?? STATUS.draft;
  return <span className={`st-badge ${s.cls}`}>{s.label}</span>;
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return (
    <span className={`st-badge ${visibility === 'public' ? 'st-public' : 'st-private'}`}>
      {visibility === 'public' ? 'عام' : 'خاص'}
    </span>
  );
}
