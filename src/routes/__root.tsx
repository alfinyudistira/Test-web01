import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { motion } from 'framer-motion'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30">
      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-white font-black tracking-tighter text-xl">PULSE<span className="text-blue-500">.IQ</span></h1>
            <div className="flex gap-1">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/candidates">Candidates</NavLink>
              <NavLink to="/analytics">Analytics</NavLink>
            </div>
          </div>
          <Link to="/settings" className="p-2 hover:bg-white/5 rounded-full transition-colors">⚙️</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      <TanStackRouterDevtools />
    </div>
  ),
})

function NavLink({ to, children }: { to: string, children: React.ReactNode }) {
  return (
    <Link 
      to={to} 
      activeProps={{ className: 'bg-white/10 text-white' }}
      className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-all"
    >
      {children}
    </Link>
  )
}

