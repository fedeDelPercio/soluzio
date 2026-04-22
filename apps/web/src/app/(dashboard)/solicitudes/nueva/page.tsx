import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { SolicitudForm } from './solicitud-form'

export default async function NuevaSolicitudPage() {
  const { perfil } = await requireSession()

  if (!['administrador', 'inquilino'].includes(perfil?.rol ?? '')) {
    redirect('/solicitudes')
  }

  const supabase = await createClient()
  const db = supabase as any

  const { data: contratos } = await db
    .from('contratos')
    .select(`
      id,
      propiedades ( calle, numero, ciudad )
    `)
    .eq('estado', 'activo')
    .order('creado_en', { ascending: false })
    .limit(50)

  const contratosList = (contratos ?? []).map((c: any) => ({
    id: c.id,
    label: c.propiedades
      ? `${c.propiedades.calle} ${c.propiedades.numero} — ${c.propiedades.ciudad}`
      : c.id,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Nueva solicitud</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Contanos qué necesitás y te respondemos a la brevedad.
        </p>
      </div>
      <SolicitudForm contratos={contratosList} esAdmin={perfil?.rol === 'administrador'} />
    </div>
  )
}
