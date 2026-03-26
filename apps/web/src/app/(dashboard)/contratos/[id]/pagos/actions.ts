'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

export async function subirComprobanteAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  const pagoId         = formData.get('pago_id') as string
  const contratoId     = formData.get('contrato_id') as string
  const rutaArchivo    = formData.get('ruta_archivo') as string
  const fechaTransf    = (formData.get('fecha_transferencia') as string) || null
  const referencia     = (formData.get('referencia_bancaria') as string) || null

  if (!pagoId || !rutaArchivo) return { error: 'Datos incompletos' }

  const supabase = await createClient()
  const db = supabase as any

  // Insertar comprobante
  const { error: compError } = await db.from('comprobantes_pago').insert({
    organizacion_id:     perfil.organizacion_id,
    pago_id:             pagoId,
    ruta_archivo:        rutaArchivo,
    fecha_transferencia: fechaTransf,
    referencia_bancaria: referencia,
  })
  if (compError) return { error: compError.message }

  // Actualizar estado del pago
  const { error: pagoError } = await db
    .from('pagos')
    .update({ estado: 'comprobante_subido' })
    .eq('id', pagoId)
  if (pagoError) return { error: pagoError.message }

  revalidatePath(`/contratos/${contratoId}/pagos`)
  revalidatePath('/pagos')
  revalidatePath('/overview')
  return { ok: true }
}
