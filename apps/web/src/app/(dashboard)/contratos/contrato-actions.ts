'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

export async function rescindirContratoAction(id: string) {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()
  await (supabase as any)
    .from('contratos')
    .update({ estado: 'rescindido' })
    .eq('id', id)

  revalidatePath('/contratos')
  redirect('/contratos')
}

export async function eliminarContratoAction(id: string) {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()
  await (supabase as any).from('contratos').delete().eq('id', id)

  revalidatePath('/contratos')
  redirect('/contratos')
}
