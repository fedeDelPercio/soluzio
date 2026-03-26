import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PropiedadForm } from './propiedad-form'
import type { Perfil } from '@alquileres/database'

export default async function NuevaPropiedadPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()

  const { data: perfilesRaw } = await supabase
    .from('perfiles')
    .select('*')
    .eq('organizacion_id', perfil.organizacion_id)
    .eq('activo', true)
    .in('rol', ['propietario', 'inmobiliario'] as const)
    .order('apellido')

  const perfiles   = (perfilesRaw ?? []) as Perfil[]
  const propietarios  = perfiles.filter((p) => p.rol === 'propietario')
  const inmobiliarios = perfiles.filter((p) => p.rol === 'inmobiliario')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Nueva propiedad</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Registrá una propiedad para luego vincularla a un contrato.
        </p>
      </div>

      <PropiedadForm propietarios={propietarios} inmobiliarios={inmobiliarios} />
    </div>
  )
}
