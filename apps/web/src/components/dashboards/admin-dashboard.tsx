import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@alquileres/database'
import { FileText, CreditCard, Wrench, Building2, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { formatARS, formatFecha } from '@/lib/utils'

interface AdminDashboardProps {
  perfil: Perfil
}

export async function AdminDashboard({ perfil }: AdminDashboardProps) {
  const supabase = await createClient()
  const db = supabase as any

  const hoyStr = new Date().toISOString().slice(0, 10)

  const [
    { count: contratosActivos },
    { count: pagosPendientes },
    { count: ticketsAbiertos },
    { count: propiedades },
  ] = await Promise.all([
    db.from('contratos').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    db.from('pagos')
      .select('*', { count: 'exact', head: true })
      .in('estado', ['pendiente', 'comprobante_subido', 'atrasado'])
      .lte('fecha_vencimiento', hoyStr),
    db.from('solicitudes')
      .select('*', { count: 'exact', head: true })
      .in('estado', ['abierto', 'clasificado', 'asignado', 'en_proceso']),
    db.from('propiedades').select('*', { count: 'exact', head: true }),
  ])

  const statCards = [
    { label: 'Contratos activos', value: contratosActivos ?? '—', icon: FileText, description: 'Contratos vigentes', href: '/contratos' },
    { label: 'Pagos pendientes', value: pagosPendientes ?? '—', icon: CreditCard, description: 'Por verificar', href: '/pagos' },
    { label: 'Tickets abiertos', value: ticketsAbiertos ?? '—', icon: Wrench, description: 'Solicitudes activas', href: '/solicitudes' },
    { label: 'Propiedades', value: propiedades ?? '—', icon: Building2, description: 'Unidades registradas', href: '/propiedades' },
  ]

  const en30DiasStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })()

  // Pagos atrasados (vencimiento pasado y estado pendiente)
  const { count: pagosAtrasados } = await db
    .from('pagos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
    .lt('fecha_vencimiento', hoyStr)

  // Contratos con ajuste próximo (próximos 30 días o ya vencido)
  const { data: ajustesProximosRaw } = await db
    .from('contratos')
    .select(`
      id, monto_actual, proxima_fecha_ajuste, indice_ajuste,
      propiedades ( calle, numero ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
    `)
    .eq('estado', 'activo')
    .neq('indice_ajuste', 'fijo')
    .not('proxima_fecha_ajuste', 'is', null)
    .lte('proxima_fecha_ajuste', en30DiasStr)
    .order('proxima_fecha_ajuste', { ascending: true })
    .limit(10)

  const ajustesProximos = (ajustesProximosRaw ?? []) as {
    id: string
    monto_actual: number
    proxima_fecha_ajuste: string
    indice_ajuste: string
    propiedades: { calle: string; numero: string } | null
    inquilino: { nombre: string; apellido: string } | null
  }[]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Buen día, {perfil.nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen general de la organización</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">{card.label}</p>
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-semibold text-zinc-900">{card.value}</p>
              <p className="text-xs text-zinc-400">{card.description}</p>
            </Link>
          )
        })}
      </div>

      {/* Alertas */}
      {((pagosAtrasados ?? 0) > 0 || ajustesProximos.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">Alertas</h2>

          {(pagosAtrasados ?? 0) > 0 && (
            <Link
              href="/pagos"
              className="flex items-start gap-3 rounded-md border px-4 py-3 bg-red-50 border-red-200 hover:bg-red-100 transition-colors"
            >
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-600">
                  {pagosAtrasados} pago{(pagosAtrasados ?? 0) > 1 ? 's' : ''} atrasado{(pagosAtrasados ?? 0) > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-zinc-500">Inquilinos con vencimiento pasado sin comprobante</p>
              </div>
            </Link>
          )}

          {ajustesProximos.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-blue-100">
                <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm font-medium text-blue-800">
                  {ajustesProximos.length} ajuste{ajustesProximos.length > 1 ? 's' : ''} de alquiler próximo{ajustesProximos.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="divide-y divide-blue-100">
                {ajustesProximos.map(a => {
                  const prop = a.propiedades
                  const inq  = a.inquilino
                  const vencido = a.proxima_fecha_ajuste <= hoyStr
                  return (
                    <Link
                      key={a.id}
                      href={`/contratos/${a.id}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {prop?.calle} {prop?.numero}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {inq?.nombre} {inq?.apellido} · {formatARS(a.monto_actual)}/mes
                        </p>
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 ${vencido ? 'text-red-600' : 'text-blue-700'}`}>
                        {vencido ? 'Vencido' : formatFecha(a.proxima_fecha_ajuste)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actividad reciente: últimos pagos con comprobante */}
      <RecentesPagos />
    </div>
  )
}

async function RecentesPagos() {
  const supabase = await createClient()
  const db = supabase as any

  const { data: pagosRaw } = await db
    .from('pagos')
    .select(`
      id, monto_esperado, fecha_vencimiento, estado,
      contratos (
        propiedades ( calle, numero ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
      )
    `)
    .eq('estado', 'comprobante_subido')
    .order('actualizado_en', { ascending: false })
    .limit(5)

  const pagos = (pagosRaw ?? []) as any[]

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700">Comprobantes por verificar</h2>
        <Link href="/pagos" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">Ver todos →</Link>
      </div>
      {pagos.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">No hay comprobantes pendientes de verificación</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {pagos.map((p: any) => {
            const prop = p.contratos?.propiedades
            const inq  = p.contratos?.inquilino
            return (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{inq?.nombre} {inq?.apellido}</p>
                  <p className="text-xs text-zinc-400">{prop?.calle} {prop?.numero}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  ${(p.monto_esperado ?? 0).toLocaleString('es-AR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
