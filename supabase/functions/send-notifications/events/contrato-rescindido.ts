// Handler C5: Contrato rescindido (event-driven).
// Destinatarios: inquilino, coinquilino, propietario, inmobiliario, admins.

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildContratoRescindidoEmail } from '../templates/contrato.ts'
import { describirPropiedad } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

export async function handleContratoRescindido(contratoId: string): Promise<ResultadoEvento> {
  const evento = 'contrato_rescindido' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()
  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: cRaw, error } = await supabase
    .from('contratos')
    .select(`
      id, organizacion_id,
      propiedades ( propietario_id, inmobiliario_id, calle, numero, piso, depto ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
      coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
    `)
    .eq('id', contratoId)
    .single()

  if (error) { resultado.errores.push(`contrato: ${error.message}`); return resultado }
  if (!cRaw) { resultado.errores.push(`contrato ${contratoId} no encontrado`); return resultado }
  const c = cRaw as any
  if (!orgsHab.has(c.organizacion_id)) return resultado

  const propiedadStr = describirPropiedad(c.propiedades)
  const inqNombre = c.inquilino ? `${c.inquilino.nombre} ${c.inquilino.apellido}`.trim() : 'el inquilino'

  const ids: string[] = []
  if (c.inquilino?.id) ids.push(c.inquilino.id)
  if (c.coinquilino?.id) ids.push(c.coinquilino.id)
  if (c.propiedades?.propietario_id) ids.push(c.propiedades.propietario_id)
  if (c.propiedades?.inmobiliario_id) ids.push(c.propiedades.inmobiliario_id)
  const emails = await resolverEmails(ids)

  // Nombres de propietario e inmobiliario
  const otrosIds = [c.propiedades?.propietario_id, c.propiedades?.inmobiliario_id].filter(Boolean) as string[]
  const otrosMap = new Map<string, { nombre: string }>()
  if (otrosIds.length > 0) {
    const { data: otros } = await supabase.from('perfiles').select('id, nombre').in('id', otrosIds)
    for (const p of (otros ?? []) as { id: string; nombre: string }[]) otrosMap.set(p.id, { nombre: p.nombre })
  }

  const targets: { id: string; nombre: string; email: string; rol: 'inquilino' | 'admin' | 'propietario' | 'inmobiliario' }[] = []
  if (c.inquilino?.id   && emails.get(c.inquilino.id))   targets.push({ id: c.inquilino.id,   nombre: c.inquilino.nombre,   email: emails.get(c.inquilino.id)!,   rol: 'inquilino' })
  if (c.coinquilino?.id && emails.get(c.coinquilino.id)) targets.push({ id: c.coinquilino.id, nombre: c.coinquilino.nombre, email: emails.get(c.coinquilino.id)!, rol: 'inquilino' })
  const pid = c.propiedades?.propietario_id
  if (pid && emails.get(pid)) targets.push({ id: pid, nombre: otrosMap.get(pid)?.nombre ?? 'Propietario', email: emails.get(pid)!, rol: 'propietario' })
  const iid = c.propiedades?.inmobiliario_id
  if (iid && emails.get(iid)) targets.push({ id: iid, nombre: otrosMap.get(iid)?.nombre ?? 'Inmobiliaria', email: emails.get(iid)!, rol: 'inmobiliario' })
  for (const a of await adminsDeOrg(c.organizacion_id)) targets.push({ id: a.id, nombre: a.nombre, email: a.email, rol: 'admin' })

  for (const t of targets) {
    const { asunto, html } = buildContratoRescindidoEmail({
      rol:              t.rol,
      inquilinoNombre:  t.rol !== 'inquilino' ? inqNombre : undefined,
      propiedad:        propiedadStr,
      contratoId:       c.id,
    })
    await reservarYEnviar({
      evento,
      organizacion_id:   c.organizacion_id,
      destinatario_id:   t.id,
      destinatarioEmail: t.email,
      contexto_unico:    `contrato:${c.id}:rescindido`,
      asunto, html,
      metadata:          { contrato_id: c.id },
    }, resultado)
  }
  return resultado
}
