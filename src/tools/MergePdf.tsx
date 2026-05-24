import { useCallback, useState } from 'react'
import { FileDropzone } from '../components/FileDropzone'
import { SortableFileList, type MergeFileItem } from '../components/SortableFileList'
import { mergePdfs } from '../lib/mergePdf'
import { downloadBytes } from '../lib/download'

let nextId = 0

export function MergePdf() {
  const [items, setItems] = useState<MergeFileItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback((files: File[]) => {
    setError(null)
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({ id: `f-${++nextId}`, file })),
    ])
  }, [])

  const handleMerge = async () => {
    if (items.length < 2) {
      setError('Add at least two PDF files to merge.')
      return
    }
    setProcessing(true)
    setError(null)
    try {
      const bytesList = await Promise.all(
        items.map(async (item) => new Uint8Array(await item.file.arrayBuffer())),
      )
      const merged = await mergePdfs(bytesList)
      downloadBytes(merged, 'merged.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Merge PDF</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Add multiple PDFs and drag to set the merge order.
      </p>

      <FileDropzone
        onFiles={addFiles}
        multiple
        label="Drop PDFs here or click to add more"
      />

      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          <SortableFileList
            items={items}
            onReorder={setItems}
            onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleMerge}
              disabled={processing || items.length < 2}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? 'Merging...' : 'Merge & download'}
            </button>
            <button
              type="button"
              onClick={() => setItems([])}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-600"
            >
              Clear all
            </button>
          </div>
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
