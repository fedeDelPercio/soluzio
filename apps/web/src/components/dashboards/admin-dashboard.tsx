import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@alquileres/database'
import { FileText, CreditCard, Wrench, Building2, AlertCircle, Clock } from 'lucide-react'

interface AdminDashboardProps {
  perfil: Perfil
}

export async function AdminDashboard({ perfil }: AdminDashboardProps) {
  const supabase = await createClient()
  const db = supabase as any

  const [
    { count: contratosActivos },
    { count: pagosPendientes },
    { count: propiedades },
  ] = await Promise.all([
    db.from('contratos').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    db.from('pagos').select('*', { count: 'exact', head: true }).in('estado', ['pendiente', 'comprobante_subido', 'atrasado']),
    db.from('propiedades').select('*', { count: 'exact', head: true }),
  ])

  const statCards = [
    { label: 'Contratos activos', value: contratosActivos ?? '—', icon: FileText, description: 'Contratos vigentes', href: '/contratos' },
    { label: 'Pagos pendientes', value: pagosPendientes ?? '—', icon: CreditCard, description: 'Por verificar', href: '/pagos' },
    { label: 'Tickets abiertos', value: '—', icon: Wrench, description: 'Solicitudes de mantenimiento', href: '/mantenimiento' },
    { label: 'Propiedades', value: propiedades ?? '—', icon: Building2, description: 'Unidades registradas', href: '/propiedades' },
  ]

  // Pagos atrasados (vencimiento pasado y estado pendiente)
  const hoy = new Date().toISOString().slice(0, 10)
  const { count: pagosAtrasados } = await db
    .from('pagos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
    .lt('fecha_vencimiento', hoy)

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
      {(pagosAtrasados ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">Alertas</h2>
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
