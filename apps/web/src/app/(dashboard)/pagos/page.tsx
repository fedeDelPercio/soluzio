import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatARS, formatFecha } from '@/lib/utils'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import { verificarPagoAction } from './actions'

const ESTADO_LABEL: Record<string, string> = {
  pendiente:          'Pendiente',
  comprobante_subido: 'Con comprobante',
  verificado:         'Verificado',
  atrasado:           'Atrasado',
  disputado:          'Disputado',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente:          'bg-zinc-100 text-zinc-600',
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
    propiedades: { calle: string; numero: string; ciudad: string } | null
    inquilino: { nombre: string; apellido: string } | null
  } | null
  comprobantes_pago: { id: string; ruta_archivo: string; pago_recibido: boolean }[]
}

export default async function PagosPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()
  const db = supabase as any

  // Construir query según rol
  let query = db
    .from('pagos')
    .select(`
      id, concepto, estado, monto_esperado, fecha_vencimiento, contrato_id,
      contratos (
        propiedades ( calle, numero, ciudad ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
      ),
      comprobantes_pago ( id, ruta_archivo, pago_recibido )
    `)
    .neq('estado', 'verificado')
    .order('fecha_vencimiento', { ascending: true })
    .limit(100)

  const { data: pagosRaw } = await query
  const pagos = (pagosRaw ?? []) as PagoRow[]

  const esAdmin = perfil.rol === 'administrador'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Pagos</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {pagos.length} pago{pagos.length !== 1 ? 's' : ''} pendiente{pagos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {pagos.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 px-6 py-16 text-center">
          <CreditCard className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">No hay pagos pendientes</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
          {pagos.map((pago) => {
            const contrato  = pago.contratos as any
            const prop      = contrato?.propiedades
            const inq       = contrato?.inquilino
            const comps     = (pago.comprobantes_pago ?? []) as any[]
            const tieneComp = comps.length > 0

            return (
              <div key={pago.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {prop?.calle} {prop?.numero} — {prop?.ciudad}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {inq?.nombre} {inq?.apellido} · Vence {formatFecha(pago.fecha_vencimiento)}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-zinc-900 hidden sm:block">
                    {formatARS(pago.monto_esperado)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[pago.estado]}`}>
                    {ESTADO_LABEL[pago.estado]}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
