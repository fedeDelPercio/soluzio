import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { User, Bot, CheckCircle2, Clock, AlertCircle, Upload } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { formatARS, formatFecha } from '@/lib/utils'
import { UploadComprobante } from './pagos/upload-comprobante'
import { verificarPagoAction } from '../../pagos/actions'
import type { Contrato } from '@alquileres/database'

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', activo: 'Activo', por_vencer: 'Por vencer',
  vencido: 'Vencido', rescindido: 'Rescindido',
}
const ESTADO_COLOR: Record<string, string> = {
  borrador:   'bg-zinc-100 text-zinc-600',
  activo:     'bg-green-100 text-green-700',
  por_vencer: 'bg-amber-100 text-amber-700',
  vencido:    'bg-red-100 text-red-600',
  rescindido: 'bg-zinc-100 text-zinc-500',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContratoPage({ params }: Props) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()

  type ContratoConRelaciones = Contrato & {
    propiedades: { calle: string; numero: string; piso: string | null; depto: string | null; ciudad: string; provincia: string } | null
    inquilino: { nombre: string; apellido: string; dni: string | null; telefono: string | null } | null
    garante:   { nombre: string; apellido: string; dni: string | null } | null
  }

  const { data: contratoRaw } = await supabase
    .from('contratos')
    .select(`*, propiedades ( calle, numero, piso, depto, ciudad, provincia ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido, dni, telefono ), garante:perfiles!contratos_garante_id_fkey ( nombre, apellido, dni )`)
    .eq('id', id)
    .single()

  if (!contratoRaw) notFound()
  const contrato = contratoRaw as unknown as ContratoConRelaciones

  const prop = contrato.propiedades
  const inq  = contrato.inquilino
  const gar  = contrato.garante
  const esAdmin = perfil.rol === 'administrador'

  const INDICE_LABEL: Record<string, string> = { ipc: 'IPC (INDEC)', icl: 'ICL (BCRA)', fijo: 'Fijo' }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/contratos" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
            ← Contratos
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 mt-1">
            {prop?.calle} {prop?.numero}
            {prop?.piso ? ` Piso ${prop.piso}` : ''}
            {prop?.depto ? ` ${prop.depto}` : ''}
          </h1>
          <p className="text-sm text-zinc-500">{prop?.ciudad}, {prop?.provincia}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLOR[contrato.estado]}`}>
          {ESTADO_LABEL[contrato.estado]}
        </span>
      </div>

      {/* Datos económicos */}
      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Monto actual</p>
          <p className="text-sm font-semibold text-zinc-900">
            ${contrato.monto_actual.toLocaleString('es-AR')} / mes
          </p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Período</p>
          <p className="text-sm text-zinc-900">
            {contrato.fecha_inicio} → {contrato.fecha_fin}
          </p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Ajuste</p>
          <p className="text-sm text-zinc-900">
            {INDICE_LABEL[contrato.indice_ajuste]} · cada {contrato.periodo_ajuste_meses} meses
          </p>
        </div>
        {contrato.monto_deposito && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500">Depósito</p>
            <p className="text-sm text-zinc-900">
              ${contrato.monto_deposito.toLocaleString('es-AR')}
            </p>
          </div>
        )}
        {contrato.vencimiento_seguro_incendio && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500">Vto. seguro incendio</p>
            <p className="text-sm text-zinc-900">{contrato.vencimiento_seguro_incendio}</p>
          </div>
        )}
      </div>

      {/* Partes */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-medium text-zinc-700">Partes</p>
        </div>
        <div className="divide-y divide-zinc-100">
          {inq && (
            <div className="px-4 py-3 flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-900">{inq.nombre} {inq.apellido}</p>
                <p className="text-xs text-zinc-500">Inquilino{inq.dni ? ` · DNI ${inq.dni}` : ''}</p>
              </div>
            </div>
          )}
          {gar && (
            <div className="px-4 py-3 flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-900">{gar.nombre} {gar.apellido}</p>
                <p className="text-xs text-zinc-500">Garante{gar.dni ? ` · DNI ${gar.dni}` : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      {esAdmin && contrato.ia_analisis_resultado && contrato.estado === 'borrador' && (
        <Link href={`/contratos/${id}/analisis`} className={buttonVariants()}>
          <Bot className="w-4 h-4 mr-2" />
          Ver análisis IA y activar
        </Link>
      )}

      {/* Pagos */}
      {contrato.estado !== 'borrador' && (
        <PagosSection contratoId={id} organizacionId={contrato.organizacion_id as string} esAdmin={esAdmin} esInquilino={perfil.rol === 'inquilino'} />
      )}
    </div>
  )
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const ESTADO_PAGO_COLOR: Record<string, string> = {
  pendiente: 'text-zinc-500', comprobante_subido: 'text-blue-600',
  verificado: 'text-green-600', atrasado: 'text-red-600', disputado: 'text-amber-600',
}
const ESTADO_PAGO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', comprobante_subido: 'Con comprobante',
  verificado: 'Verificado', atrasado: 'Atrasado', disputado: 'Disputado',
}

async function PagosSection({ contratoId, organizacionId, esAdmin, esInquilino }: {
  contratoId: string; organizacionId: string; esAdmin: boolean; esInquilino: boolean
}) {
  const supabase = await createClient()
  const db = supabase as any

  const { data: pagosRaw } = await db
    .from('pagos')
    .select(`id, concepto, estado, monto_esperado, fecha_vencimiento,
      periodos_pago ( anio, mes ),
      comprobantes_pago ( id, pago_recibido )`)
    .eq('contrato_id', contratoId)
    .order('fecha_vencimiento', { ascending: true })

  const pagos = (pagosRaw ?? []) as any[]
  const verificados = pagos.filter((p: any) => p.estado === 'verificado').length
  const hoy = new Date()

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Pagos</h2>
          <p className="text-xs text-zinc-500">{verificados} de {pagos.length} verificados</p>
        </div>
        {pagos.length > 0 && (
          <div className="w-28 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(verificados / pagos.length) * 100}%` }} />
          </div>
        )}
      </div>

      {pagos.length === 0 ? (
        <p className="text-xs text-zinc-400 text-center py-4">No hay períodos de pago generados.</p>
      ) : (
        <div className="space-y-2">
          {pagos.map((pago: any) => {
            const periodo   = pago.periodos_pago
            const comps     = pago.comprobantes_pago ?? []
            const tieneComp = comps.length > 0
            const venc      = new Date(pago.fecha_vencimiento + 'T00:00:00')
            const vencido   = pago.estado === 'pendiente' && venc < hoy
            const estadoLabel = vencido ? 'Atrasado' : ESTADO_PAGO_LABEL[pago.estado]
            const estadoColor = vencido ? 'text-red-500' : ESTADO_PAGO_COLOR[pago.estado]

            return (
              <div key={pago.id} className="border border-zinc-100 rounded-md p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {periodo ? `${MESES[(periodo.mes ?? 1) - 1]} ${periodo.anio}` : formatFecha(pago.fecha_vencimiento)}
                    </p>
                    <p className="text-xs text-zinc-400">Vence {formatFecha(pago.fecha_vencimiento)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">{formatARS(pago.monto_esperado)}</span>
                    <span className={`text-xs font-medium ${estadoColor}`}>{estadoLabel}</span>
                    {esAdmin && tieneComp && pago.estado === 'comprobante_subido' && (
                      <form action={verificarPagoAction.bind(null, pago.id)}>
                        <button type="submit" className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded-md transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verificar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                {esInquilino && (pago.estado === 'pendiente' || pago.estado === 'atrasado') && (
                  <UploadComprobante pagoId={pago.id} contratoId={contratoId} organizacionId={organizacionId} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
