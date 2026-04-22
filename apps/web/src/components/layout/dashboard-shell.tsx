'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import type { NavItem } from './nav-items'
import type { Perfil } from '@alquileres/database'

interface Props {
  perfil: Perfil
  navItems: NavItem[]
  children: React.ReactNode
}

export function DashboardShell({ perfil, navItems, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        perfil={perfil}
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50">
        {/* Header mobile — solo visible en pantallas pequeñas */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-500 hover:text-zinc-900 transition-colors p-1 -ml-1"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-zinc-900">Alquileres</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
