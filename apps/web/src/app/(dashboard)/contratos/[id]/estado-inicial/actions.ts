'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

export async function registrarFotoEstadoInicialAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  const contratoId  = formData.get('contrato_id') as string
  const rutaArchivo = formData.get('ruta_archivo') as string
  const descripcion = (formData.get('descripcion') as string)?.trim() || null

  if (!contratoId || !rutaArchivo) return { error: 'Datos incompletos' }

  const admin = createAdminClient()
  const db    = admin as any

  // Verificar que el contrato existe y que el usuario tiene acceso
  const { data: contrato } = await db
    .from('contratos')
    .select('id, organizacion_id, inquilino_id, coinquilino_id')
    .eq('id', contratoId)
    .eq('organizacion_id', perfil.organizacion_id)
    .single()

  if (!contrato) return { error: 'Contrato no encontrado' }

  const esInquilinoDelContrato = contrato.inquilino_id === user.id || contrato.coinquilino_id === user.id
  if (!esInquilinoDelContrato && perfil.rol !== 'administrador') {
    return { error: 'No podés subir fotos a este contrato' }
  }

  // Límite de 30 fotos por contrato
  const { count } = await admin
    .from('estado_inicial_fotos')
    .select('id', { count: 'exact', head: true })
    .eq('contrato_id', contratoId)

  if ((count ?? 0) >= 30) return { error: 'Llegaste al límite de 30 fotos.' }

  const { error } = await admin.from('estado_inicial_fotos').insert({
    organizacion_id: perfil.organizacion_id,
    contrato_id:     contratoId,
    subido_por:      user.id,
    ruta_archivo:    rutaArchivo,
    descripcion,
  })

  if (error) return { error: error.message }

  revalidatePath(`/contratos/${contratoId}/estado-inicial`)
  revalidatePath(`/contratos/${contratoId}`)
  revalidatePath('/overview')
  return { ok: true }
}

export async function actualizarDescripcionFotoAction(fotoId: string, descripcion: string): Promise<{ ok?: true; error?: string }> {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  const admin = createAdminClient()

  const { data: foto } = await admin
    .from('estado_inicial_fotos')
    .select('contrato_id, subido_por')
    .eq('id', fotoId)
    .single()

  if (!foto || foto.subido_por !== user.id) return { error: 'No podés editar esta foto' }

  const { error } = await admin
    .from('estado_inicial_fotos')
    .update({ descripcion: descripcion.trim() || null })
    .eq('id', fotoId)

  if (error) return { error: error.message }

  revalidatePath(`/contratos/${foto.contrato_id}/estado-inicial`)
  return { ok: true }
}

export async function agregarFeedbackFotoAction(fotoId: string, feedback: string): Promise<{ ok?: true; error?: string }> {
  const { perfil } = await getSession()
  if (!perfil || perfil.rol !== 'administrador') return { error: 'Solo administradores' }

  const admin = createAdminClient()

  const { data: foto } = await admin
    .from('estado_inicial_fotos')
    .select('contrato_id')
    .eq('id', fotoId)
    .single()

  if (!foto) return { error: 'Foto no encontrada' }

  const { error } = await admin
    .from('estado_inicial_fotos')
    .update({ feedback_admin: feedback.trim() || null })
    .eq('id', fotoId)

  if (error) return { error: error.message }

  revalidatePath(`/contratos/${foto.contrato_id}/estado-inicial`)
  return { ok: true }
}

export async function eliminarFotoEstadoInicialAction(fotoId: string): Promise<{ ok?: true; error?: string }> {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  const admin = createAdminClient()

  const { data: foto } = await admin
    .from('estado_inicial_fotos')
    .select('id, contrato_id, subido_por, ruta_archivo, feedback_admin')
    .eq('id', fotoId)
    .single()

  if (!foto) return { error: 'Foto no encontrada' }

  const esDueño = foto.subido_por === user.id
  const esAdmin = perfil.rol === 'administrador'

  if (!esAdmin && !esDueño) return { error: 'No podés borrar esta foto' }
  if (esDueño && !esAdmin && foto.feedback_admin) {
    return { error: 'No podés borrar una foto con feedback del admin' }
  }

  // Borrar archivo de Storage
  await admin.storage.from('estado-inicial').remove([foto.ruta_archivo])

  const { error } = await admin.from('estado_inicial_fotos').delete().eq('id', fotoId)
  if (error) return { error: error.message }

  revalidatePath(`/contratos/${foto.contrato_id}/estado-inicial`)
  return { ok: true }
}
