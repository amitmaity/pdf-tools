import { useCallback, useState } from 'react'
import { FileDropzone } from '../components/FileDropzone'
import { QualitySlider } from '../components/QualitySlider'
import { QUALITY_PRESETS, type QualityPreset } from '../lib/qualityPresets'
import { compressPdf } from '../lib/compressPdf'
import { downloadBytes } from '../lib/download'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function CompressPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [quality, setQuality] = useState<number>(QUALITY_PRESETS.medium)
  const [preset, setPreset] = useState<QualityPreset>('medium')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<{
    output: Uint8Array
    structuralOnly: boolean
    imagesProcessed: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setBytes(new Uint8Array(await f.arrayBuffer()))
    setResult(null)
    setError(null)
  }, [])

  const handleCompress = async () => {
    if (!bytes || !file) return
    setProcessing(true)
    setError(null)
    setResult(null)
    try {
      const res = await compressPdf(bytes, quality, setProgress)
      setResult({
        output: res.bytes,
        structuralOnly: res.structuralOnly,
        imagesProcessed: res.imagesProcessed,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compression failed')
    } finally {
      setProcessing(false)
      setProgress('')
    }
  }

  const handleDownload = () => {
    if (!result || !file) return
    const baseName = file.name.replace(/\.pdf$/i, '')
    downloadBytes(result.output, `${baseName}_compressed.pdf`)
  }

  const reduction =
    result && bytes
      ? (((bytes.length - result.output.length) / bytes.length) * 100).toFixed(1)
      : null

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Compress PDF</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Re-encodes embedded images at a lower JPEG quality to reduce file size.
      </p>

      {!file ? (
        <FileDropzone onFiles={loadFile} label="Drop a PDF to compress" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {file.name}
              </span>
              <span className="ml-2 text-sm text-slate-500">({formatSize(file.size)})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setBytes(null)
                setResult(null)
              }}
              className="text-sm text-indigo-600 hover:underline"
            >
              Choose another file
            </button>
          </div>

          <QualitySlider
            quality={quality}
            onChange={setQuality}
            preset={preset}
            onPresetChange={setPreset}
          />

          <button
            type="button"
            onClick={handleCompress}
            disabled={processing}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {processing ? progress || 'Compressing...' : 'Compress'}
          </button>

          {result && bytes && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Results</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li>Original: {formatSize(bytes.length)}</li>
                <li>Compressed: {formatSize(result.output.length)}</li>
                <li>
                  Reduction:{' '}
                  {Number(reduction) > 0 ? (
                    <span className="font-semibold text-emerald-600">{reduction}% smaller</span>
                  ) : (
                    <span className="text-amber-600">
                      {Number(reduction) < 0
                        ? `${Math.abs(Number(reduction))}% larger (limited image content)`
                        : 'No change'}
                    </span>
                  )}
                </li>
                {result.structuralOnly ? (
                  <li className="text-amber-600">
                    No re-encodable images found — saved with structural compression only.
                  </li>
                ) : (
                  <li>{result.imagesProcessed} image(s) re-encoded</li>
                )}
              </ul>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Download compressed PDF
              </button>
            </div>
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
