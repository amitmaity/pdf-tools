import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDropzone } from '../components/FileDropzone'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { imagesToPdf } from '../lib/imagesToPdf'
import { downloadBytes } from '../lib/download'

const imageFilter = (f: File) =>
  f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(f.name)

let nextId = 0

interface ImageItem {
  id: string
  file: File
  previewUrl: string
}

function SortableImageRow({
  item,
  onRemove,
}: {
  item: ImageItem
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 11.004 0 2 2 0 01-.004 0zM7 8a2 2 0 11.004 0 2 2 0 01-.004 0zM7 14a2 2 0 11.004 0 2 2 0 01-.004 0zM13 2a2 2 0 11.004 0 2 2 0 01-.004 0zM13 8a2 2 0 11.004 0 2 2 0 01-.004 0zM13 14a2 2 0 11.004 0 2 2 0 01-.004 0z" />
        </svg>
      </button>
      <img
        src={item.previewUrl}
        alt={item.file.name}
        className="h-12 w-12 rounded object-cover"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
        {item.file.name}
      </span>
      <span className="text-xs text-slate-500">{(item.file.size / 1024).toFixed(0)} KB</span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Remove image"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}

export function ImagesToPdf() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  const addFiles = useCallback((files: File[]) => {
    setError(null)
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `img-${++nextId}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ])
  }, [])

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const removed = prev.find((i) => i.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const handleCreate = async () => {
    if (items.length === 0) {
      setError('Add at least one image.')
      return
    }
    setProcessing(true)
    setError(null)
    try {
      const pdf = await imagesToPdf(items.map((i) => i.file))
      downloadBytes(pdf, 'images.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF creation failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Images to PDF</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Combine images into a single PDF. Drag to reorder before creating.
      </p>

      <FileDropzone
        onFiles={addFiles}
        multiple
        label="Drop images here or click to add"
        accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp"
        filter={imageFilter}
        hint="JPEG, PNG, GIF, WebP, BMP"
      />

      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {items.map((item) => (
                  <SortableImageRow key={item.id} item={item} onRemove={handleRemove} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={processing}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? 'Creating...' : 'Create PDF'}
            </button>
            <button
              type="button"
              onClick={() => {
                items.forEach((item) => URL.revokeObjectURL(item.previewUrl))
                setItems([])
              }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-600"
            >
              Clear all
            </button>
          </div>
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
