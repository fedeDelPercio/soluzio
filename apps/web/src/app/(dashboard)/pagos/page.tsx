import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatARS, formatFecha } from '@/lib/utils'
import { CreditCard, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { verificarPagoAction } from './actions'
import { UploadComprobante } from '../contratos/[id]/pagos/upload-comprobante'
import { PagosFiltros } from './pagos-filtros'

const ESTADO_LABEL: Record<string, string> = {
  pendiente:          'Pendiente',
  futuro:             'Futuro',
  comprobante_subido: 'Con comprobante',
  verificado:         'Verificado',
  atrasado:           'Atrasado',
  disputado:          'Disputado',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente:          'bg-zinc-100 text-zinc-600',
  futuro:             'bg-zinc-50 text-zinc-400',
  comprobante_subido: 'bg-blue-100 text-blue-700',
  verificado:         'bg-green-100 text-green-700',
  atrasado:           'bg-red-100 text-red-600',
  disputado:          'bg-amber-100 text-amber-700',
}

type PagoRow = {
  id: string
  concepto: string
  estado: string
  monto_esperado: number
  fecha_vencimiento: string
  contrato_id: string
  contratos: {
    organizacion_id: string
    propiedades: { calle: string; numero: string; ciudad: string } | null
    inquilino: { nombre: string; apellido: string } | null
  } | null
  comprobantes_pago: { id: string; ruta_archivo: string; pago_recibido: boolean }[]
}

type SearchParams = Promise<{ estado?: string; periodo?: string; propiedad_id?: string; modo?: string }>

export default async function PagosPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const params      = await searchParams
  const esAdmin     = perfil.rol === 'administrador'
  const esInquilino = perfil.rol === 'inquilino'

  const supabase = await createClient()
  const db = supabase as any

  // ── Inquilino: vista simple sin filtros ──────────────────────────────────
  if (esInquilino) {
    const hoy = new Date()
    const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      .toISOString().split('T')[0]

    const [{ data: vencidos }, { data: conComp }] = await Promise.all([
      db.from('pagos')
        .select(`
          id, concepto, estado, monto_esperado, fecha_vencimiento, contrato_id,
          contratos ( organizacion_id, propiedades ( calle, numero, ciudad ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido ) ),
          comprobantes_pago ( id, ruta_archivo, pago_recibido )
        `)
        .in('estado', ['pendiente', 'atrasado'])
        .lte('fecha_vencimiento', finDeMes)
        .order('fecha_vencimiento', { ascending: true })
        .limit(100),
      db.from('pagos')
        .select(`
          id, concepto, estado, monto_esperado, fecha_vencimiento, contrato_id,
          contratos ( organizacion_id, propiedades ( calle, numero, ciudad ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido ) ),
          comprobantes_pago ( id, ruta_archivo, pago_recibido )
        `)
        .eq('estado', 'comprobante_subido')
        .order('fecha_vencimiento', { ascending: true })
        .limit(50),
    ])

    const vistos = new Set<string>()
    const pagos = ([...(conComp ?? []), ...(vencidos ?? [])] as PagoRow[])
      .filter((p) => { if (vistos.has(p.id)) return false; vistos.add(p.id); return true })

    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Mis pagos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {pagos.length} pago{pagos.length !== 1 ? 's' : ''} pendiente{pagos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <PagosList pagos={pagos} esAdmin={false} esInquilino />
      </div>
    )
  }

  // ── Admin: modo explorar con filtros ─────────────────────────────────────
  const modoExplorar = params.modo === 'explorar' || !!params.estado || !!params.periodo || !!params.propiedad_id

  if (modoExplorar) {
    const estadoParam    = params.estado       ?? 'activos'
    const periodoParam   = params.periodo      ?? 'todos'
    const propiedadParam = params.propiedad_id ?? ''

    let query = db
      .from('pagos')
      .select(`
        id, concepto, estado, monto_esperado, fecha_vencimiento, contrato_id,
        contratos (
          organizacion_id,
          propiedades ( calle, numero, ciudad ),
          inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
        ),
        comprobantes_pago ( id, ruta_archivo, pago_recibido )
      `)

    if (estadoParam === 'activos') {
      const hoyStr2 = new Date().toISOString().split('T')[0]
      query = query
        .in('estado', ['pendiente', 'atrasado', 'comprobante_subido'])
        .lte('fecha_vencimiento', hoyStr2)
    } else if (estadoParam !== 'todos') {
      query = query.eq('estado', estadoParam)
    }

    if (periodoParam === 'futuros') {
      const hoy = new Date()
      const primerDiaMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
        .toISOString().split('T')[0]
      query = query.gte('fecha_vencimiento', primerDiaMesSiguiente)
    } else if (periodoParam !== 'todos') {
      const [anio, mes] = periodoParam.split('-').map(Number)
      const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`
      const fin    = new Date(anio, mes, 0).toISOString().split('T')[0]
      query = query.gte('fecha_vencimiento', inicio).lte('fecha_vencimiento', fin)
    }

    query = query.order('fecha_vencimiento', { ascending: true }).limit(200)

    const [{ data: pagosRaw }, { data: propiedadesRaw }] = await Promise.all([
      query,
      db.from('propiedades')
        .select('id, calle, numero, contratos!inner(pagos!inner(id))')
        .order('calle'),
    ])
    let pagos = (pagosRaw ?? []) as PagoRow[]
    const propiedades = (propiedadesRaw ?? []) as { id: string; calle: string; numero: string }[]

    if (propiedadParam) {
      const { data: contratoIds } = await db
        .from('contratos').select('id').eq('propiedad_id', propiedadParam)
      const ids = new Set((contratoIds ?? []).map((c: any) => c.id))
      pagos = pagos.filter((p) => ids.has(p.contrato_id))
    }

    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Suspense>
          <PagosFiltros propiedades={propiedades} totalCount={pagos.length} />
        </Suspense>
        <PagosList pagos={pagos} esAdmin={esAdmin} esInquilino={false} />
      </div>
    )
  }

  // ── Admin: vista default — solo lo que requiere atención ─────────────────
  const hoy = new Date()
  const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const { data: pagosRaw } = await db
    .from('pagos')
    .select(`
      id, concepto, estado, monto_esperado, fecha_vencimiento, contrato_id,
      contratos (
        organizacion_id,
        propiedades ( calle, numero, ciudad ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
      ),
      comprobantes_pago ( id, ruta_archivo, pago_recibido )
    `)
    .in('estado', ['pendiente', 'atrasado', 'comprobante_subido'])
    .lte('fecha_vencimiento', finDeMes)
    .order('fecha_vencimiento', { ascending: true })
    .limit(200)

  const pagos = (pagosRaw ?? []) as PagoRow[]

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Pagos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pagos.length} pago{pagos.length !== 1 ? 's' : ''} requiere{pagos.length === 1 ? '' : 'n'} atención
          </p>
        </div>
        <Link
          href="/pagos?modo=explorar"
          className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Explorar pagos
        </Link>
      </div>

      <PagosList pagos={pagos} esAdmin={esAdmin} esInquilino={false} />
    </div>
  )
}

// ── Componente de lista (compartido) ──────────────────────────────────────

function PagosList({
  pagos,
  esAdmin,
  esInquilino,
}: {
  pagos: PagoRow[]
  esAdmin: boolean
  esInquilino: boolean
}) {
  const hoy = new Date().toISOString().split('T')[0]
  if (pagos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 px-6 py-16 text-center">
        <CreditCard className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-600">No hay pagos para mostrar</p>
        {esAdmin && (
          <p className="text-xs text-zinc-400 mt-1">Todos los pagos del mes están al día</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
      {pagos.map((pago) => {
        const contrato  = pago.contratos as any
        const prop      = contrato?.propiedades
        const inq       = contrato?.inquilino
        const comps      = (pago.comprobantes_pago ?? []) as any[]
        const tieneComp  = comps.length > 0
        const esFuturo   = pago.estado === 'pendiente' && pago.fecha_vencimiento > hoy
        const esAtrasado = pago.estado === 'pendiente' && pago.fecha_vencimiento < hoy
        const estadoVis  = esFuturo ? 'futuro' : esAtrasado ? 'atrasado' : pago.estado
        const puedeSubir = esInquilino && (pago.estado === 'pendiente' || pago.estado === 'atrasado') && !esFuturo

        return (
          <div key={pago.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {prop?.calle} {prop?.numero} — {prop?.ciudad}
                </p>
                <p className="text-xs text-zinc-500">
                  {esAdmin && <>{inq?.nombre} {inq?.apellido} · </>}
                  Vence {formatFecha(pago.fecha_vencimiento)}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="text-sm font-semibold text-zinc-900 hidden sm:block">
                  {formatARS(pago.monto_esperado)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[estadoVis]}`}>
                  {ESTADO_LABEL[estadoVis]}
                </span>

                {esAdmin && tieneComp && pago.estado === 'comprobante_subido' && (
                  <form action={verificarPagoAction.bind(null, pago.id)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verificar
                    </button>
                  </form>
                )}
              </div>
            </div>

            {puedeSubir && (
              <div className="mt-2">
                <UploadComprobante
                  pagoId={pago.id}
                  contratoId={pago.contrato_id}
                  organizacionId={contrato?.organizacion_id ?? ''}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
