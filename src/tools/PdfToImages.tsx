import { useCallback, useState } from 'react'
import { FileDropzone } from '../components/FileDropzone'
import { pdfToImages, packImagesToZip, type ImageFormat } from '../lib/pdfToImages'
import { downloadBlob } from '../lib/download'

const SCALE_OPTIONS = [
  { value: 1, label: '1x (screen)' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x (default)' },
  { value: 3, label: '3x (high)' },
]

export function PdfToImages() {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<ArrayBuffer | null>(null)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [scale, setScale] = useState(2)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setData(await f.arrayBuffer())
    setError(null)
  }, [])

  const handleExport = async () => {
    if (!data || !file) return
    setProcessing(true)
    setError(null)
    setProgress('Rendering pages...')
    try {
      const baseName = file.name.replace(/\.pdf$/i, '')
      const images = await pdfToImages(data, {
        scale,
        format,
        onProgress: (cur, total) => setProgress(`Rendering page ${cur}/${total}...`),
      })

      if (images.length === 1) {
        const img = images[0]
        downloadBlob(img.blob, `${baseName}_page_1.${img.extension}`)
      } else {
        setProgress('Creating ZIP...')
        const zip = await packImagesToZip(images, baseName)
        downloadBlob(zip, `${baseName}_images.zip`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setProcessing(false)
      setProgress('')
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">PDF to Images</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Export each page as a PNG or JPEG image. Multiple pages download as a ZIP.
      </p>

      {!file ? (
        <FileDropzone onFiles={loadFile} label="Drop a PDF to convert" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setData(null)
              }}
              className="text-sm text-indigo-600 hover:underline"
            >
              Choose another file
            </button>
          </div>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Format</p>
              <div className="flex gap-2">
                {(['png', 'jpeg'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium uppercase transition ${
                      format === f
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Resolution
              </label>
              <select
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                {SCALE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={processing}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {processing ? progress || 'Exporting...' : 'Export images'}
          </button>
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
