import { PDFDocument } from 'pdf-lib'

async function loadImageBytes(file: File): Promise<{ bytes: Uint8Array; isJpeg: boolean }> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)

  if (file.type === 'image/jpeg' || file.name.match(/\.jpe?g$/i)) {
    return { bytes, isJpeg: true }
  }
  if (file.type === 'image/png' || file.name.match(/\.png$/i)) {
    return { bytes, isJpeg: false }
  }

  // Convert other image types via canvas
  const blob = new Blob([buf], { type: file.type || 'image/png' })
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not convert image'))),
      'image/png',
    )
  })
  return { bytes: new Uint8Array(await pngBlob.arrayBuffer()), isJpeg: false }
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  for (const file of files) {
    const { bytes, isJpeg } = await loadImageBytes(file)
    const image = isJpeg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)
    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }

  return pdfDoc.save()
}
