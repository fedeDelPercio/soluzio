import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@alquileres/database'
import { Building2, FileText, CreditCard, AlertCircle, Eye } from 'lucide-react'
import { formatARS, formatFecha } from '@/lib/utils'

interface InmobiliarioDashboardProps {
  perfil: Perfil
}

export async function InmobiliarioDashboard({ perfil }: InmobiliarioDashboardProps) {
  const supabase = await createClient()
  const db       = supabase as any

  const hoyStr = new Date().toISOString().slice(0, 10)
  const inicioMes = new Date()
  inicioMes.setDate(1)
  const inicioMesStr = inicioMes.toISOString().split('T')[0]
  const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  // Las RLS ya filtran por inmobiliario_id automáticamente
  const [
    { count: totalPropiedades },
    { count: totalContratos },
    { count: cobrosVerificados },
    { count: pagosAtrasados },
    { data: proxVencimientosRaw },
  ] = await Promise.all([
    db.from('propiedades').select('*', { count: 'exact', head: true }),
    db.from('contratos').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    db.from('pagos').select('*', { count: 'exact', head: true })
      .eq('estado', 'verificado')
      .gte('fecha_vencimiento', inicioMesStr)
      .lte('fecha_vencimiento', finMes),
    db.from('pagos').select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .lt('fecha_vencimiento', hoyStr),
    db.from('pagos')
      .select(`
        id, contrato_id, monto_esperado, fecha_vencimiento, estado,
        contratos ( propiedades ( calle, numero ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido ) )
      `)
      .eq('estado', 'pendiente')
      .gte('fecha_vencimiento', hoyStr)
      .order('fecha_vencimiento', { ascending: true })
      .limit(5),
  ])

  const proxVencimientos = (proxVencimientosRaw ?? []) as any[]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Buen día, {perfil.nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">Estado de las propiedades que cediste a la administradora</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
        <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Tu acceso es de <strong>solo lectura</strong>. Podés ver toda la información relacionada con tus propiedades pero no modificarla.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/propiedades" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Propiedades</p>
            <Building2 className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{totalPropiedades ?? 0}</p>
          <p className="text-xs text-zinc-400">Unidades a cargo</p>
        </Link>
        <Link href="/contratos" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Contratos activos</p>
            <FileText className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{totalContratos ?? 0}</p>
          <p className="text-xs text-zinc-400">Vigentes</p>
        </Link>
        <Link href="/pagos" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Cobros del mes</p>
            <CreditCard className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{cobrosVerificados ?? 0}</p>
          <p className="text-xs text-zinc-400">Alquileres verificados</p>
        </Link>
        <Link href="/pagos?estado=activos" className={`bg-white rounded-lg border p-4 space-y-3 hover:border-zinc-300 transition-colors ${(pagosAtrasados ?? 0) > 0 ? 'border-red-200' : 'border-zinc-200'}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Pagos atrasados</p>
            <AlertCircle className={`w-4 h-4 ${(pagosAtrasados ?? 0) > 0 ? 'text-red-400' : 'text-zinc-400'}`} />
          </div>
          <p className={`text-2xl font-semibold ${(pagosAtrasados ?? 0) > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{pagosAtrasados ?? 0}</p>
          <p className="text-xs text-zinc-400">A revisar</p>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-700">Próximos vencimientos</h2>
        </div>
        {proxVencimientos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">No hay pagos pendientes por vencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {proxVencimientos.map((p) => {
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
                      {inq ? `${inq.nombre} ${inq.apellido} · ` : ''}Vence {formatFecha(p.fecha_vencimiento)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 flex-shrink-0 ml-3">
                    {formatARS(p.monto_esperado)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
