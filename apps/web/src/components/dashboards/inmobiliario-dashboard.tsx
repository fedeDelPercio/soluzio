import type { Perfil } from '@alquileres/database'
import { FileText, Building2 } from 'lucide-react'

interface InmobiliarioDashboardProps {
  perfil: Perfil
}

export function InmobiliarioDashboard({ perfil }: InmobiliarioDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Buen día, {perfil.nombre}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Tus alquileres activos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Mis alquileres</p>
            <FileText className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">—</p>
          <p className="text-xs text-zinc-400">Contratos activos</p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Propiedades</p>
            <Building2 className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">—</p>
          <p className="text-xs text-zinc-400">Unidades a cargo</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-700">Mis alquileres</h2>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">
            Tus contratos aparecerán aquí en Sprint 1
          </p>
        </div>
      </div>
    </div>
  )
}
