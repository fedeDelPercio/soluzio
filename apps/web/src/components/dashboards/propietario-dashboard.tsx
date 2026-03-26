import type { Perfil } from '@alquileres/database'
import { Building2, CreditCard } from 'lucide-react'

interface PropietarioDashboardProps {
  perfil: Perfil
}

export function PropietarioDashboard({ perfil }: PropietarioDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Buen día, {perfil.nombre}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen de tus propiedades</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Mis propiedades</p>
            <Building2 className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">—</p>
          <p className="text-xs text-zinc-400">Unidades registradas</p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Cobros del mes</p>
            <CreditCard className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">—</p>
          <p className="text-xs text-zinc-400">Alquileres verificados</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-700">Mis propiedades</h2>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">
            Tus propiedades aparecerán aquí en Sprint 1
          </p>
        </div>
      </div>
    </div>
  )
}
