import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap, ChevronRight } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export default async function ServiciosIndexPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()
  const db       = supabase as any

  // Traer los contratos visibles para el usuario (RLS filtra según rol)
  const { data: contratosRaw } = await db
    .from('contratos')
    .select(`
      id, estado, servicios_aplicables,
      propiedades ( calle, numero, ciudad )
    `)
    .in('estado', ['activo', 'por_vencer'])
    .order('estado', { ascending: true })

  const contratos = (contratosRaw ?? []) as Array<{
    id: string
    estado: string
    servicios_aplicables: string[]
    propiedades: { calle: string; numero: string; ciudad: string } | null
  }>

  // Si hay un solo contrato activo, redirigir directo a sus servicios
  if (contratos.length === 1) {
    redirect(`/contratos/${contratos[0].id}/servicios`)
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-zinc-400" /> Servicios
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Luz, gas, agua, expensas y otros servicios. Seleccioná el contrato.
        </p>
      </div>

      {contratos.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-500">
          No tenés contratos activos con servicios cargados.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
          {contratos.map((c) => {
            const prop = c.propiedades
            const servicios = c.servicios_aplicables ?? []
            return (
              <Link
                key={c.id}
                href={`/contratos/${c.id}/servicios`}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {prop ? `${prop.calle} ${prop.numero}` : 'Contrato'}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {servicios.length > 0
                      ? `${servicios.length} ${servicios.length === 1 ? 'servicio' : 'servicios'} aplicables`
                      : 'Sin servicios aplicables'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
