'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function setupAction(formData: FormData) {
  const supabase = createAdminClient()

  const orgNombre = formData.get('org_nombre') as string
  const orgSlug = (formData.get('org_slug') as string).toLowerCase().replace(/\s+/g, '-')
  const adminEmail = formData.get('email') as string
  const adminPassword = formData.get('password') as string
  const adminNombre = formData.get('nombre') as string
  const adminApellido = formData.get('apellido') as string

  // 1. Crear la organización
  const { data: org, error: orgError } = await supabase
    .from('organizaciones')
    .insert({ nombre: orgNombre, slug: orgSlug })
    .select()
    .single()

  if (orgError) {
    return { error: `Error al crear organización: ${orgError.message}` }
  }

  // 2. Crear el usuario admin con metadatos para que el trigger cree el perfil
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      organizacion_id: org.id,
      rol: 'administrador',
      nombre: adminNombre,
      apellido: adminApellido,
    },
  })

  if (authError) {
    // Rollback: eliminar la org creada
    await supabase.from('organizaciones').delete().eq('id', org.id)
    return { error: `Error al crear usuario: ${authError.message}` }
  }

  // 3. El trigger handle_new_user crea el perfil automáticamente
  // Verificar que se creó correctamente
  const { error: perfilError } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', authUser.user.id)
    .single()

  if (perfilError) {
    // El trigger puede tardar un momento — el login lo resolverá
    console.warn('Perfil no encontrado inmediatamente, el trigger puede estar en proceso')
  }

  redirect('/login')
}
