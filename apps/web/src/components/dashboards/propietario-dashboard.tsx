import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import type { Perfil } from '@alquileres/database'
import { Building2, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { formatARS, formatFecha } from '@/lib/utils'

interface PropietarioDashboardProps {
  perfil: Perfil
}

type PropiedadConContrato = {
  id: string
  calle: string
  numero: string
  ciudad: string
  tipo_propiedad: string
  contratos: {
    id: string
    estado: string
    monto_actual: number
    inquilino: { nombre: string; apellido: string } | null
  }[]
}

export async function PropietarioDashboard({ perfil }: PropietarioDashboardProps) {
  const supabase = await createClient()
  const db = supabase as any

  const inicioMes = new Date()
  inicioMes.setDate(1)
  const inicioMesStr = inicioMes.toISOString().split('T')[0]
  const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const [{ data: propiedadesRaw }, { count: cobrosDelMes }] = await Promise.all([
    db
      .from('propiedades')
      .select(`
        id, calle, numero, ciudad, tipo_propiedad,
        contratos (
          id, estado, monto_actual,
          inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
        )
      `)
      .order('calle', { ascending: true }),
    db
      .from('pagos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'verificado')
      .gte('fecha_vencimiento', inicioMesStr)
      .lte('fecha_vencimiento', finMes),
  ])

  const propiedades = (propiedadesRaw ?? []) as PropiedadConContrato[]
  const totalPropiedades = propiedades.length

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
          <p className="text-2xl font-semibold text-zinc-900">{totalPropiedades}</p>
          <p className="text-xs text-zinc-400">Unidades registradas</p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Cobros del mes</p>
            <CreditCard className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{cobrosDelMes ?? 0}</p>
          <p className="text-xs text-zinc-400">Alquileres verificados</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-700">Mis propiedades</h2>
        </div>

        {propiedades.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No tenés propiedades registradas aún</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {propiedades.map((prop) => {
              const contratos = prop.contratos ?? []
              const contratoActivo = contratos.find(c =>
                ['activo', 'por_vencer'].includes(c.estado)
              )
              const tieneBorrador = contratos.some(c => c.estado === 'borrador')
              const sinContrato = !contratoActivo && !tieneBorrador

              return (
                <div key={prop.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {prop.calle} {prop.numero}
                      </p>
                      <p className="text-xs text-zinc-400">{prop.ciudad} · {prop.tipo_propiedad}</p>
                    </div>

                    {contratoActivo ? (
                      <div className="flex-shrink-0 text-right">
                        <Link
                          href={`/contratos/${contratoActivo.id}`}
                          className="flex items-center gap-1 text-xs text-green-700 font-medium hover:underline"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activo
                        </Link>
                        {contratoActivo.inquilino && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {contratoActivo.inquilino.nombre} {contratoActivo.inquilino.apellido}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                          {formatARS(contratoActivo.monto_actual)}/mes
                        </p>
                      </div>
                    ) : tieneBorrador ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        En proceso
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Sin contrato
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
