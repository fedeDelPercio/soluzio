'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import type { TablesInsert } from '@alquileres/database'

export async function crearPropiedadAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') {
    return { error: 'No autorizado' }
  }

  const supabase = await createClient()

  const propietario_id = formData.get('propietario_id') as string
  const inmobiliario_id = (formData.get('inmobiliario_id') as string) || null

  const payload: TablesInsert<'propiedades'> = {
    organizacion_id: perfil.organizacion_id,
    propietario_id,
    inmobiliario_id: inmobiliario_id || null,
    calle:          formData.get('calle') as string,
    numero:         formData.get('numero') as string,
    piso:           (formData.get('piso') as string) || null,
    depto:          (formData.get('depto') as string) || null,
    barrio:         (formData.get('barrio') as string) || null,
    ciudad:         formData.get('ciudad') as string,
    provincia:      (formData.get('provincia') as string) || 'Buenos Aires',
    codigo_postal:  (formData.get('codigo_postal') as string) || null,
    tipo_propiedad: formData.get('tipo_propiedad') as string,
  }

  const { data, error } = await (supabase as any)
    .from('propiedades')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { error: (error as any).message }

  redirect(`/propiedades/${(data as any).id}`)
}

export async function eliminarPropiedadAction(propiedadId: string) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') {
    return { error: 'No autorizado' }
  }

  const supabase = await createClient()
  const db = supabase as any

  // Verificar que no tenga contratos activos o en borrador
  const { data: contratos } = await db
    .from('contratos')
    .select('id, estado')
    .eq('propiedad_id', propiedadId)
    .in('estado', ['activo', 'borrador', 'por_vencer'])
    .limit(1)

  if (contratos && contratos.length > 0) {
    return { error: 'No se puede eliminar una propiedad con contratos activos.' }
  }

  const { error } = await db
    .from('propiedades')
    .delete()
    .eq('id', propiedadId)
    .eq('organizacion_id', perfil.organizacion_id)

  if (error) return { error: (error as any).message }

  revalidatePath('/propiedades')
  return { ok: true }
}
