import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import type { Perfil } from '@alquileres/database'
import { CreditCard, Wrench, FileText, AlertCircle, Camera, Zap } from 'lucide-react'
import { formatARS, formatFecha } from '@/lib/utils'

interface InquilinoDashboardProps {
  perfil: Perfil
}

export async function InquilinoDashboard({ perfil }: InquilinoDashboardProps) {
  const { user } = await getSession()
  const supabase  = await createClient()
  const db        = supabase as any

  const hoy = new Date().toISOString().slice(0, 10)

  // Próximo pago: el más cercano pendiente/atrasado (incluye futuros)
  const { data: proximoPagoRaw } = await db
    .from('pagos')
    .select('id, monto_esperado, fecha_vencimiento, contrato_id')
    .in('estado', ['pendiente', 'atrasado'])
    .eq('concepto', 'alquiler')
    .order('fecha_vencimiento', { ascending: true })
    .limit(1)
    .maybeSingle()

  const proximoPago = proximoPagoRaw as any

  // Deuda total: solo pagos YA vencidos sin comprobante
  const { data: pagosDeudaRaw } = await db
    .from('pagos')
    .select('id, monto_esperado, fecha_vencimiento, contrato_id')
    .in('estado', ['pendiente', 'atrasado'])
    .eq('concepto', 'alquiler')
    .lte('fecha_vencimiento', hoy)
    .order('fecha_vencimiento', { ascending: true })

  const pagosDeuda   = (pagosDeudaRaw ?? []) as any[]
  const primerPago   = pagosDeuda[0] ?? proximoPago

  // Solicitudes activas del inquilino
  const { count: solicitudesActivas } = await db
    .from('solicitudes')
    .select('*', { count: 'exact', head: true })
    .not('estado', 'in', '("cerrado","resuelto")')

  // Contrato del inquilino para banner de estado inicial
  const { data: contratoInq } = await db
    .from('contratos')
    .select('id, facturas_servicios_las_carga, estado_inicial_fotos(id)')
    .or(`inquilino_id.eq.${user?.id},coinquilino_id.eq.${user?.id}`)
    .eq('estado', 'activo')
    .limit(1)
    .maybeSingle()

  const contratoInqId    = contratoInq?.id as string | undefined
  const yaSubioFotos     = (contratoInq?.estado_inicial_fotos?.length ?? 0) > 0
  const mostrarBannerEI  = !!contratoInqId && !yaSubioFotos

  // Facturas de servicios pendientes de carga por el inquilino
  // (solo si el contrato designa al inquilino como responsable)
  const inquilinoCargaFacturas =
    (contratoInq?.facturas_servicios_las_carga ?? 'inquilino') === 'inquilino'

  // Facturas pendientes: solo del mes actual o meses anteriores.
  // Los servicios del mes próximo todavía no están en mano del inquilino,
  // por lo que no se cuentan como "por cargar".
  let facturasPendientes = 0
  if (contratoInqId && inquilinoCargaFacturas) {
    const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString().split('T')[0]
    const { data: pagosServRaw } = await db
      .from('pagos')
      .select('id, comprobantes_pago ( tipo_comprobante )')
      .eq('contrato_id', contratoInqId)
      .neq('concepto', 'alquiler')
      .lte('fecha_vencimiento', finMes)

    facturasPendientes = (pagosServRaw ?? []).filter((p: any) => {
      const comps = (p.comprobantes_pago ?? []) as any[]
      return !comps.some((c) => c.tipo_comprobante === 'factura')
    }).length
  }

  const deudaTotal    = pagosDeuda.reduce((s, p) => s + (Number(p.monto_esperado) || 0), 0)
  const mesesVencidos = pagosDeuda.length
  const hayDeuda      = deudaTotal > 0
  const proxVencido   = proximoPago && proximoPago.fecha_vencimiento < hoy

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Buen día, {perfil.nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">Estado de tu alquiler</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Próximo pago */}
        <Link
          href={proximoPago ? `/contratos/${proximoPago.contrato_id}/pagos` : '/pagos'}
          className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Próximo pago</p>
            <CreditCard className="w-4 h-4 text-zinc-400" />
          </div>
          {proximoPago ? (
            <>
              <p className="text-2xl font-semibold text-zinc-900">{formatARS(proximoPago.monto_esperado)}</p>
              <p className="text-xs text-zinc-500">
                {proxVencido ? `Vencido · ${formatFecha(proximoPago.fecha_vencimiento)}` : `Vence ${formatFecha(proximoPago.fecha_vencimiento)}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-green-600">Al día</p>
              <p className="text-xs text-zinc-400">Sin pagos pendientes</p>
            </>
          )}
        </Link>

        {/* Tickets */}
        <Link href="/solicitudes" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Mis tickets</p>
            <Wrench className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{solicitudesActivas ?? 0}</p>
          <p className="text-xs text-zinc-400">Solicitudes activas</p>
        </Link>

        {/* Deuda total */}
        <Link
          href={primerPago ? `/contratos/${primerPago.contrato_id}/pagos` : '/pagos'}
          className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Deuda total</p>
            <FileText className="w-4 h-4 text-zinc-400" />
          </div>
          {hayDeuda ? (
            <>
              <p className="text-2xl font-semibold text-zinc-900">{formatARS(deudaTotal)}</p>
              <p className="text-xs text-zinc-500">
                {mesesVencidos === 1 ? '1 mes impago' : `${mesesVencidos} meses impagos`}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-green-600">$ 0</p>
              <p className="text-xs text-zinc-400">Sin deuda acumulada</p>
            </>
          )}
        </Link>
      </div>

      {/* Banner estado inicial de la vivienda (opcional) */}
      {mostrarBannerEI && (
        <Link
          href={`/contratos/${contratoInqId}/estado-inicial`}
          className="flex items-start gap-3 rounded-md border px-4 py-3 bg-blue-50 border-blue-200 hover:border-blue-300 transition-colors"
        >
          <Camera className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Subí fotos del estado inicial de la vivienda</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Te sirve como respaldo al momento de desocuparla. Es opcional pero recomendado.
            </p>
          </div>
          <span className="text-xs text-blue-700 font-medium flex-shrink-0">Subir →</span>
        </Link>
      )}

      {/* Alerta pagos vencidos */}
      {mesesVencidos > 0 && (
        <Link
          href={primerPago ? `/contratos/${primerPago.contrato_id}/pagos` : '/pagos'}
          className="flex items-start gap-3 rounded-md border px-4 py-3 bg-amber-50 border-amber-200 hover:border-amber-300 transition-colors"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {mesesVencidos === 1 ? 'Tenés 1 pago vencido' : `Tenés ${mesesVencidos} pagos vencidos`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Subí el comprobante para regularizar tu situación.</p>
          </div>
          <span className="text-xs text-amber-700 font-medium flex-shrink-0">Ver pagos →</span>
        </Link>
      )}

      {/* Alerta facturas de servicios pendientes */}
      {facturasPendientes > 0 && contratoInqId && (
        <Link
          href={`/contratos/${contratoInqId}/servicios`}
          className="flex items-start gap-3 rounded-md border px-4 py-3 bg-amber-50 border-amber-200 hover:border-amber-300 transition-colors"
        >
          <Zap className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {facturasPendientes === 1
                ? 'Tenés 1 factura de servicio por cargar'
                : `Tenés ${facturasPendientes} facturas de servicios por cargar`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Subí las facturas y los comprobantes de pago de luz, gas, agua y demás servicios.
            </p>
          </div>
          <span className="text-xs text-amber-700 font-medium flex-shrink-0">Cargar →</span>
        </Link>
      )}

      {/* Historial de pagos */}
      <HistorialPagos />
    </div>
  )
}

async function HistorialPagos() {
  const supabase = await createClient()
  const db = supabase as any

  const hoyStr = new Date().toISOString().slice(0, 10)
  const { data: pagosRaw } = await db
    .from('pagos')
    .select('id, contrato_id, concepto, monto_esperado, fecha_vencimiento, estado, periodos_pago ( anio, mes )')
    .lte('fecha_vencimiento', hoyStr)
    .order('fecha_vencimiento', { ascending: false })
    .limit(6)

  const pagos = (pagosRaw ?? []) as any[]

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const CONCEPTO_LABEL: Record<string, string> = {
    electricidad: 'Electricidad',
    gas: 'Gas',
    agua: 'Agua',
    expensas_ordinarias: 'Expensas',
    expensas_extraordinarias: 'Expensas extraord.',
    municipal: 'ABL / Municipal',
    otro: 'Otro servicio',
  }

  const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
    atrasado:           { label: 'Atrasado',  color: 'text-red-600'   },
    pendiente:          { label: 'Pendiente', color: 'text-zinc-500'  },
    comprobante_subido: { label: 'Comprobante cargado', color: 'text-blue-600' },
    verificado:         { label: 'Verificado',color: 'text-green-600' },
    disputado:          { label: 'Disputado', color: 'text-amber-600' },
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      <div className="px-4 py-3 border-b border-zinc-100">
        <h2 className="text-sm font-medium text-zinc-700">Historial de pagos</h2>
      </div>
      {pagos.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">No hay pagos registrados aún</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {pagos.map((p: any) => {
            const periodo  = p.periodos_pago
            const esServ   = p.concepto !== 'alquiler'
            const esFactPend = esServ && (p.monto_esperado ?? 0) === 0
            const mesLabel = periodo
              ? `${MESES[(periodo.mes ?? 1) - 1]} ${periodo.anio}`
              : formatFecha(p.fecha_vencimiento)
            const label    = esServ
              ? `${CONCEPTO_LABEL[p.concepto] ?? p.concepto} · ${mesLabel}`
              : mesLabel
            const href     = esServ
              ? `/contratos/${p.contrato_id}/servicios`
              : `/contratos/${p.contrato_id}/pagos`
            const estadoKey = p.estado === 'pendiente' && p.fecha_vencimiento < hoyStr ? 'atrasado' : p.estado
            const cfg = ESTADO_CONFIG[estadoKey] ?? { label: estadoKey, color: 'text-zinc-500' }
            return (
              <Link
                key={p.id}
                href={href}
                className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{label}</p>
                  <p className="text-xs text-zinc-400">Vence {formatFecha(p.fecha_vencimiento)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {esFactPend ? (
                    <span className="text-xs font-medium text-amber-600">Pendiente carga de factura</span>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-zinc-900">{formatARS(p.monto_esperado)}</p>
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
