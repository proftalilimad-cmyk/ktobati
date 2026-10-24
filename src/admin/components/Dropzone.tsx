import { useRef, useState, type ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';

interface Props {
  accept: string;
  /** human hint e.g. "PDF أو EPUB" */
  hint: string;
  icon?: ReactNode;
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** Drag & drop + click upload zone for a single file. */
export default function Dropzone({ accept, hint, icon, onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  }

  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click(); }}
    >
      <span className="dropzone-icon">{icon ?? <UploadCloud size={26} />}</span>
      <span className="dropzone-text">اسحب الملف هنا أو انقر للاختيار</span>
      <span className="dropzone-hint muted">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
