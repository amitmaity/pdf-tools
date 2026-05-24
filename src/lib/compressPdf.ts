import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib'
import { pdfjsLib } from './pdfjs'

export interface CompressResult {
  bytes: Uint8Array
  imagesProcessed: number
  structuralOnly: boolean
}

export async function compressPdf(
  input: Uint8Array,
  quality: number,
  onProgress?: (message: string) => void,
): Promise<CompressResult> {
  const pdfDoc = await PDFDocument.load(input, { ignoreEncryption: true })
  const context = pdfDoc.context
  let imagesProcessed = 0

  const decodedImages = await extractDecodedImageJpegs(input, quality, onProgress)
  const objects = context.enumerateIndirectObjects()

  for (const [ref, obj] of objects) {
    if (!(obj instanceof PDFRawStream)) continue
    const dict = obj.dict
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue
    if (hasMaskOrImageMask(dict)) continue

    const width = getWidth(dict)
    const height = getHeight(dict)
    if (!width || !height) continue

    const decoded = decodedImages.get(ref.tag)
    if (decoded) {
      context.assign(ref, createJpegImageStream(pdfDoc, decoded.jpegBytes, width, height))
      imagesProcessed++
      await yieldToMain()
      continue
    }

    // Fall back to direct stream decoding for simple mask-free image XObjects.
    onProgress?.(`Re-encoding image ${imagesProcessed + 1}...`)

    try {
      const jpegBytes = await reencodeImageXObject(obj, quality)
      if (!jpegBytes) continue

      context.assign(ref, createJpegImageStream(pdfDoc, jpegBytes, width, height))
      imagesProcessed++
    } catch {
      // Skip images we cannot decode
    }
    await yieldToMain()
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true })
  return {
    bytes,
    imagesProcessed,
    structuralOnly: imagesProcessed === 0,
  }
}

interface EncodedPdfJsImage {
  jpegBytes: Uint8Array
}

type ByteArray = Uint8Array | Uint8ClampedArray

interface PdfJsImageData {
  width: number
  height: number
  data?: ByteArray
  bitmap?: ImageBitmap
  kind?: number
  ref?: {
    num?: number
    gen?: number
    objectNumber?: number
    generationNumber?: number
  }
}

async function extractDecodedImageJpegs(
  input: Uint8Array,
  quality: number,
  onProgress?: (message: string) => void,
): Promise<Map<string, EncodedPdfJsImage>> {
  const loadingTask = pdfjsLib.getDocument({ data: toArrayBuffer(input) })
  const pdf = await loadingTask.promise
  const images = new Map<string, EncodedPdfJsImage>()

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress?.(`Scanning page ${pageNumber}/${pdf.numPages}...`)
      const page = await pdf.getPage(pageNumber)
      const operatorList = await page.getOperatorList()

      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i]
        if (
          fn !== pdfjsLib.OPS.paintImageXObject &&
          fn !== pdfjsLib.OPS.paintImageXObjectRepeat
        ) {
          continue
        }

        const objId = operatorList.argsArray[i]?.[0]
        if (typeof objId !== 'string') continue

        const imageData = (await resolvePdfJsObject(page, objId)) as PdfJsImageData | null
        if (!imageData) continue

        const refTag = refTagFromPdfJs(imageData.ref)
        if (!refTag || images.has(refTag)) continue

        const jpegBytes = await encodePdfJsImageToJpeg(imageData, quality)
        if (jpegBytes) images.set(refTag, { jpegBytes })

        await yieldToMain()
      }
    }
  } finally {
    await loadingTask.destroy()
  }

  return images
}

async function resolvePdfJsObject(page: { objs: unknown; commonObjs: unknown }, objId: string) {
  const localObjects = page.objs as PdfJsObjects
  const commonObjects = page.commonObjs as PdfJsObjects

  if (localObjects.has(objId)) return localObjects.get(objId)
  if (commonObjects.has(objId)) return commonObjects.get(objId)

  return new Promise<unknown>((resolve) => {
    localObjects.get(objId, resolve)
  })
}

interface PdfJsObjects {
  get: (objId: string, callback?: (value: unknown) => void) => unknown
  has: (objId: string) => boolean
}

function refTagFromPdfJs(ref: PdfJsImageData['ref']): string | null {
  if (!ref) return null
  const objectNumber = ref.num ?? ref.objectNumber
  const generationNumber = ref.gen ?? ref.generationNumber ?? 0
  if (typeof objectNumber !== 'number') return null
  return `${objectNumber} ${generationNumber} R`
}

async function reencodeImageXObject(
  stream: PDFRawStream,
  quality: number,
): Promise<Uint8Array | null> {
  const dict = stream.dict
  const width = getWidth(dict)
  const height = getHeight(dict)
  if (!width || !height || width > 8192 || height > 8192) return null

  const rgba = await decodeToRgba(stream, width, height)
  if (!rgba) return null

  return encodeRgbaToJpeg(rgba, width, height, quality)
}

async function encodePdfJsImageToJpeg(
  imageData: PdfJsImageData,
  quality: number,
): Promise<Uint8Array | null> {
  const width = imageData.width
  const height = imageData.height
  if (!width || !height || width > 8192 || height > 8192) return null

  if (imageData.bitmap) {
    return encodeDrawableToJpeg(imageData.bitmap, width, height, quality)
  }

  if (!imageData.data) return null

  if (imageData.kind === pdfjsLib.ImageKind.RGBA_32BPP) {
    return encodeRgbaToJpeg(copyToClamped(imageData.data), width, height, quality)
  }
  if (imageData.kind === pdfjsLib.ImageKind.RGB_24BPP) {
    return encodeRgbaToJpeg(rgbToRgba(imageData.data, width, height), width, height, quality)
  }
  if (imageData.kind === pdfjsLib.ImageKind.GRAYSCALE_1BPP) {
    return encodeRgbaToJpeg(gray1BppToRgba(imageData.data, width, height), width, height, quality)
  }

  if (imageData.data.length >= width * height * 4) {
    return encodeRgbaToJpeg(copyToClamped(imageData.data), width, height, quality)
  }
  if (imageData.data.length >= width * height * 3) {
    return encodeRgbaToJpeg(rgbToRgba(imageData.data, width, height), width, height, quality)
  }

  return null
}

async function encodeRgbaToJpeg(
  rgba: ByteArray | null,
  width: number,
  height: number,
  quality: number,
): Promise<Uint8Array | null> {
  if (!rgba) return null

  const canvas = createRasterCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const imageData = new ImageData(copyToClamped(rgba), width, height)
  ctx.putImageData(imageData, 0, 0)

  const blob = await canvasToJpegBlob(canvas, quality)
  return new Uint8Array(await blob.arrayBuffer())
}

async function encodeDrawableToJpeg(
  image: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Uint8Array | null> {
  const canvas = createRasterCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(image, 0, 0, width, height)
  const blob = await canvasToJpegBlob(canvas, quality)
  return new Uint8Array(await blob.arrayBuffer())
}

type RasterCanvas = HTMLCanvasElement | OffscreenCanvas

function createRasterCanvas(width: number, height: number): RasterCanvas {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  return new OffscreenCanvas(width, height)
}

function canvasToJpegBlob(canvas: RasterCanvas, quality: number): Promise<Blob> {
  if ('toBlob' in canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode JPEG'))),
        'image/jpeg',
        quality,
      )
    })
  }

  return canvas.convertToBlob({ type: 'image/jpeg', quality })
}

async function decodeToRgba(
  stream: PDFRawStream,
  width: number,
  height: number,
): Promise<Uint8ClampedArray | null> {
  const dict = stream.dict
  const filter = resolveFilter(dict)
  let raw = stream.contents

  if (filter === 'DCTDecode' || filter === 'JPXDecode') {
    const mime = filter === 'JPXDecode' ? 'image/jp2' : 'image/jpeg'
    try {
      const bitmap = await createImageBitmap(new Blob([toArrayBuffer(raw)], { type: mime }))
      return drawBitmapToRgba(bitmap, width, height)
    } catch {
      return null
    }
  }

  if (filter === 'FlateDecode' || filter === null) {
    try {
      const inflated = await inflate(raw)
      if (!inflated) return null
      raw = inflated
    } catch {
      return null
    }
  }

  const colorSpace = resolveColorSpace(dict)
  const bpc = getBitsPerComponent(dict) ?? 8

  if (colorSpace === 'DeviceRGB' && bpc === 8) {
    return rgbToRgba(raw, width, height)
  }
  if (colorSpace === 'DeviceGray' && bpc === 8) {
    return grayToRgba(raw, width, height)
  }

  // Try decoding raw bytes as JPEG (some PDFs omit Filter)
  try {
    const bitmap = await createImageBitmap(new Blob([toArrayBuffer(raw)], { type: 'image/jpeg' }))
    return drawBitmapToRgba(bitmap, width, height)
  } catch {
    return null
  }
}

function resolveFilter(dict: PDFDict): string | null {
  const filter = dict.get(PDFName.of('Filter'))
  if (filter instanceof PDFName) return filter.decodeText()
  if (filter instanceof PDFArray && filter.size() > 0) {
    const first = filter.get(0)
    if (first instanceof PDFName) return first.decodeText()
  }
  return null
}

function resolveColorSpace(dict: PDFDict): string | null {
  const cs = dict.get(PDFName.of('ColorSpace'))
  if (cs instanceof PDFName) return cs.decodeText()
  return null
}

function hasMaskOrImageMask(dict: PDFDict): boolean {
  return (
    dict.has(PDFName.of('SMask')) ||
    dict.has(PDFName.of('Mask')) ||
    dict.has(PDFName.of('ImageMask'))
  )
}

function createJpegImageStream(
  pdfDoc: PDFDocument,
  jpegBytes: Uint8Array,
  width: number,
  height: number,
) {
  return pdfDoc.context.stream(jpegBytes, {
    Type: 'XObject',
    Subtype: 'Image',
    BitsPerComponent: 8,
    Width: width,
    Height: height,
    ColorSpace: 'DeviceRGB',
    Filter: 'DCTDecode',
    Length: jpegBytes.length,
  })
}

function getWidth(dict: PDFDict): number {
  return getNumber(dict, 'Width') ?? 0
}

function getHeight(dict: PDFDict): number {
  return getNumber(dict, 'Height') ?? 0
}

function getBitsPerComponent(dict: PDFDict): number | null {
  return getNumber(dict, 'BitsPerComponent')
}

function getNumber(dict: PDFDict, key: string): number | null {
  const val = dict.get(PDFName.of(key))
  if (val instanceof PDFNumber) return val.asNumber()
  return null
}

async function drawBitmapToRgba(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const canvas = createRasterCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height)
  return data.data
}

function rgbToRgba(raw: ByteArray, width: number, height: number): Uint8ClampedArray | null {
  const expected = width * height * 3
  if (raw.length < expected) return null
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, j = 0; i < expected; i += 3, j += 4) {
    rgba[j] = raw[i]
    rgba[j + 1] = raw[i + 1]
    rgba[j + 2] = raw[i + 2]
    rgba[j + 3] = 255
  }
  return rgba
}

function grayToRgba(raw: ByteArray, width: number, height: number): Uint8ClampedArray | null {
  const expected = width * height
  if (raw.length < expected) return null
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, j = 0; i < expected; i++, j += 4) {
    rgba[j] = raw[i]
    rgba[j + 1] = raw[i]
    rgba[j + 2] = raw[i]
    rgba[j + 3] = 255
  }
  return rgba
}

function gray1BppToRgba(raw: ByteArray, width: number, height: number) {
  const rgba = new Uint8ClampedArray(width * height * 4)
  let srcPos = 0
  let dstPos = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x % 8 === 0) srcPos = y * Math.ceil(width / 8) + Math.floor(x / 8)
      const bit = 7 - (x % 8)
      const value = raw[srcPos] & (1 << bit) ? 255 : 0
      rgba[dstPos++] = value
      rgba[dstPos++] = value
      rgba[dstPos++] = value
      rgba[dstPos++] = 255
    }
  }

  return rgba
}

async function inflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (!('DecompressionStream' in globalThis)) return null
  const ds = new DecompressionStream('deflate')
  const blob = new Blob([toArrayBuffer(data)])
  const decompressed = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer()
  return new Uint8Array(decompressed)
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function copyToClamped(bytes: ByteArray): Uint8ClampedArray<ArrayBuffer> {
  const copy = new Uint8ClampedArray(new ArrayBuffer(bytes.length))
  copy.set(bytes)
  return copy
}
