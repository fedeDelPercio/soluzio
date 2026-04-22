'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

export async function editarInquilinoAction(inquilinoId: string, formData: FormData): Promise<void> {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') redirect('/login')

  const supabase = await createClient()
  const admin = createAdminClient()

  const nuevoEmail = (formData.get('email') as string).trim()

  // Actualizar perfil
  const { error } = await (supabase as any)
    .from('perfiles')
    .update({
      nombre:   formData.get('nombre') as string,
      apellido: formData.get('apellido') as string,
      dni:      (formData.get('dni') as string) || null,
      telefono: (formData.get('telefono') as string) || null,
    })
    .eq('id', inquilinoId)
    .eq('organizacion_id', perfil.organizacion_id)

  if (error) redirect(`/inquilinos/${inquilinoId}`)

  // Actualizar email en auth.users si fue provisto
  if (nuevoEmail) {
    await admin.auth.admin.updateUserById(inquilinoId, { email: nuevoEmail })
  }

  revalidatePath(`/inquilinos/${inquilinoId}`)
  revalidatePath('/inquilinos')
  redirect(`/inquilinos/${inquilinoId}`)
}

export async function eliminarInquilinoAction(inquilinoId: string) {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()

  // Verificar que no tenga contratos activos
  const { data: contratos } = await (supabase as any)
    .from('contratos')
    .select('id')
    .eq('inquilino_id', inquilinoId)
    .eq('estado', 'activo')
    .limit(1)

  if (contratos && contratos.length > 0) {
    return { error: 'No se puede eliminar un inquilino con contratos activos.' }
  }

  // Eliminar el usuario de auth (cascada elimina el perfil)
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(inquilinoId)
  if (error) return { error: error.message }

  revalidatePath('/inquilinos')
  redirect('/inquilinos')
}
