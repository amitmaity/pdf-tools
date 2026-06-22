import JSZip from 'jszip'
import { pdfjsLib } from './pdfjs'

export type ImageFormat = 'png' | 'jpeg'

export interface PdfToImagesOptions {
  scale?: number
  format?: ImageFormat
  jpegQuality?: number
  onProgress?: (current: number, total: number) => void
}

export interface RenderedPageImage {
  pageNumber: number
  blob: Blob
  extension: string
}

async function renderPageToBlob(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof pdfjsLib.getDocument>>['promise']>['getPage']>,
  scale: number,
  format: ImageFormat,
  jpegQuality: number,
): Promise<Blob> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const quality = format === 'jpeg' ? jpegQuality : undefined

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      mime,
      quality,
    )
  })
}

export async function pdfToImages(
  data: ArrayBuffer,
  options: PdfToImagesOptions = {},
): Promise<RenderedPageImage[]> {
  const { scale = 2, format = 'png', jpegQuality = 0.92, onProgress } = options
  const extension = format === 'png' ? 'png' : 'jpg'

  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) })
  const pdf = await loadingTask.promise
  const images: RenderedPageImage[] = []

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const blob = await renderPageToBlob(page, scale, format, jpegQuality)
      images.push({ pageNumber: i, blob, extension })
      onProgress?.(i, pdf.numPages)
      await yieldToMain()
    }
  } finally {
    await loadingTask.destroy()
  }

  return images
}

export async function packImagesToZip(
  images: RenderedPageImage[],
  baseName: string,
): Promise<Blob> {
  const zip = new JSZip()
  for (const img of images) {
    zip.file(`${baseName}_page_${img.pageNumber}.${img.extension}`, img.blob)
  }
  return zip.generateAsync({ type: 'blob' })
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
