import type { PageThumbnail } from '../lib/renderThumbnails'

interface PageThumbGridProps {
  thumbnails: PageThumbnail[]
  selected: Set<number>
  onToggle: (pageIndex: number, shiftKey: boolean) => void
  onSelectAll: () => void
  onClear: () => void
}

export function PageThumbGrid({
  thumbnails,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: PageThumbGridProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {selected.size} of {thumbnails.length} selected
        </span>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-400"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {thumbnails.map((thumb) => {
          const isSelected = selected.has(thumb.pageIndex)
          return (
            <button
              key={thumb.pageIndex}
              type="button"
              onClick={(e) => onToggle(thumb.pageIndex, e.shiftKey)}
              className={`relative overflow-hidden rounded-lg border-2 transition ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-300'
                  : 'border-slate-200 hover:border-indigo-400 dark:border-slate-600'
              }`}
            >
              <img
                src={thumb.dataUrl}
                alt={`Page ${thumb.pageIndex + 1}`}
                className="aspect-[3/4] w-full object-cover bg-white"
              />
              <span
                className={`absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-semibold ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-black/50 text-white'
                }`}
              >
                {thumb.pageIndex + 1}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
