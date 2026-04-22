'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

export async function verificarPagoAction(pagoId: string): Promise<void> {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') return

  const supabase = await createClient()
  const db = supabase as any

  const { error: compError } = await db
    .from('comprobantes_pago')
    .update({
      pago_recibido: true,
      recibido_por:  user.id,
      recibido_en:   new Date().toISOString(),
    })
    .eq('pago_id', pagoId)
    .eq('pago_recibido', false)

  if (compError) return

  const { error: pagoError } = await db
    .from('pagos')
    .update({ estado: 'verificado', monto_pagado: null })
    .eq('id', pagoId)

  if (pagoError) return

  revalidatePath('/pagos')
  revalidatePath('/overview')
}
