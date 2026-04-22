import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatARS, formatFecha } from '@/lib/utils'
import { CheckCircle2, Clock, AlertCircle, Upload, Eye } from 'lucide-react'
import { UploadComprobante } from './upload-comprobante'
import { verificarPagoAction } from '../../../pagos/actions'

const ESTADO_COLOR: Record<string, string> = {
  pendiente:          'text-zinc-500',
  comprobante_subido: 'text-blue-600',
  verificado:         'text-green-600',
  atrasado:           'text-red-600',
  disputado:          'text-amber-600',
}
const ESTADO_ICON: Record<string, React.ElementType> = {
  pendiente:          Clock,
  comprobante_subido: Upload,
  verificado:         CheckCircle2,
  atrasado:           AlertCircle,
  disputado:          AlertCircle,
}
const ESTADO_LABEL: Record<string, string> = {
  pendiente:          'Pendiente',
  comprobante_subido: 'Comprobante cargado',
  verificado:         'Verificado',
  atrasado:           'Atrasado',
  disputado:          'Disputado',
}

type PagoConPeriodo = {
  id: string
  concepto: string
  estado: string
  monto_esperado: number
  fecha_vencimiento: string
  periodos_pago: { anio: number; mes: number } | null
  comprobantes_pago: { id: string; ruta_archivo: string; pago_recibido: boolean }[]
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function ContratoPagosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contratoId } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()
  const db = supabase as any

  // Verificar que el contrato existe y el usuario tiene acceso
  const { data: contrato } = await db
    .from('contratos')
    .select('id, organizacion_id, monto_actual, modalidad_cobro, tasa_punitorio_mensual')
    .eq('id', contratoId)
    .single()

  if (!contrato) notFound()

  // Calculadora de multa por mora (interés simple proporcional a días)
  const calcularMulta = (montoEsperado: number, fechaVenc: Date, hoy: Date): number => {
    if (contrato.modalidad_cobro !== 'estricto') return 0
    if (!contrato.tasa_punitorio_mensual) return 0
    const diffMs = hoy.getTime() - fechaVenc.getTime()
    const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    if (diasAtraso === 0) return 0
    return montoEsperado * (contrato.tasa_punitorio_mensual / 100) * (diasAtraso / 30)
  }

  // Solo hasta el mes en curso (los pagos futuros no son relevantes todavía)
  const hoyDate = new Date()
  const finDeMes = new Date(hoyDate.getFullYear(), hoyDate.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const { data: pagosRaw } = await db
    .from('pagos')
    .select(`
      id, concepto, estado, monto_esperado, fecha_vencimiento,
      periodos_pago ( anio, mes ),
      comprobantes_pago ( id, ruta_archivo, pago_recibido )
    `)
    .eq('contrato_id', contratoId)
    .eq('concepto', 'alquiler')
    .lte('fecha_vencimiento', finDeMes)
    .order('fecha_vencimiento', { ascending: false })

  const pagos = (pagosRaw ?? []) as PagoConPeriodo[]

  // Generar URLs firmadas (1 hora) para los comprobantes existentes
  const comprobantesConUrl: Record<string, string> = {}
  const rutasUnicas = [...new Set(
    pagos.flatMap(p => p.comprobantes_pago.map(c => c.ruta_archivo)).filter(Boolean)
  )]
  if (rutasUnicas.length > 0) {
    const { data: signedUrls } = await (supabase as any).storage
      .from('comprobantes')
      .createSignedUrls(rutasUnicas, 3600)
    ;(signedUrls ?? []).forEach((item: { path: string; signedUrl: string }) => {
      if (item.signedUrl) comprobantesConUrl[item.path] = item.signedUrl
    })
  }

  const esAdmin    = perfil.rol === 'administrador'
  const esInquilino = perfil.rol === 'inquilino'

  const total     = pagos.length
  const verificados = pagos.filter(p => p.estado === 'verificado').length

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Historial de pagos</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{verificados} de {total} pagos verificados</p>
        </div>
        {/* Barra de progreso */}
        <div className="w-32 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: total > 0 ? `${(verificados / total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {pagos.length === 0 ? (
        <p className="text-sm text-zinc-400 py-4 text-center">No hay períodos generados para este contrato.</p>
      ) : (
        <div className="space-y-2">
          {pagos.map((pago) => {
            const periodo    = pago.periodos_pago as any
            const comps      = (pago.comprobantes_pago ?? []) as any[]
            const tieneComp  = comps.length > 0
            const compUrl    = tieneComp ? comprobantesConUrl[comps[0].ruta_archivo] : null
            const IconEstado = ESTADO_ICON[pago.estado] ?? Clock
            const hoy        = new Date()
            const venc       = new Date(pago.fecha_vencimiento + 'T00:00:00')
            const vencido    = pago.estado === 'pendiente' && venc < hoy
            const multa      = vencido ? calcularMulta(pago.monto_esperado, venc, hoy) : 0
            const diasAtraso = vencido ? Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)) : 0

            return (
              <div key={pago.id} className="bg-white border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconEstado className={`w-4 h-4 flex-shrink-0 ${vencido ? 'text-red-500' : ESTADO_COLOR[pago.estado]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">
                        {periodo ? `${MESES[(periodo.mes ?? 1) - 1]} ${periodo.anio}` : formatFecha(pago.fecha_vencimiento)}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Vence {formatFecha(pago.fecha_vencimiento)}
                        {vencido && <span className="text-red-500 ml-1">· Vencido</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">
                      {formatARS(pago.monto_esperado)}
                    </span>
                    <span className={`text-xs font-medium ${vencido ? 'text-red-500' : ESTADO_COLOR[pago.estado]}`}>
                      {vencido ? 'Atrasado' : ESTADO_LABEL[pago.estado]}
                    </span>

                    {/* Ver comprobante */}
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

                    {/* Acción admin: verificar */}
                    {esAdmin && tieneComp && pago.estado === 'comprobante_subido' && (
                      <form action={verificarPagoAction.bind(null, pago.id)}>
                        <button
                          type="submit"
                          className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded-md transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verificar
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Multa por mora (solo si modalidad estricto) */}
                {multa > 0 && (
                  <div className="mt-2 text-xs bg-red-50 border border-red-100 text-red-700 rounded-md px-2.5 py-1.5 flex items-center justify-between">
                    <span>
                      Multa por mora ({diasAtraso} {diasAtraso === 1 ? 'día' : 'días'} × {contrato.tasa_punitorio_mensual}% mensual)
                    </span>
                    <span className="font-semibold">{formatARS(multa)}</span>
                  </div>
                )}

                {/* Acción inquilino: subir comprobante */}
                {esInquilino && (pago.estado === 'pendiente' || pago.estado === 'atrasado') && (
                  <UploadComprobante
                    pagoId={pago.id}
                    contratoId={contratoId}
                    organizacionId={contrato.organizacion_id}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
