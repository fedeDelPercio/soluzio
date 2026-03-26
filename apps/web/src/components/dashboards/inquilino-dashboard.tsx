import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import type { Perfil } from '@alquileres/database'
import { CreditCard, Wrench, FileText, AlertCircle } from 'lucide-react'
import { formatARS, formatFecha } from '@/lib/utils'

interface InquilinoDashboardProps {
  perfil: Perfil
}

export async function InquilinoDashboard({ perfil }: InquilinoDashboardProps) {
  const { user } = await getSession()
  const supabase  = await createClient()
  const db        = supabase as any

  // Próximo pago pendiente
  const { data: proximoPagoRaw } = await db
    .from('pagos')
    .select('id, monto_esperado, fecha_vencimiento, contrato_id')
    .in('estado', ['pendiente', 'atrasado'])
    .order('fecha_vencimiento', { ascending: true })
    .limit(1)
    .maybeSingle()

  const proximoPago = proximoPagoRaw as any

  // Documentos pendientes del contrato del inquilino
  const { count: docsPendientes } = await db
    .from('documentos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')

  const hoy = new Date().toISOString().slice(0, 10)
  const vencido = proximoPago && proximoPago.fecha_vencimiento < hoy

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
          className={`bg-white rounded-lg border p-4 space-y-3 hover:border-zinc-300 transition-colors ${vencido ? 'border-red-200' : 'border-zinc-200'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Próximo pago</p>
            <CreditCard className={`w-4 h-4 ${vencido ? 'text-red-400' : 'text-zinc-400'}`} />
          </div>
          {proximoPago ? (
            <>
              <p className={`text-2xl font-semibold ${vencido ? 'text-red-600' : 'text-zinc-900'}`}>
                {formatARS(proximoPago.monto_esperado)}
              </p>
              <p className={`text-xs ${vencido ? 'text-red-500' : 'text-zinc-400'}`}>
                {vencido ? '⚠ Vencido · ' : 'Vence '}{formatFecha(proximoPago.fecha_vencimiento)}
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
        <Link href="/mantenimiento" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Mis tickets</p>
            <Wrench className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">—</p>
          <p className="text-xs text-zinc-400">Solicitudes activas</p>
        </Link>

        {/* Documentos */}
        <Link href="/documentos" className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Documentos</p>
            <FileText className="w-4 h-4 text-zinc-400" />
          </div>
          <p className={`text-2xl font-semibold ${(docsPendientes ?? 0) > 0 ? 'text-amber-600' : 'text-zinc-900'}`}>
            {docsPendientes ?? 0}
          </p>
          <p className="text-xs text-zinc-400">Pendientes de subir</p>
        </Link>
      </div>

      {/* Alerta pago vencido */}
      {vencido && (
        <div className="flex items-start gap-3 rounded-md border px-4 py-3 bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-600">Tenés un pago vencido</p>
            <p className="text-xs text-zinc-500">Subí el comprobante para regularizar tu situación.</p>
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      <HistorialPagos />
    </div>
  )
}

async function HistorialPagos() {
  const supabase = await createClient()
  const db = supabase as any

  const { data: pagosRaw } = await db
    .from('pagos')
    .select('id, monto_esperado, fecha_vencimiento, estado, periodos_pago ( anio, mes )')
    .order('fecha_vencimiento', { ascending: false })
    .limit(6)

  const pagos = (pagosRaw ?? []) as any[]

  const ESTADO_COLOR: Record<string, string> = {
    pendiente: 'text-zinc-500', comprobante_subido: 'text-blue-600',
    verificado: 'text-green-600', atrasado: 'text-red-600',
  }
  const ESTADO_LABEL: Record<string, string> = {
    pendiente: 'Pendiente', comprobante_subido: 'Enviado',
    verificado: 'Verificado', atrasado: 'Atrasado',
  }
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

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
            const periodo = p.periodos_pago
            const label   = periodo
              ? `${MESES[(periodo.mes ?? 1) - 1]} ${periodo.anio}`
              : formatFecha(p.fecha_vencimiento)
            const hoy = new Date().toISOString().slice(0, 10)
            const estado = p.estado === 'pendiente' && p.fecha_vencimiento < hoy ? 'atrasado' : p.estado
            return (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{label}</p>
                  <p className="text-xs text-zinc-400">Vence {formatFecha(p.fecha_vencimiento)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-zinc-900">{formatARS(p.monto_esperado)}</p>
                  <span className={`text-xs font-medium ${ESTADO_COLOR[estado] ?? 'text-zinc-500'}`}>
                    {ESTADO_LABEL[estado] ?? estado}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
