import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { FileText, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { ContratoActionsMenu } from './contrato-actions-menu'
import type { Contrato } from '@alquileres/database'

type ContratoListItem = Pick<Contrato, 'id' | 'estado' | 'fecha_inicio' | 'fecha_fin' | 'monto_actual' | 'indice_ajuste'> & {
  propiedades: { calle: string; numero: string; ciudad: string } | null
  inquilino: { nombre: string; apellido: string } | null
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', activo: 'Activo', por_vencer: 'Por vencer',
  vencido: 'Vencido', rescindido: 'Rescindido',
}
const ESTADO_COLOR: Record<string, string> = {
  borrador:    'bg-zinc-100 text-zinc-600',
  activo:      'bg-green-100 text-green-700',
  por_vencer:  'bg-amber-100 text-amber-700',
  vencido:     'bg-red-100 text-red-600',
  rescindido:  'bg-zinc-100 text-zinc-500',
}

export default async function ContratosPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()

  const { data: contratosRaw } = await (supabase as any)
    .from('contratos')
    .select(`id, estado, fecha_inicio, fecha_fin, monto_actual, indice_ajuste, propiedades ( calle, numero, ciudad ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )`)
    .order('creado_en', { ascending: false })
  const contratos = (contratosRaw ?? []) as ContratoListItem[]

  const esAdmin = perfil.rol === 'administrador'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Contratos</h1>
          <p className="text-sm text-zinc-500 mt-1">{contratos?.length ?? 0} contratos registrados</p>
        </div>
        {esAdmin && (
          <Link href="/contratos/nuevo" className={buttonVariants()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo contrato
          </Link>
        )}
      </div>

      {!contratos || contratos.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 px-6 py-16 text-center">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">No hay contratos registrados</p>
          {esAdmin && (
            <p className="text-xs text-zinc-400 mt-1">
              Creá el primer contrato para empezar.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
          {contratos.map((c) => {
            const prop = c.propiedades as any
            const inq  = c.inquilino  as any
            return (
              <div key={c.id} className="relative flex items-center hover:bg-zinc-50 transition-colors">
                <Link
                  href={c.estado === 'borrador' ? `/contratos/${c.id}/documentos` : `/contratos/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 flex-1 min-w-0"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {prop?.calle} {prop?.numero} — {prop?.ciudad}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {inq?.nombre} {inq?.apellido} · {c.fecha_inicio} → {c.fecha_fin}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4 mr-2">
                    <p className="text-sm text-zinc-700 font-medium hidden sm:block">
                      ${c.monto_actual.toLocaleString('es-AR')}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[c.estado]}`}>
                      {ESTADO_LABEL[c.estado]}
                    </span>
                  </div>
                </Link>
                {esAdmin && (
                  <div className="pr-3 flex-shrink-0">
                    <ContratoActionsMenu contratoId={c.id} estado={c.estado} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
