import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { User, Bot, CheckCircle2, Clock, AlertCircle, Upload, FolderOpen, Eye } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { formatARS, formatFecha } from '@/lib/utils'
import { UploadComprobante } from './pagos/upload-comprobante'
import { verificarPagoAction } from '../../pagos/actions'
import { ContratoActionsMenu } from '../contrato-actions-menu'
import { DocumentoRow } from './documentos/documento-row'
import { UploadDocumento } from './documentos/upload-documento'
import { PanelAjuste } from './ajuste/panel-ajuste'
import type { Contrato } from '@alquileres/database'
import type { TasaMensual, ResultadoAnalisisContrato } from '@alquileres/shared'

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
    propiedades: {
      calle: string; numero: string; piso: string | null; depto: string | null; ciudad: string; provincia: string
      propietario: { id: string; nombre: string; apellido: string; dni: string | null; telefono: string | null } | null
    } | null
    inquilino:    { id: string; nombre: string; apellido: string; dni: string | null; telefono: string | null } | null
    coinquilino:  { id: string; nombre: string; apellido: string; dni: string | null; telefono: string | null } | null
    garante:      { id: string; nombre: string; apellido: string; dni: string | null } | null
  }

  const { data: contratoRaw } = await supabase
    .from('contratos')
    .select(`
      *,
      propiedades (
        calle, numero, piso, depto, ciudad, provincia,
        propietario:perfiles!propiedades_propietario_id_fkey ( id, nombre, apellido, dni, telefono )
      ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido, dni, telefono ),
      coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido, dni, telefono ),
      garante:perfiles!contratos_garante_id_fkey ( id, nombre, apellido, dni )
    `)
    .eq('id', id)
    .single()

  if (!contratoRaw) notFound()
  const contrato = contratoRaw as unknown as ContratoConRelaciones

  const prop        = contrato.propiedades
  const inq         = contrato.inquilino
  const coinq       = contrato.coinquilino
  const gar         = contrato.garante
  const propietario = prop?.propietario ?? null
  const esAdmin = perfil.rol === 'administrador'

  const INDICE_LABEL: Record<string, string> = { ipc: 'IPC (INDEC)', icl: 'ICL (BCRA)', fijo: 'Fijo' }

  // Determinar si mostrar el panel de ajuste (admin + contrato activo + índice no fijo + vence en ≤30 días)
  let tasasAjuste: TasaMensual[] = []
  const mostrarPanelAjuste = esAdmin
    && contrato.estado === 'activo'
    && contrato.indice_ajuste !== 'fijo'
    && contrato.proxima_fecha_ajuste !== null

  if (mostrarPanelAjuste && contrato.proxima_fecha_ajuste) {
    const hoyDate = new Date()
    const en30Dias = new Date(hoyDate)
    en30Dias.setDate(en30Dias.getDate() + 30)
    const proximaDate = new Date((contrato.proxima_fecha_ajuste as string) + 'T00:00:00')

    if (proximaDate <= en30Dias) {
      // Calcular rango de meses a cargar
      const periodoMeses = contrato.periodo_ajuste_meses ?? 3
      const mesDesde = new Date(proximaDate)
      mesDesde.setMonth(mesDesde.getMonth() - periodoMeses)
      const desdeTotal = mesDesde.getFullYear() * 12 + mesDesde.getMonth() + 1
      const hastaTotal = proximaDate.getFullYear() * 12 + proximaDate.getMonth()

      const { data: tasasRaw } = await (supabase as any)
        .from('indices_ajuste')
        .select('anio, mes, valor_tasa')
        .eq('tipo_indice', contrato.indice_ajuste)
        .gte('anio', mesDesde.getFullYear())
        .lte('anio', proximaDate.getFullYear())
        .order('anio', { ascending: true })
        .order('mes', { ascending: true })

      tasasAjuste = ((tasasRaw ?? []) as TasaMensual[]).filter(t => {
        const total = t.anio * 12 + t.mes
        return total >= desdeTotal && total < hastaTotal
      })
    }
  }

  // ¿Mostrar panel? Solo si la fecha está próxima o ya pasó
  const mostrarPanel = mostrarPanelAjuste
    && contrato.proxima_fecha_ajuste !== null
    && new Date((contrato.proxima_fecha_ajuste as string) + 'T00:00:00') <= (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d })()

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
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLOR[contrato.estado]}`}>
            {ESTADO_LABEL[contrato.estado]}
          </span>
          {esAdmin && <ContratoActionsMenu contratoId={id} estado={contrato.estado} />}
        </div>
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
        {contrato.indice_ajuste !== 'fijo' && (() => {
          // Usar proxima_fecha_ajuste de la BD, o calcular como fallback para contratos existentes
          let proxFecha = contrato.proxima_fecha_ajuste as string | null
          if (!proxFecha) {
            const d = new Date(contrato.fecha_inicio + 'T00:00:00')
            d.setMonth(d.getMonth() + (contrato.periodo_ajuste_meses ?? 3))
            proxFecha = d.toISOString().slice(0, 10)
          }
          const hoyD = new Date()
          const proxD = new Date(proxFecha + 'T00:00:00')
          const diasRestantes = Math.ceil((proxD.getTime() - hoyD.getTime()) / (1000 * 60 * 60 * 24))
          const vencido = diasRestantes < 0
          const proximo = diasRestantes >= 0 && diasRestantes <= 30
          const color   = vencido ? 'text-red-600' : proximo ? 'text-amber-600' : 'text-zinc-900'
          const label   = vencido
            ? `Vencido (${Math.abs(diasRestantes)} días)`
            : proximo
              ? `${formatFecha(proxFecha)} (en ${diasRestantes} días)`
              : formatFecha(proxFecha)
          return (
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Próximo ajuste</p>
              <p className={`text-sm font-medium ${color}`}>{label}</p>
            </div>
          )
        })()}
        {contrato.monto_deposito && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500">Depósito</p>
            <p className="text-sm text-zinc-900">
              {(contrato as any).moneda_deposito === 'usd'
                ? `USD ${contrato.monto_deposito.toLocaleString('es-AR')}`
                : `$${contrato.monto_deposito.toLocaleString('es-AR')}`}
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

      {/* Panel de ajuste */}
      {mostrarPanel && (
        <PanelAjuste
          contratoId={id}
          montoActual={contrato.monto_actual}
          indiceAjuste={contrato.indice_ajuste}
          periodoMeses={contrato.periodo_ajuste_meses ?? 3}
          proximaFechaAjuste={contrato.proxima_fecha_ajuste as string}
          tasas={tasasAjuste}
        />
      )}

      {/* Partes */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-medium text-zinc-700">Partes</p>
        </div>
        <div className="divide-y divide-zinc-100">
          {propietario && (
            <div className="px-4 py-3 flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-900">{propietario.nombre} {propietario.apellido}</p>
                <p className="text-xs text-zinc-500">Propietario{propietario.dni ? ` · DNI ${propietario.dni}` : ''}</p>
              </div>
            </div>
          )}
          {inq && (
            <Link href={`/inquilinos/${inq.id}`} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
              <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">{inq.nombre} {inq.apellido}</p>
                <p className="text-xs text-zinc-500">Inquilino{inq.dni ? ` · DNI ${inq.dni}` : ''}</p>
              </div>
            </Link>
          )}
          {coinq && (
            <Link href={`/inquilinos/${coinq.id}`} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
              <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">{coinq.nombre} {coinq.apellido}</p>
                <p className="text-xs text-zinc-500">Inquilino{coinq.dni ? ` · DNI ${coinq.dni}` : ''}</p>
              </div>
            </Link>
          )}
          {gar && (
            <Link href={`/inquilinos/${gar.id}`} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
              <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">{gar.nombre} {gar.apellido}</p>
                <p className="text-xs text-zinc-500">Garante{gar.dni ? ` · DNI ${gar.dni}` : ''}</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Resumen IA de cláusulas */}
      {(() => {
        const analisis = contrato.ia_analisis_resultado as ResultadoAnalisisContrato | null
        const clausulas = analisis?.clausulas_especiales ?? []
        if (clausulas.length === 0 && !analisis?.notas) return null
        return (
          <div className="bg-white rounded-lg border border-zinc-200">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
              <Bot className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-700">Condiciones del contrato</h2>
              <span className="ml-auto text-xs text-zinc-400">Generado por IA</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              {clausulas.length > 0 && (
                <ul className="space-y-2">
                  {clausulas.map((clausula, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                      {clausula}
                    </li>
                  ))}
                </ul>
              )}
              {analisis?.notas && (
                <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-3">{analisis.notas}</p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Documentos */}
      <DocumentosSection
        contratoId={id}
        organizacionId={contrato.organizacion_id as string}
        esAdmin={esAdmin}
      />

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

      {/* Servicios */}
      {contrato.estado !== 'borrador' && (
        <Link
          href={`/contratos/${id}/servicios`}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">Servicios</p>
            <p className="text-xs text-zinc-500 mt-0.5">Luz, gas, agua y otros servicios del inmueble</p>
          </div>
          <span className="text-xs text-zinc-500">Ver →</span>
        </Link>
      )}

      {/* Estado inicial de la vivienda */}
      {contrato.estado !== 'borrador' && (
        <Link
          href={`/contratos/${id}/estado-inicial`}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">Estado inicial de la vivienda</p>
            <p className="text-xs text-zinc-500 mt-0.5">Fotos que documentan cómo se recibió el inmueble</p>
          </div>
          <span className="text-xs text-zinc-500">Ver →</span>
        </Link>
      )}
    </div>
  )
}

async function DocumentosSection({
  contratoId,
  organizacionId,
  esAdmin,
}: {
  contratoId: string
  organizacionId: string
  esAdmin: boolean
}) {
  const supabase = await createClient()
  const { data: docsRaw } = await (supabase as any)
    .from('documentos')
    .select('id, tipo_documento, estado, creado_en')
    .eq('contrato_id', contratoId)
    .order('creado_en', { ascending: false })

  const docs = (docsRaw ?? []) as {
    id: string; tipo_documento: string; estado: string; creado_en: string
  }[]

  const verificados = docs.filter((d) => d.estado === 'verificado').length

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-700">Documentos</h2>
          {docs.length > 0 && (
            <span className="text-xs text-zinc-400">{verificados}/{docs.length} verificados</span>
          )}
        </div>
        <UploadDocumento contratoId={contratoId} organizacionId={organizacionId} esAdmin={esAdmin} />
      </div>

      {docs.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-zinc-400">No hay documentos subidos aún.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {docs.map((doc) => (
            <DocumentoRow
              key={doc.id}
              documento={doc}
              contratoId={contratoId}
              esAdmin={esAdmin}
            />
          ))}
        </div>
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

  const finDeMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const { data: pagosRaw } = await db
    .from('pagos')
    .select(`id, concepto, estado, monto_esperado, fecha_vencimiento,
      periodos_pago ( anio, mes ),
      comprobantes_pago ( id, ruta_archivo, pago_recibido )`)
    .eq('contrato_id', contratoId)
    .lte('fecha_vencimiento', finDeMes)
    .order('fecha_vencimiento', { ascending: false })

  const pagos = (pagosRaw ?? []) as any[]
  const verificados = pagos.filter((p: any) => p.estado === 'verificado').length
  const hoy = new Date()

  // Generar URLs firmadas para comprobantes existentes
  const comprobantesConUrl: Record<string, string> = {}
  const rutasUnicas = [...new Set(
    pagos.flatMap((p: any) => (p.comprobantes_pago ?? []).map((c: any) => c.ruta_archivo)).filter(Boolean)
  )] as string[]
  if (rutasUnicas.length > 0) {
    const { data: signedUrls } = await (supabase as any).storage
      .from('comprobantes')
      .createSignedUrls(rutasUnicas, 3600)
    ;(signedUrls ?? []).forEach((item: { path: string; signedUrl: string }) => {
      if (item.signedUrl) comprobantesConUrl[item.path] = item.signedUrl
    })
  }

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
            const compUrl   = tieneComp ? comprobantesConUrl[comps[0].ruta_archivo] : null
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">{formatARS(pago.monto_esperado)}</span>
                    <span className={`text-xs font-medium ${estadoColor}`}>{estadoLabel}</span>
                    {tieneComp && compUrl && (
                      <a
                        href={compUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 px-2 py-1 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </a>
                    )}
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
