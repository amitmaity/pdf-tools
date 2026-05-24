import { useCallback, useRef, useState } from 'react'

interface FileDropzoneProps {
  onFiles: (files: File[]) => void
  multiple?: boolean
  label?: string
}

export function FileDropzone({
  onFiles,
  multiple = false,
  label = 'Drop PDF here or click to browse',
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return
      const pdfs = [...fileList].filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
      if (pdfs.length) onFiles(pdfs)
    },
    [onFiles],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        dragOver
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
          : 'border-slate-300 bg-slate-50 hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <svg
        className="mx-auto mb-3 h-12 w-12 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <p className="mt-1 text-xs text-slate-500">PDF files only</p>
    </div>
  )
}
