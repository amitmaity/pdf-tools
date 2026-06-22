import { Link, Outlet, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/split', label: 'Split' },
  { to: '/merge', label: 'Merge' },
  { to: '/compress', label: 'Compress' },
  { to: '/organize', label: 'Organize' },
  { to: '/pdf-to-images', label: 'To Images' },
  { to: '/images-to-pdf', label: 'From Images' },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            PDF Tools
          </Link>
          <nav className="flex flex-wrap justify-end gap-1 sm:gap-2">
            {navItems.map(({ to, label }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(to))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="bg-emerald-600 px-4 py-1.5 text-center text-xs font-medium text-white">
          100% private — your files never leave your browser
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-700">
        <a
          href="https://github.com/amitmaity/pdf-tools"
          className="hover:text-indigo-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/amitmaity/pdf-tools
        </a>
      </footer>
    </div>
  )
}
