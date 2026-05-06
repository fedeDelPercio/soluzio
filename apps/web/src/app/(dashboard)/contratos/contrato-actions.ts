'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'
import { dispararNotificacion } from '@/lib/notifications/dispatch'

export async function rescindirContratoAction(id: string) {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') return { error: 'No autorizado' }

  const supabase = await createClient()
  await (supabase as any)
    .from('contratos')
    .update({ estado: 'rescindido' })
    .eq('id', id)

  // Notificar a inquilino, propietario, inmobiliario y otros admins.
  await dispararNotificacion('contrato_rescindido', id)

  revalidatePath('/contratos')
  redirect('/contratos')
}

// ─────────────────────────────────────────────────────────────
// Pre-check: ¿qué se puede borrar junto al contrato?
// Devuelve flags para que la UI muestre los checkboxes correctos.
// ─────────────────────────────────────────────────────────────
export interface PreviewEliminarContrato {
  ok: boolean
  error?: string
  propiedad: { id: string; descripcion: string; puedeBorrar: boolean; razon?: string } | null
  inquilinos: Array<{ id: string; nombre: string; puedeBorrar: boolean; razon?: string }>
}

export async function previewEliminarContratoAction(id: string): Promise<PreviewEliminarContrato> {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') {
    return { ok: false, error: 'No autorizado', propiedad: null, inquilinos: [] }
  }

  const admin = createAdminClient()
  const db    = admin as any

  const { data: contrato } = await db
    .from('contratos')
    .select(`
      id, propiedad_id, inquilino_id, coinquilino_id,
      propiedades ( id, calle, numero, piso, depto )
    `)
    .eq('id', id)
    .single()

  if (!contrato) return { ok: false, error: 'Contrato no encontrado', propiedad: null, inquilinos: [] }

  // Propiedad: se puede borrar si NO hay otro contrato apuntando a ella
  const prop = contrato.propiedades as any
  let propiedadInfo: PreviewEliminarContrato['propiedad'] = null
  if (prop) {
    const { count: otrosContratosProp } = await db
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', prop.id)
      .neq('id', id)

    const desc = [prop.calle, prop.numero, prop.piso && `Piso ${prop.piso}`, prop.depto]
      .filter(Boolean).join(' ')
    propiedadInfo = {
      id: prop.id,
      descripcion: desc,
      puedeBorrar: (otrosContratosProp ?? 0) === 0,
      razon: (otrosContratosProp ?? 0) > 0
        ? `Tiene ${otrosContratosProp} contrato(s) más asociado(s).`
        : undefined,
    }
  }

  // Inquilinos: cada uno se puede borrar si no es inquilino/coinquilino de OTRO contrato
  const inquilinoIds = [contrato.inquilino_id, contrato.coinquilino_id].filter(Boolean) as string[]
  const inquilinosInfo: PreviewEliminarContrato['inquilinos'] = []

  for (const userId of inquilinoIds) {
    const { data: perfilInq } = await db
      .from('perfiles')
      .select('id, nombre, apellido')
      .eq('id', userId)
      .single()

    const { count: otrosContInq } = await db
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .or(`inquilino_id.eq.${userId},coinquilino_id.eq.${userId}`)
      .neq('id', id)

    inquilinosInfo.push({
      id: userId,
      nombre: perfilInq ? `${perfilInq.nombre} ${perfilInq.apellido}` : 'Inquilino',
      puedeBorrar: (otrosContInq ?? 0) === 0,
      razon: (otrosContInq ?? 0) > 0
        ? `Está vinculado a ${otrosContInq} contrato(s) más.`
        : undefined,
    })
  }

  return { ok: true, propiedad: propiedadInfo, inquilinos: inquilinosInfo }
}

// ─────────────────────────────────────────────────────────────
// Eliminación con opciones
// ─────────────────────────────────────────────────────────────
export interface EliminarContratoResult {
  ok: boolean
  error?: string
  borrado: {
    contrato: boolean
    propiedad: boolean
    inquilinos: string[]   // ids realmente borrados
  }
  saltados: {
    propiedadConOtros: boolean
    inquilinosConOtros: string[]   // ids salteados por tener otros contratos
  }
}

export async function eliminarContratoAction(
  id: string,
  opts: { borrarPropiedad?: boolean; borrarInquilinos?: boolean } = {},
): Promise<EliminarContratoResult> {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') {
    return {
      ok: false, error: 'No autorizado',
      borrado: { contrato: false, propiedad: false, inquilinos: [] },
      saltados: { propiedadConOtros: false, inquilinosConOtros: [] },
    }
  }

  const admin = createAdminClient()
  const db    = admin as any

  // Capturar referencias antes de borrar el contrato
  const { data: contrato } = await db
    .from('contratos')
    .select('id, propiedad_id, inquilino_id, coinquilino_id')
    .eq('id', id)
    .single()

  if (!contrato) {
    return {
      ok: false, error: 'Contrato no encontrado',
      borrado: { contrato: false, propiedad: false, inquilinos: [] },
      saltados: { propiedadConOtros: false, inquilinosConOtros: [] },
    }
  }

  const propiedadId   = contrato.propiedad_id as string
  const inquilinoIds  = [contrato.inquilino_id, contrato.coinquilino_id].filter(Boolean) as string[]

  // 1. Borrar el contrato (cascade limpia pagos, periodos, comprobantes, etc.)
  const { error: errCtr } = await db.from('contratos').delete().eq('id', id)
  if (errCtr) {
    return {
      ok: false, error: errCtr.message,
      borrado: { contrato: false, propiedad: false, inquilinos: [] },
      saltados: { propiedadConOtros: false, inquilinosConOtros: [] },
    }
  }

  const result: EliminarContratoResult = {
    ok: true,
    borrado: { contrato: true, propiedad: false, inquilinos: [] },
    saltados: { propiedadConOtros: false, inquilinosConOtros: [] },
  }

  // 2. Si pidió borrar la propiedad, validar que no tenga otros contratos
  if (opts.borrarPropiedad && propiedadId) {
    const { count: otrosCtr } = await db
      .from('contratos')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propiedadId)

    if ((otrosCtr ?? 0) === 0) {
      const { error: errProp } = await db.from('propiedades').delete().eq('id', propiedadId)
      if (!errProp) result.borrado.propiedad = true
    } else {
      result.saltados.propiedadConOtros = true
    }
  }

  // 3. Si pidió borrar inquilinos, validar uno por uno
  if (opts.borrarInquilinos && inquilinoIds.length > 0) {
    for (const userId of inquilinoIds) {
      const { count: otrosCtr } = await db
        .from('contratos')
        .select('id', { count: 'exact', head: true })
        .or(`inquilino_id.eq.${userId},coinquilino_id.eq.${userId}`)

      if ((otrosCtr ?? 0) === 0) {
        // Borrar el auth user → cascade borra perfil
        const { error: errAuth } = await admin.auth.admin.deleteUser(userId)
        if (!errAuth) {
          result.borrado.inquilinos.push(userId)
        }
      } else {
        result.saltados.inquilinosConOtros.push(userId)
      }
    }
  }

  revalidatePath('/contratos')
  revalidatePath('/propiedades')
  revalidatePath('/inquilinos')
  return result
}
