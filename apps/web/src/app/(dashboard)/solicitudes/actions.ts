'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'
import { createSolicitudSchema, updateSolicitudSchema } from '@alquileres/shared/validators'

export async function crearSolicitudAction(formData: FormData): Promise<void> {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (!['administrador', 'inquilino'].includes(perfil.rol)) return

  const raw = {
    contrato_id: formData.get('contrato_id'),
    tipo: formData.get('tipo'),
    titulo: formData.get('titulo'),
    descripcion: formData.get('descripcion'),
    prioridad: formData.get('prioridad') || 'media',
  }

  const parsed = createSolicitudSchema.safeParse(raw)
  if (!parsed.success) return

  const admin = createAdminClient()
  const db = admin as any

  // Obtener organizacion_id del contrato
  const { data: contrato } = await db
    .from('contratos')
    .select('organizacion_id')
    .eq('id', parsed.data.contrato_id)
    .single()

  if (!contrato) return

  const { data: solicitud, error } = await db
    .from('solicitudes')
    .insert({
      organizacion_id: contrato.organizacion_id,
      contrato_id: parsed.data.contrato_id,
      reportado_por: user.id,
      tipo: parsed.data.tipo,
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion,
      prioridad: parsed.data.prioridad,
    })
    .select('id, tipo')
    .single()

  if (error || !solicitud) return

  revalidatePath('/solicitudes')
  redirect(`/solicitudes/${solicitud.id}`)
}

export async function actualizarSolicitudAction(
  solicitudId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await getSession()
  if (!perfil || perfil.rol !== 'administrador') {
    return { ok: false, error: 'No autorizado' }
  }

  const raw = {
    estado: formData.get('estado') || undefined,
    prioridad: formData.get('prioridad') || undefined,
    responsable_confirmado: formData.get('responsable_confirmado') || undefined,
    respuesta_admin: formData.get('respuesta_admin') || undefined,
  }

  // Eliminar claves undefined
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined && v !== ''),
  )

  const parsed = updateSolicitudSchema.safeParse(cleaned)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }

  const admin = createAdminClient()
  const db = admin as any

  const updateData: Record<string, unknown> = { ...parsed.data }

  if (parsed.data.respuesta_admin) {
    const { user } = await getSession()
    updateData.respondido_por = user?.id
    updateData.respondido_en = new Date().toISOString()
  }

  const { error } = await db
    .from('solicitudes')
    .update(updateData)
    .eq('id', solicitudId)

  if (error) return { ok: false, error: 'Error al actualizar' }

  revalidatePath(`/solicitudes/${solicitudId}`)
  revalidatePath('/solicitudes')
  return { ok: true }
}

export async function getSignedPhotoUrlAction(ruta: string): Promise<string | null> {
  const { perfil } = await getSession()
  if (!perfil) return null

  const admin = createAdminClient()
  const { data } = await admin.storage
    .from('mantenimiento')
    .createSignedUrl(ruta, 3600)

  return data?.signedUrl ?? null
}

export async function insertarFotosSolicitudAction(
  solicitudId: string,
  organizacionId: string,
  rutas: string[],
): Promise<void> {
  const { perfil } = await getSession()
  if (!perfil || !['administrador', 'inquilino'].includes(perfil.rol)) return

  if (rutas.length === 0) return

  const admin = createAdminClient()
  const db = admin as any

  const rows = rutas.map((ruta) => ({
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    ruta_archivo: ruta,
  }))

  await db.from('fotos_solicitud').insert(rows)
}
