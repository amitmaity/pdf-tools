import { useCallback, useState } from 'react'
import { FileDropzone } from '../components/FileDropzone'
import { PageThumbGrid } from '../components/PageThumbGrid'
import { renderThumbnails } from '../lib/renderThumbnails'
import { parsePageRange } from '../lib/parsePageRange'
import { splitPdfSingle, splitPdfPerPage } from '../lib/splitPdf'
import { downloadBytes, downloadBlob } from '../lib/download'
import type { PageThumbnail } from '../lib/renderThumbnails'

type OutputMode = 'single' | 'per-page'

export function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [outputMode, setOutputMode] = useState<OutputMode>('single')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [lastShiftIndex, setLastShiftIndex] = useState<number | null>(null)

  const reset = () => {
    setFile(null)
    setBytes(null)
    setThumbnails([])
    setSelected(new Set())
    setRangeInput('')
  }

  const loadFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setLoading(true)
    setProgress('Loading PDF...')
    setRangeError(null)
    try {
      const buf = await f.arrayBuffer()
      const data = new Uint8Array(buf)
      setFile(f)
      setBytes(data)
      setSelected(new Set())
      setRangeInput('')
      const thumbs = await renderThumbnails(buf, 0.3, (cur, total) => {
        setProgress(`Rendering thumbnails ${cur}/${total}...`)
      })
      setThumbnails(thumbs)
    } catch (e) {
      setRangeError(e instanceof Error ? e.message : 'Failed to load PDF')
      reset()
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [])

  const togglePage = (pageIndex: number, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (shiftKey && lastShiftIndex !== null) {
        const start = Math.min(lastShiftIndex, pageIndex)
        const end = Math.max(lastShiftIndex, pageIndex)
        for (let i = start; i <= end; i++) next.add(i)
      } else {
        if (next.has(pageIndex)) next.delete(pageIndex)
        else next.add(pageIndex)
      }
      return next
    })
    setLastShiftIndex(pageIndex)
  }

  const applyRange = () => {
    if (!thumbnails.length) return
    setRangeError(null)
    try {
      const indices = parsePageRange(rangeInput, thumbnails.length)
      setSelected(new Set(indices))
    } catch (e) {
      setRangeError(e instanceof Error ? e.message : 'Invalid range')
    }
  }

  const handleSplit = async () => {
    if (!bytes || !file || selected.size === 0) return
    setProcessing(true)
    setRangeError(null)
    try {
      const indices = [...selected].sort((a, b) => a - b)
      const baseName = file.name.replace(/\.pdf$/i, '')

      if (outputMode === 'single') {
        const out = await splitPdfSingle(bytes, indices)
        downloadBytes(out, `${baseName}_split.pdf`)
      } else {
        const zip = await splitPdfPerPage(bytes, indices, baseName)
        downloadBlob(zip, `${baseName}_pages.zip`)
      }
    } catch (e) {
      setRangeError(e instanceof Error ? e.message : 'Split failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Split PDF</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Select pages to extract. Use shift+click for a range.
      </p>

      {!file ? (
        <FileDropzone onFiles={loadFile} label="Drop a PDF to split" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-indigo-600 hover:underline"
            >
              Choose another file
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">{progress || 'Loading...'}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 7-9"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={applyRange}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 dark:bg-slate-700"
                >
                  Apply range
                </button>
              </div>

              <PageThumbGrid
                thumbnails={thumbnails}
                selected={selected}
                onToggle={togglePage}
                onSelectAll={() => setSelected(new Set(thumbnails.map((t) => t.pageIndex)))}
                onClear={() => setSelected(new Set())}
              />

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Output</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={outputMode === 'single'}
                    onChange={() => setOutputMode('single')}
                  />
                  Single PDF with selected pages
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={outputMode === 'per-page'}
                    onChange={() => setOutputMode('per-page')}
                  />
                  One PDF per page (ZIP)
                </label>
              </div>

              <button
                type="button"
                onClick={handleSplit}
                disabled={selected.size === 0 || processing}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Split & download'}
              </button>
            </>
          )}
        </div>
      )}

      {rangeError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {rangeError}
        </p>
      )}
    </div>
  )
}
