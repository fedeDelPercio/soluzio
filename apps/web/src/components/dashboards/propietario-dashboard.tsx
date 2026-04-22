import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@alquileres/database'
import { Building2, CreditCard, CheckCircle2, Clock, AlertCircle, Wrench } from 'lucide-react'
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
    fecha_fin: string | null
    inquilino: { nombre: string; apellido: string } | null
  }[]
}

export async function PropietarioDashboard({ perfil }: PropietarioDashboardProps) {
  const supabase = await createClient()
  const db = supabase as any

  const hoyStr = new Date().toISOString().slice(0, 10)
  const inicioMes = new Date()
  inicioMes.setDate(1)
  const inicioMesStr = inicioMes.toISOString().split('T')[0]
  const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const en90dias = new Date()
  en90dias.setDate(en90dias.getDate() + 90)
  const en90diasStr = en90dias.toISOString().split('T')[0]

  const [
    { data: propiedadesRaw },
    { count: cobrosDelMes },
    { count: pagosPorCobrar },
    { data: pagosAtrasadosRaw },
    { data: ultimosPagosRaw },
    { count: solicitudesActivas },
  ] = await Promise.all([
    db
      .from('propiedades')
      .select(`
        id, calle, numero, ciudad, tipo_propiedad,
        contratos (
          id, estado, monto_actual, fecha_fin,
          inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
        )
      `)
      .order('calle', { ascending: true }),
    db.from('pagos').select('*', { count: 'exact', head: true })
      .eq('estado', 'verificado')
      .gte('fecha_vencimiento', inicioMesStr)
      .lte('fecha_vencimiento', finMes),
    db.from('pagos').select('*', { count: 'exact', head: true })
      .eq('estado', 'comprobante_subido')
      .gte('fecha_vencimiento', inicioMesStr)
      .lte('fecha_vencimiento', finMes),
    db.from('pagos')
      .select(`
        id, contrato_id, monto_esperado, fecha_vencimiento,
        contratos ( propiedades ( calle, numero ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido ) )
      `)
      .eq('estado', 'pendiente')
      .lt('fecha_vencimiento', hoyStr)
      .order('fecha_vencimiento', { ascending: true })
      .limit(5),
    db.from('pagos')
      .select(`
        id, contrato_id, monto_esperado, fecha_vencimiento, estado,
        contratos ( propiedades ( calle, numero ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido ) )
      `)
      .eq('estado', 'verificado')
      .order('fecha_vencimiento', { ascending: false })
      .limit(5),
    db.from('solicitudes').select('*', { count: 'exact', head: true })
      .not('estado', 'in', '("cerrado","resuelto")'),
  ])

  const propiedades = (propiedadesRaw ?? []) as PropiedadConContrato[]
  const totalPropiedades = propiedades.length
  const pagosAtrasados = (pagosAtrasadosRaw ?? []) as any[]
  const ultimosPagos   = (ultimosPagosRaw ?? []) as any[]

  // Contratos que vencen en los próximos 90 días
  const contratosPorVencer = propiedades.flatMap((p) =>
    p.contratos?.filter((c) => c.estado === 'activo' && c.fecha_fin && c.fecha_fin >= hoyStr && c.fecha_fin <= en90diasStr)
      .map((c) => ({ ...c, propiedad: p })) ?? []
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Buen día, {perfil.nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen de tus propiedades</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <CheckCircle2 className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-green-600">{cobrosDelMes ?? 0}</p>
          <p className="text-xs text-zinc-400">Verificados</p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Por cobrar</p>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <p className={`text-2xl font-semibold ${(pagosPorCobrar ?? 0) > 0 ? 'text-amber-600' : 'text-zinc-900'}`}>
            {pagosPorCobrar ?? 0}
          </p>
          <p className="text-xs text-zinc-400">Comprobante por verificar</p>
        </div>
        <Link href="/solicitudes" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Solicitudes</p>
            <Wrench className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{solicitudesActivas ?? 0}</p>
          <p className="text-xs text-zinc-400">Activas</p>
        </Link>
      </div>

      {/* Alertas de pagos atrasados */}
      {pagosAtrasados.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200">
          <div className="px-4 py-3 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-medium text-red-700">Pagos atrasados</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {pagosAtrasados.map((p) => {
              const prop = p.contratos?.propiedades
              const inq  = p.contratos?.inquilino
              return (
                <Link
                  key={p.id}
                  href={`/contratos/${p.contrato_id}/pagos`}
                  className="px-4 py-3 flex items-center justify-between hover:bg-red-50/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {prop ? `${prop.calle} ${prop.numero}` : 'Propiedad'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {inq ? `${inq.nombre} ${inq.apellido} · ` : ''}Vencía {formatFecha(p.fecha_vencimiento)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-600 flex-shrink-0 ml-3">
                    {formatARS(p.monto_esperado)}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Contratos por vencer */}
      {contratosPorVencer.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200">
          <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-medium text-amber-700">Contratos que vencen en 90 días</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {contratosPorVencer.map((c) => (
              <Link
                key={c.id}
                href={`/contratos/${c.id}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-amber-50/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {c.propiedad.calle} {c.propiedad.numero}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {c.inquilino ? `${c.inquilino.nombre} ${c.inquilino.apellido} · ` : ''}Vence {c.fecha_fin ? formatFecha(c.fecha_fin) : '—'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Propiedades + últimos cobros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mis propiedades */}
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
                const contratoActivo = contratos.find(c => ['activo', 'por_vencer'].includes(c.estado))
                const tieneBorrador = contratos.some(c => c.estado === 'borrador')

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

        {/* Últimos cobros */}
        <div className="bg-white rounded-lg border border-zinc-200">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-700">Últimos cobros</h2>
          </div>
          {ultimosPagos.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-400">Todavía no hay cobros verificados.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {ultimosPagos.map((p) => {
                const prop = p.contratos?.propiedades
                const inq  = p.contratos?.inquilino
                return (
                  <Link
                    key={p.id}
                    href={`/contratos/${p.contrato_id}/pagos`}
                    className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {prop ? `${prop.calle} ${prop.numero}` : 'Propiedad'}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {inq ? `${inq.nombre} ${inq.apellido} · ` : ''}{formatFecha(p.fecha_vencimiento)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-green-600 flex-shrink-0 ml-3">
                      {formatARS(p.monto_esperado)}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
