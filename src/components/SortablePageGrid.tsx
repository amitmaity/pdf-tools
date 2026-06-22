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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface OrganizePageItem {
  id: string
  pageIndex: number
  dataUrl: string
  rotation: number
}

interface SortablePageGridProps {
  items: OrganizePageItem[]
  onReorder: (items: OrganizePageItem[]) => void
  onRotate: (id: string) => void
  onRemove: (id: string) => void
}

function SortablePageCell({
  item,
  onRotate,
  onRemove,
}: {
  item: OrganizePageItem
  onRotate: (id: string) => void
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
    <div
      ref={setNodeRef}
      style={style}
      className="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
    >
      <button
        type="button"
        className="absolute left-1 top-1 z-10 cursor-grab rounded bg-black/50 p-1 text-white touch-none active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 11.004 0 2 2 0 01-.004 0zM7 8a2 2 0 11.004 0 2 2 0 01-.004 0zM7 14a2 2 0 11.004 0 2 2 0 01-.004 0zM13 2a2 2 0 11.004 0 2 2 0 01-.004 0zM13 8a2 2 0 11.004 0 2 2 0 01-.004 0zM13 14a2 2 0 11.004 0 2 2 0 01-.004 0z" />
        </svg>
      </button>

      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={item.dataUrl}
          alt={`Page ${item.pageIndex + 1}`}
          className="max-h-full max-w-full object-contain transition-transform"
          style={{ transform: `rotate(${item.rotation}deg)` }}
          draggable={false}
        />
      </div>

      <div className="flex items-center justify-between gap-1 bg-black/50 px-2 py-1">
        <span className="text-xs font-semibold text-white">Page {item.pageIndex + 1}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onRotate(item.id)}
            className="rounded p-0.5 text-white hover:bg-white/20"
            aria-label="Rotate 90 degrees"
            title="Rotate 90°"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded p-0.5 text-white hover:bg-red-500/50"
            aria-label="Remove page"
            title="Remove"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function SortablePageGrid({
  items,
  onReorder,
  onRotate,
  onRemove,
}: SortablePageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <SortablePageCell
              key={item.id}
              item={item}
              onRotate={onRotate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
