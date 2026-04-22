import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import { InquilinoActionsMenu } from './inquilino-actions-menu'

export default async function InquilinosPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (perfil.rol !== 'administrador' && perfil.rol !== 'inmobiliario') redirect('/overview')
  const esAdmin = perfil.rol === 'administrador'

  const supabase = await createClient()

  const { data: inquilinosRaw } = await (supabase as any)
    .from('perfiles')
    .select(`
      id, nombre, apellido, dni, telefono,
      contratos_como_inquilino:contratos!contratos_inquilino_id_fkey (
        id, estado,
        propiedades ( calle, numero, ciudad )
      ),
      contratos_como_coinquilino:contratos!contratos_coinquilino_id_fkey (
        id, estado,
        propiedades ( calle, numero, ciudad )
      )
    `)
    .eq('rol', 'inquilino')
    .eq('organizacion_id', perfil.organizacion_id)
    .order('apellido', { ascending: true })

  const inquilinos = (inquilinosRaw ?? []) as any[]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Inquilinos</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {inquilinos.length} inquilino{inquilinos.length !== 1 ? 's' : ''} registrado{inquilinos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {inquilinos.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 px-6 py-16 text-center">
          <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">No hay inquilinos registrados</p>
          <p className="text-xs text-zinc-400 mt-1">Se agregan automáticamente al crear contratos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
          {inquilinos.map((inq: any) => {
            const contratos = [
              ...(inq.contratos_como_inquilino ?? []),
              ...(inq.contratos_como_coinquilino ?? []),
            ] as any[]
            const contratoActivo = contratos.find((c: any) => c.estado === 'activo')
            const prop = contratoActivo?.propiedades

            return (
              <div key={inq.id} className="relative flex items-center hover:bg-zinc-50 transition-colors">
                <Link
                  href={`/inquilinos/${inq.id}`}
                  className="flex items-center justify-between px-4 py-3 flex-1 min-w-0 gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900">
                      {inq.apellido}, {inq.nombre}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {inq.dni && <p className="text-xs text-zinc-400">DNI {inq.dni}</p>}
                      {inq.telefono && <p className="text-xs text-zinc-400">{inq.telefono}</p>}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right space-y-0.5 mr-2">
                    {contratoActivo && prop ? (
                      <>
                        <p className="text-xs font-medium text-zinc-700">{prop.calle} {prop.numero}</p>
                        <p className="text-xs text-zinc-400">{prop.ciudad}</p>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        {contratos.length > 0 ? 'Sin contrato activo' : 'Sin contratos'}
                      </span>
                    )}
                  </div>
                </Link>

                {esAdmin && (
                  <div className="pr-3 flex-shrink-0">
                    <InquilinoActionsMenu
                      inquilinoId={inq.id}
                      tieneContratoActivo={!!contratoActivo}
                    />
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
