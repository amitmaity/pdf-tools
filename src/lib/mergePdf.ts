import { PDFDocument } from 'pdf-lib'

export async function mergePdfs(fileBytesList: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  for (const bytes of fileBytesList) {
    const src = await PDFDocument.load(bytes)
    const pageCount = src.getPageCount()
    const indices = Array.from({ length: pageCount }, (_, i) => i)
    const pages = await merged.copyPages(src, indices)
    pages.forEach((p) => merged.addPage(p))
  }

  return merged.save()
}
