import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'

export async function splitPdfSingle(
  bytes: Uint8Array,
  pageIndices: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes)
  const dst = await PDFDocument.create()
  const pages = await dst.copyPages(src, pageIndices)
  pages.forEach((p) => dst.addPage(p))
  return dst.save()
}

export async function splitPdfPerPage(
  bytes: Uint8Array,
  pageIndices: number[],
  baseName: string,
): Promise<Blob> {
  const src = await PDFDocument.load(bytes)
  const zip = new JSZip()

  for (const idx of pageIndices) {
    const dst = await PDFDocument.create()
    const [page] = await dst.copyPages(src, [idx])
    dst.addPage(page)
    const out = await dst.save()
    zip.file(`${baseName}_page_${idx + 1}.pdf`, out)
  }

  return zip.generateAsync({ type: 'blob' })
}
