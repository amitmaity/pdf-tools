import { pdfjsLib } from './pdfjs'

export interface PageThumbnail {
  pageIndex: number
  dataUrl: string
}

export async function renderThumbnails(
  data: ArrayBuffer,
  scale = 0.3,
  onProgress?: (current: number, total: number) => void,
): Promise<PageThumbnail[]> {
  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) })
  const pdf = await loadingTask.promise
  const thumbnails: PageThumbnail[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    thumbnails.push({
      pageIndex: i - 1,
      dataUrl: canvas.toDataURL('image/jpeg', 0.7),
    })
    onProgress?.(i, pdf.numPages)
    await yieldToMain()
  }

  return thumbnails
}

export async function getPageCount(data: ArrayBuffer): Promise<number> {
  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) })
  const pdf = await loadingTask.promise
  return pdf.numPages
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
