'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { NavItem } from './nav-items'
import type { Perfil } from '@alquileres/database'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard, FileText, CreditCard, Wrench,
  Building2, Settings, User, LogOut, X, MessageSquare, Briefcase, Zap,
} from 'lucide-react'
import { logoutAction } from '@/app/(auth)/login/actions'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, FileText, CreditCard, Wrench, Building2, Settings, User, MessageSquare, Briefcase, Zap,
}

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  propietario: 'Propietario',
  inquilino: 'Inquilino',
  inmobiliario: 'Inmobiliario',
}

interface SidebarProps {
  perfil: Perfil
  navItems: NavItem[]
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ perfil, navItems, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const initials = `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()

  return (
    <>
      {/* Backdrop mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-zinc-900 text-zinc-100 transition-transform duration-200',
        'lg:relative lg:translate-x-0 lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-800">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-zinc-900 text-xs font-bold">S</span>
          </div>
          <span className="font-semibold text-sm flex-1">Soluzio</span>
          {/* Botón cerrar — solo mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-400 hover:text-zinc-100 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon]
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                )}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-zinc-700 text-zinc-100 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">
                {perfil.nombre} {perfil.apellido}
              </p>
              <p className="text-xs text-zinc-500 truncate">{ROL_LABEL[perfil.rol]}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-zinc-500 hover:text-zinc-100 transition-colors p-1"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
