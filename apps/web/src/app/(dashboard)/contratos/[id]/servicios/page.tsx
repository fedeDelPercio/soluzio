import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Zap, Flame, Droplet, Building2, Home, FileText, CheckCircle2, Eye, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatARS, formatFecha } from '@/lib/utils'
import { CrearPagoServicio } from './crear-pago-servicio'
import { UploadArchivoServicio } from './upload-archivo-servicio'

interface Props {
  params: Promise<{ id: string }>
}

const CONCEPTO_LABEL: Record<string, string> = {
  electricidad: 'Electricidad',
  gas: 'Gas',
  agua: 'Agua',
  expensas_ordinarias: 'Expensas ordinarias',
  expensas_extraordinarias: 'Expensas extraordinarias',
  municipal: 'ABL / Municipal',
  otro: 'Otro',
}

const CONCEPTO_ICON: Record<string, React.ElementType> = {
  electricidad: Zap,
  gas: Flame,
  agua: Droplet,
  expensas_ordinarias: Building2,
  expensas_extraordinarias: Building2,
  municipal: Home,
  otro: FileText,
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function ServiciosPage({ params }: Props) {
  const { id: contratoId } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()
  const db       = supabase as any

  const { data: contrato } = await db
    .from('contratos')
    .select(`
      id, organizacion_id, inquilino_id, coinquilino_id,
      facturas_servicios_las_carga,
      propiedad_id, propiedades ( propietario_id, calle, numero, piso, depto, ciudad )
    `)
    .eq('id', contratoId)
    .single()

  if (!contrato) notFound()

  const esAdmin       = perfil.rol === 'administrador'
  const esInquilino   = user.id === contrato.inquilino_id || user.id === contrato.coinquilino_id
  const esPropietario = user.id === (contrato.propiedades as any)?.propietario_id
  const rolDesignado  = contrato.facturas_servicios_las_carga ?? 'inquilino'

  if (!esAdmin && !esInquilino && !esPropietario) redirect(`/contratos/${contratoId}`)

  const puedeCargar   = esAdmin
    || (rolDesignado === 'inquilino' && esInquilino)
    || (rolDesignado === 'propietario' && esPropietario)

  // Traer pagos de servicios (todos los conceptos menos alquiler).
  // Mostramos hasta fin del mes próximo: pasados, mes actual y el siguiente.
  const hoy        = new Date()
  const finMesProx = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0)
    .toISOString().split('T')[0]

  const { data: pagosRaw } = await db
    .from('pagos')
    .select(`
      id, concepto, estado, monto_esperado, monto_pagado, fecha_vencimiento,
      periodos_pago ( anio, mes ),
      comprobantes_pago ( id, ruta_archivo, tipo_comprobante, pago_recibido )
    `)
    .eq('contrato_id', contratoId)
    .neq('concepto', 'alquiler')
    .lte('fecha_vencimiento', finMesProx)
    .order('fecha_vencimiento', { ascending: false })

  const pagos = (pagosRaw ?? []) as any[]

  // URLs firmadas para los archivos
  const admin = createAdminClient()
  const rutas = pagos.flatMap((p) => (p.comprobantes_pago ?? []).map((c: any) => c.ruta_archivo)).filter(Boolean)
  const signedMap: Record<string, string> = {}
  if (rutas.length > 0) {
    const { data: signed } = await (admin.storage.from('comprobantes') as any).createSignedUrls(rutas, 3600)
    ;(signed ?? []).forEach((s: { path: string; signedUrl: string }) => {
      if (s.signedUrl) signedMap[s.path] = s.signedUrl
    })
  }

  const prop   = contrato.propiedades
  const titulo = [prop?.calle, prop?.numero, prop?.piso && `Piso ${prop.piso}`, prop?.depto]
    .filter(Boolean).join(' ')

  // Clasificar pagos en tres grupos
  const inicioMesProxStr = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
    .toISOString().split('T')[0]

  const pendientes: any[] = []
  const proximos:   any[] = []
  const cargados:   any[] = []

  for (const p of pagos) {
    const comps   = (p.comprobantes_pago ?? []) as any[]
    const factura = comps.find((c) => c.tipo_comprobante === 'factura')
    const tieneAlgo = comps.length > 0
    if (factura || tieneAlgo) {
      cargados.push(p)
    } else if (p.fecha_vencimiento >= inicioMesProxStr) {
      proximos.push(p)
    } else {
      pendientes.push(p)
    }
  }

  // Pendientes: más viejos primero para que el inquilino vea los más urgentes
  pendientes.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))

  const renderPago = (pago: any) => {
    const IconEstado = CONCEPTO_ICON[pago.concepto] ?? FileText
    const periodo    = pago.periodos_pago
    const mesLabel   = periodo ? `${MESES[(periodo.mes ?? 1) - 1]} ${periodo.anio}` : formatFecha(pago.fecha_vencimiento)
    const comps      = pago.comprobantes_pago ?? []
    const factura    = comps.find((c: any) => c.tipo_comprobante === 'factura')
    const compPago   = comps.find((c: any) => c.tipo_comprobante === 'pago')
    const facturaUrl = factura ? signedMap[factura.ruta_archivo] : null
    const compUrl    = compPago ? signedMap[compPago.ruta_archivo] : null

    return (
      <div key={pago.id} className="bg-white border border-zinc-200 rounded-lg p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <IconEstado className="w-4 h-4 flex-shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900">
                {CONCEPTO_LABEL[pago.concepto] ?? pago.concepto}
              </p>
              <p className="text-xs text-zinc-400">
                {pago.monto_esperado > 0 ? formatARS(pago.monto_esperado) : 'Monto aún no cargado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {pago.estado === 'verificado' && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
              </span>
            )}
            <span className="text-xs font-medium text-zinc-600">{mesLabel}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Slot factura */}
          <div className="border border-zinc-100 rounded-md p-2.5 bg-zinc-50/50">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1.5">Factura</p>
            {factura && facturaUrl ? (
              <a
                href={facturaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900"
              >
                <Eye className="w-3.5 h-3.5" /> Ver factura
              </a>
            ) : puedeCargar ? (
              <UploadArchivoServicio
                pagoId={pago.id}
                contratoId={contratoId}
                organizacionId={contrato.organizacion_id}
                tipo="factura"
                pedirMonto={pago.monto_esperado === 0 || pago.monto_esperado == null}
              />
            ) : (
              <p className="text-xs text-zinc-400 italic">Pendiente</p>
            )}
          </div>

          {/* Slot comprobante de pago */}
          <div className="border border-zinc-100 rounded-md p-2.5 bg-zinc-50/50">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1.5">Comprobante de pago</p>
            {compPago && compUrl ? (
              <a
                href={compUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900"
              >
                <Eye className="w-3.5 h-3.5" /> Ver comprobante
              </a>
            ) : puedeCargar ? (
              <UploadArchivoServicio
                pagoId={pago.id}
                contratoId={contratoId}
                organizacionId={contrato.organizacion_id}
                tipo="pago"
                pedirMonto={false}
              />
            ) : (
              <p className="text-xs text-zinc-400 italic">Pendiente</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const Seccion = ({ titulo, descripcion, items }: { titulo: string; descripcion: string; items: any[] }) => (
    <div className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-zinc-800">{titulo}</h2>
        <p className="text-xs text-zinc-400">{descripcion}</p>
      </div>
      <div className="space-y-2">{items.map(renderPago)}</div>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link href={`/contratos/${contratoId}`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> {titulo || 'Contrato'}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 mt-1">Servicios</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Luz, gas, agua, expensas y otros servicios del inmueble. Carga la factura y el comprobante de pago de cada mes.
        </p>
      </div>

      {!esInquilino && (
        <div className="flex items-start gap-2 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-400" />
          <p>Las facturas las carga el <strong>{rolDesignado === 'inquilino' ? 'inquilino' : 'propietario'}</strong>. Se puede cambiar en la edición del contrato.</p>
        </div>
      )}

      {puedeCargar && <CrearPagoServicio contratoId={contratoId} />}

      {pagos.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-500">
          Todavía no hay pagos de servicios cargados.
        </div>
      ) : (
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <Seccion
              titulo="Pendientes"
              descripcion="Facturas del mes actual y meses anteriores sin cargar."
              items={pendientes}
            />
          )}
          {proximos.length > 0 && (
            <Seccion
              titulo="Próximos"
              descripcion="Servicios del próximo mes."
              items={proximos}
            />
          )}
          {cargados.length > 0 && (
            <Seccion
              titulo="Historial"
              descripcion="Servicios ya cargados."
              items={cargados}
            />
          )}
        </div>
      )}
    </div>
  )
}
