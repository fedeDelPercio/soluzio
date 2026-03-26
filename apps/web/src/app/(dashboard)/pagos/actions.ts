'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

export async function verificarPagoAction(pagoId: string) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') {
    return { error: 'No autorizado' }
  }

  const supabase = await createClient()
  const db = supabase as any

  // Marcar comprobante como recibido
  const { error: compError } = await db
    .from('comprobantes_pago')
    .update({
      pago_recibido: true,
      recibido_por:  user.id,
      recibido_en:   new Date().toISOString(),
    })
    .eq('pago_id', pagoId)
    .eq('pago_recibido', false)

  if (compError) return { error: compError.message }

  // Actualizar estado del pago
  const { error: pagoError } = await db
    .from('pagos')
    .update({ estado: 'verificado', monto_pagado: null })
    .eq('id', pagoId)

  if (pagoError) return { error: pagoError.message }

  revalidatePath('/pagos')
  revalidatePath('/overview')
  return { ok: true }
}
