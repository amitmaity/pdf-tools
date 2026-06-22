import { Link } from 'react-router-dom'

const tools = [
  {
    to: '/split',
    title: 'Split PDF',
    description: 'Extract selected pages into a new PDF or download one file per page.',
    icon: '✂️',
  },
  {
    to: '/merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one. Drag to reorder before merging.',
    icon: '📎',
  },
  {
    to: '/compress',
    title: 'Compress PDF',
    description: 'Reduce file size by re-encoding embedded images at lower quality.',
    icon: '🗜️',
  },
  {
    to: '/organize',
    title: 'Organize PDF',
    description: 'Reorder, rotate, or remove pages. Extract a subset into a new PDF.',
    icon: '📋',
  },
  {
    to: '/pdf-to-images',
    title: 'PDF to Images',
    description: 'Export each page as PNG or JPEG. Multiple pages download as a ZIP.',
    icon: '🖼️',
  },
  {
    to: '/images-to-pdf',
    title: 'Images to PDF',
    description: 'Combine images into one PDF. Drag to set page order.',
    icon: '📷',
  },
]

export function Home() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
        Free PDF tools
      </h1>
      <p className="mb-8 text-slate-600 dark:text-slate-400">
        Split, merge, compress, organize, and convert PDFs — entirely in your browser. No uploads, no servers.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="text-3xl">{tool.icon}</span>
            <h2 className="mt-3 text-lg font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white">
              {tool.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
