'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { dispararNotificacion } from '@/lib/notifications/dispatch'

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

// P8: Rechazar un comprobante de pago. Marca el pago como 'disputado'
// y dispara la notificación al inquilino + admins.
export async function rechazarComprobanteAction(
  comprobanteId: string,
  pagoId:        string,
  motivo?:       string,
): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await getSession()
  if (!perfil || perfil.rol !== 'administrador') return { ok: false, error: 'No autorizado' }

  const supabase = await createClient()
  const db = supabase as any

  // Marcar el pago como disputado para que aparezca en la UI como atención.
  const { error: pagoErr } = await db
    .from('pagos')
    .update({ estado: 'disputado' })
    .eq('id', pagoId)
    .eq('organizacion_id', perfil.organizacion_id)

  if (pagoErr) return { ok: false, error: pagoErr.message }

  await dispararNotificacion('comprobante_rechazado', comprobanteId, motivo ? { motivo } : undefined)

  revalidatePath('/pagos')
  revalidatePath('/overview')
  return { ok: true }
}
