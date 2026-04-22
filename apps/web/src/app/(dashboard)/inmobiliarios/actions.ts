'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

export async function crearInmobiliarioAction(formData: FormData): Promise<{ error?: string; ok?: true; id?: string }> {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') return { error: 'No autorizado' }

  const nombre   = (formData.get('nombre') as string)?.trim()
  const apellido = (formData.get('apellido') as string)?.trim()
  const email    = (formData.get('email') as string)?.trim()
  const telefono = (formData.get('telefono') as string)?.trim() || null
  const dni      = (formData.get('dni') as string)?.trim() || null

  if (!nombre || !apellido || !email) {
    return { error: 'Nombre, apellido y email son obligatorios.' }
  }

  const admin = createAdminClient()

  // Verificar si ya existe un usuario con ese email
  const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    return { error: 'Ya existe un usuario con ese email.' }
  }

  // Crear usuario
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      organizacion_id: perfil.organizacion_id,
      rol: 'inmobiliario',
      nombre,
      apellido,
      telefono,
    },
  })

  if (userErr || !userData?.user) return { error: userErr?.message ?? 'Error al crear usuario' }

  // Actualizar DNI en perfil si fue provisto
  if (dni) {
    const supabase = await createClient()
    await (supabase as any).from('perfiles').update({ dni }).eq('id', userData.user.id)
  }

  revalidatePath('/inmobiliarios')
  return { ok: true, id: userData.user.id }
}

export async function editarInmobiliarioAction(inmobiliarioId: string, formData: FormData): Promise<void> {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') redirect('/login')

  const supabase = await createClient()
  const admin    = createAdminClient()

  const nuevoEmail = (formData.get('email') as string).trim()

  const { error } = await (supabase as any)
    .from('perfiles')
    .update({
      nombre:   formData.get('nombre') as string,
      apellido: formData.get('apellido') as string,
      dni:      (formData.get('dni') as string) || null,
      telefono: (formData.get('telefono') as string) || null,
    })
    .eq('id', inmobiliarioId)
    .eq('organizacion_id', perfil.organizacion_id)
    .eq('rol', 'inmobiliario')

  if (error) redirect(`/inmobiliarios`)

  if (nuevoEmail) {
    await admin.auth.admin.updateUserById(inmobiliarioId, { email: nuevoEmail })
  }

  revalidatePath('/inmobiliarios')
  redirect('/inmobiliarios')
}

export async function eliminarInmobiliarioAction(inmobiliarioId: string) {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()

  // Verificar que no tenga propiedades a cargo
  const { count: propCount } = await (supabase as any)
    .from('propiedades')
    .select('id', { count: 'exact', head: true })
    .eq('inmobiliario_id', inmobiliarioId)

  if ((propCount ?? 0) > 0) {
    return { error: 'No se puede eliminar: este inmobiliario tiene propiedades asignadas. Reasigná o borrá esas propiedades primero.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(inmobiliarioId)
  if (error) return { error: error.message }

  revalidatePath('/inmobiliarios')
  redirect('/inmobiliarios')
}
