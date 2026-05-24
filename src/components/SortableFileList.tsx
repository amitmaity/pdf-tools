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

export interface MergeFileItem {
  id: string
  file: File
}

interface SortableFileListProps {
  items: MergeFileItem[]
  onReorder: (items: MergeFileItem[]) => void
  onRemove: (id: string) => void
}

function SortableRow({
  item,
  onRemove,
}: {
  item: MergeFileItem
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
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
        {item.file.name}
      </span>
      <span className="text-xs text-slate-500">{(item.file.size / 1024).toFixed(0)} KB</span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Remove file"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}

export function SortableFileList({ items, onReorder, onRemove }: SortableFileListProps) {
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
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((item) => (
            <SortableRow key={item.id} item={item} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
