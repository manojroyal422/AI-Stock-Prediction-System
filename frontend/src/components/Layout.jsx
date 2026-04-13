import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, TrendingUp, GitCompare, Filter,
  FlaskConical, Star, Bell, Settings, Menu, X, Search
} from 'lucide-react'
import SearchBar from './SearchBar'
import MarketTicker from './MarketTicker'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/screener',  icon: Filter,          label: 'Screener'    },
  { to: '/compare',   icon: GitCompare,      label: 'Compare'     },
  { to: '/backtest',  icon: FlaskConical,    label: 'Backtest'    },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-gray-900 border-r border-gray-800
        flex flex-col transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800">
          <span className="text-indigo-400 font-bold text-lg tracking-tight">
            📈 StockPro
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 w-full transition-colors">
            <Settings size={17} /> Settings
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-gray-100">
            <Menu size={20} />
          </button>

          <div className="flex-1 max-w-md">
            <SearchBar onSelect={sym => navigate(`/stock/${sym}`)} />
          </div>

          <div className="flex-1 hidden xl:block overflow-hidden">
            <MarketTicker />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
