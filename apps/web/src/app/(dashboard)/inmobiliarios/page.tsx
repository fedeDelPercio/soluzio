import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, Mail, Phone, Building2, ChevronRight } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { CrearInmobiliario } from './crear-inmobiliario'

export default async function InmobiliariosPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()
  const db       = supabase as any

  const { data: inmobiliariosRaw } = await db
    .from('perfiles')
    .select(`
      id, nombre, apellido, dni, telefono,
      propiedades:propiedades!propiedades_inmobiliario_id_fkey ( id )
    `)
    .eq('rol', 'inmobiliario')
    .order('apellido')

  // Emails vienen de auth.users — los tomamos del admin client
  const inmobiliarios = (inmobiliariosRaw ?? []) as Array<{
    id: string
    nombre: string
    apellido: string
    dni: string | null
    telefono: string | null
    propiedades: { id: string }[]
  }>

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-zinc-400" /> Inmobiliarios
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Agentes externos que ceden propiedades a la administradora. Acceden en modo solo lectura.
          </p>
        </div>
      </div>

      <CrearInmobiliario />

      {inmobiliarios.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-500">
          Todavía no hay inmobiliarios cargados. Usá "Nuevo inmobiliario" para crear el primero.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
          {inmobiliarios.map((i) => (
            <div key={i.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{i.nombre} {i.apellido}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400 mt-0.5">
                  {i.telefono && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {i.telefono}</span>
                  )}
                  {i.dni && <span>DNI {i.dni}</span>}
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {i.propiedades?.length ?? 0} {(i.propiedades?.length ?? 0) === 1 ? 'propiedad' : 'propiedades'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
