'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

export async function subirComprobanteAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  // Solo admin e inquilino pueden subir comprobantes.
  if (!['administrador', 'inquilino'].includes(perfil.rol)) {
    return { error: 'No tenés permiso para subir comprobantes' }
  }

  const pagoId         = formData.get('pago_id') as string
  const contratoId     = formData.get('contrato_id') as string
  const rutaArchivo    = formData.get('ruta_archivo') as string
  const fechaTransf    = (formData.get('fecha_transferencia') as string) || null
  const referencia     = (formData.get('referencia_bancaria') as string) || null

  if (!pagoId || !rutaArchivo) return { error: 'Datos incompletos' }

  // Usar admin client para las escrituras — el inquilino solo tiene SELECT en pagos
  const admin = createAdminClient()
  const adminDb = admin as any

  // Verificar que el pago pertenece a la organización del usuario
  const { data: pago } = await adminDb
    .from('pagos')
    .select('id, organizacion_id, contrato_id, contratos!inner(inquilino_id, coinquilino_id)')
    .eq('id', pagoId)
    .eq('organizacion_id', perfil.organizacion_id)
    .single()
  if (!pago) return { error: 'Pago no encontrado' }

  // Si es inquilino, debe ser inquilino o coinquilino del contrato del pago.
  if (perfil.rol === 'inquilino') {
    const ctr = (pago as any).contratos
    if (ctr?.inquilino_id !== user.id && ctr?.coinquilino_id !== user.id) {
      return { error: 'No podés subir comprobante para este pago' }
    }
  }

  // Insertar comprobante
  const { error: compError } = await adminDb.from('comprobantes_pago').insert({
    organizacion_id:     perfil.organizacion_id,
    pago_id:             pagoId,
    ruta_archivo:        rutaArchivo,
    fecha_transferencia: fechaTransf,
    referencia_bancaria: referencia,
  })
  if (compError) return { error: compError.message }

  // Actualizar estado del pago
  const { error: pagoError } = await adminDb
    .from('pagos')
    .update({ estado: 'comprobante_subido' })
    .eq('id', pagoId)
  if (pagoError) return { error: pagoError.message }

  revalidatePath(`/contratos/${contratoId}/pagos`)
  revalidatePath('/pagos')
  revalidatePath('/overview')
  return { ok: true }
}
