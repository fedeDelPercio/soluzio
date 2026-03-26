import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Building2, Plus, MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import type { Propiedad } from '@alquileres/database'

type PropiedadItem = Pick<Propiedad, 'id' | 'calle' | 'numero' | 'piso' | 'depto' | 'barrio' | 'ciudad' | 'tipo_propiedad' | 'propietario_id'>

export default async function PropiedadesPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()

  const { data: propiedadesRaw } = await (supabase as any)
    .from('propiedades')
    .select('id, calle, numero, piso, depto, barrio, ciudad, tipo_propiedad, propietario_id')
    .order('creado_en', { ascending: false })
  const propiedades = (propiedadesRaw ?? []) as PropiedadItem[]

  const esAdmin = perfil.rol === 'administrador'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Propiedades</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {propiedades?.length ?? 0} propiedades registradas
          </p>
        </div>
        {esAdmin && (
          <Link href="/propiedades/nueva" className={buttonVariants()}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva propiedad
          </Link>
        )}
      </div>

      {!propiedades || propiedades.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 px-6 py-16 text-center">
          <Building2 className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">No hay propiedades registradas</p>
          {esAdmin && (
            <p className="text-xs text-zinc-400 mt-1">
              Creá la primera propiedad para empezar a gestionar contratos.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((p) => {
            const direccion = [p.calle, p.numero, p.piso && `Piso ${p.piso}`, p.depto].filter(Boolean).join(' ')
            const ubicacion  = [p.barrio, p.ciudad].filter(Boolean).join(', ')
            return (
              <Link
                key={p.id}
                href={`/propiedades/${p.id}`}
                className="bg-white rounded-lg border border-zinc-200 p-4 hover:border-zinc-300 hover:shadow-sm transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-zinc-900 leading-tight">{direccion}</p>
                  </div>
                  <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0 capitalize">
                    {p.tipo_propiedad}
                  </span>
                </div>
                {ubicacion && (
                  <div className="flex items-center gap-1.5 pl-6">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500">{ubicacion}</p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
