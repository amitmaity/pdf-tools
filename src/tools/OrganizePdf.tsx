import { useCallback, useState } from 'react'
import { FileDropzone } from '../components/FileDropzone'
import { SortablePageGrid, type OrganizePageItem } from '../components/SortablePageGrid'
import { renderThumbnails } from '../lib/renderThumbnails'
import { organizePdf } from '../lib/organizePdf'
import { downloadBytes } from '../lib/download'

let nextId = 0

export function OrganizePdf() {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [items, setItems] = useState<OrganizePageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setBytes(null)
    setItems([])
    setError(null)
  }

  const loadFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setLoading(true)
    setProgress('Loading PDF...')
    setError(null)
    try {
      const buf = await f.arrayBuffer()
      const data = new Uint8Array(buf)
      setFile(f)
      setBytes(data)
      const thumbs = await renderThumbnails(buf, 0.3, (cur, total) => {
        setProgress(`Rendering thumbnails ${cur}/${total}...`)
      })
      setItems(
        thumbs.map((t) => ({
          id: `p-${++nextId}`,
          pageIndex: t.pageIndex,
          dataUrl: t.dataUrl,
          rotation: 0,
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PDF')
      reset()
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [])

  const handleRotate = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item,
      ),
    )
  }

  const handleRotateAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, rotation: (item.rotation + 90) % 360 })))
  }

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (!bytes || !file || items.length === 0) return
    setProcessing(true)
    setError(null)
    try {
      const out = await organizePdf(
        bytes,
        items.map((item) => ({ pageIndex: item.pageIndex, rotation: item.rotation })),
      )
      const baseName = file.name.replace(/\.pdf$/i, '')
      downloadBytes(out, `${baseName}_organized.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Organize PDF</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Reorder, rotate, or remove pages. Delete pages to extract a subset into a new PDF.
      </p>

      {!file ? (
        <FileDropzone onFiles={loadFile} label="Drop a PDF to organize" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {file.name} — {items.length} page{items.length !== 1 ? 's' : ''}
            </span>
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
          ) : items.length === 0 ? (
            <p className="text-sm text-amber-600">All pages removed. Choose another file or reset.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRotateAll}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 dark:bg-slate-700"
                >
                  Rotate all 90°
                </button>
              </div>

              <SortablePageGrid
                items={items}
                onReorder={setItems}
                onRotate={handleRotate}
                onRemove={handleRemove}
              />

              <button
                type="button"
                onClick={handleSave}
                disabled={processing}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save & download'}
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
