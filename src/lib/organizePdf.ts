import { PDFDocument, degrees } from 'pdf-lib'

export interface OrganizedPage {
  pageIndex: number
  rotation: number
}

export async function organizePdf(
  bytes: Uint8Array,
  pages: OrganizedPage[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes)
  const dst = await PDFDocument.create()
  const copied = await dst.copyPages(
    src,
    pages.map((p) => p.pageIndex),
  )
  copied.forEach((page, i) => {
    const base = page.getRotation().angle
    page.setRotation(degrees((base + pages[i].rotation) % 360))
    dst.addPage(page)
  })
  return dst.save()
}
