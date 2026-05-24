import { saveAs } from 'file-saver'

export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename)
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime = 'application/pdf'): void {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([buffer], { type: mime })
  downloadBlob(blob, filename)
}
