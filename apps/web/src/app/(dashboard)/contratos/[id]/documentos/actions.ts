'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

const SIGNED_URL_EXPIRY = 3600 // 1 hora

// Registra un documento ya subido a Storage en la tabla documentos
export async function registrarDocumentoAction(
  contratoId: string,
  tipoDocumento: string,
  rutaArchivo: string,
) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autenticado' }

  const puedeSubir =
    perfil.rol === 'administrador' ||
    (perfil.rol === 'inquilino' &&
      ['dni_inquilino', 'seguro_incendio', 'otro'].includes(tipoDocumento))

  if (!puedeSubir) return { error: 'No autorizado para subir este tipo de documento' }

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db.from('documentos').insert({
    organizacion_id: perfil.organizacion_id,
    contrato_id: contratoId,
    tipo_documento: tipoDocumento,
    estado: 'subido',
    ruta_archivo: rutaArchivo,
  })

  if (error) return { error: error.message }

  revalidatePath(`/contratos/${contratoId}`)
  return { ok: true }
}

// Genera una signed URL (1h) para ver o descargar un documento.
// La autorización se valida vía RLS en la tabla documentos.
export async function getSignedUrlAction(
  documentoId: string,
): Promise<{ url: string } | { error: string }> {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autenticado' }

  const supabase = await createClient()
  const db = supabase as any

  // Si el SELECT pasa, RLS confirmó que el usuario tiene acceso
  const { data: doc } = await db
    .from('documentos')
    .select('id, ruta_archivo')
    .eq('id', documentoId)
    .single()

  if (!doc?.ruta_archivo) return { error: 'Documento no encontrado' }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage
    .from('documentos')
    .createSignedUrl(doc.ruta_archivo, SIGNED_URL_EXPIRY)

  if (error) return { error: error.message }
  return { url: data.signedUrl }
}

// Marca un documento como verificado (solo admin)
export async function verificarDocumentoAction(documentoId: string, contratoId: string) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db
    .from('documentos')
    .update({ estado: 'verificado', verificado_por: user.id })
    .eq('id', documentoId)
    .eq('organizacion_id', perfil.organizacion_id)

  if (error) return { error: error.message }

  revalidatePath(`/contratos/${contratoId}`)
  return { ok: true }
}

// Elimina un documento de Storage y de la tabla (solo admin)
export async function eliminarDocumentoAction(documentoId: string, contratoId: string) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()
  const db = supabase as any

  const { data: doc } = await db
    .from('documentos')
    .select('id, ruta_archivo')
    .eq('id', documentoId)
    .eq('organizacion_id', perfil.organizacion_id)
    .single()

  if (!doc) return { error: 'Documento no encontrado' }

  // Eliminar de Storage
  if (doc.ruta_archivo) {
    const adminClient = createAdminClient()
    await adminClient.storage.from('documentos').remove([doc.ruta_archivo])
  }

  // Eliminar de la tabla
  const { error } = await db
    .from('documentos')
    .delete()
    .eq('id', documentoId)
    .eq('organizacion_id', perfil.organizacion_id)

  if (error) return { error: error.message }

  revalidatePath(`/contratos/${contratoId}`)
  return { ok: true }
}
