import { useCallback, useRef, useState } from 'react';
import { IconUpload } from './Icons';

export function DropzoneUpload({ onFile, disabled, progress }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv')) {
        onFile(null, 'Only .csv files are allowed');
        return;
      }
      onFile(file, null);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`panel flex flex-col items-center justify-center text-center px-6 py-12 cursor-pointer transition-colors ${
        dragOver ? 'border-brand bg-brand/[0.04]' : 'hover:border-text-faint'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className="text-text-faint mb-3">
        <IconUpload width={28} height={28} />
      </span>
      {progress !== null && progress !== undefined ? (
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-ink-raised rounded-full overflow-hidden mb-2">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-text-muted text-sm tabular">{progress}% uploaded</p>
        </div>
      ) : (
        <>
          <p className="text-text text-sm font-medium mb-1">Drop a CSV file here, or click to browse</p>
          <p className="text-text-faint text-xs">One customer per row. Max 20 MB.</p>
        </>
      )}
    </div>
  );
}
