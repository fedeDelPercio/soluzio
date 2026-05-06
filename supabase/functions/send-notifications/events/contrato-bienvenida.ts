// Handler C1: Contrato bienvenida (event-driven, al crear el contrato).

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildContratoBienvenidaEmail } from '../templates/contrato-eventos.ts'
import { describirPropiedad } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

export async function handleContratoBienvenida(contratoId: string): Promise<ResultadoEvento> {
  const evento = 'contrato_bienvenida' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()

  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: cRaw, error } = await supabase
    .from('contratos')
    .select(`
      id, organizacion_id, fecha_inicio, fecha_fin, monto_inicial,
      propiedades ( propietario_id, inmobiliario_id, calle, numero, piso, depto ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
      coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
    `)
    .eq('id', contratoId)
    .single()

  if (error) { resultado.errores.push(`contrato: ${error.message}`); return resultado }
  if (!cRaw)  { resultado.errores.push(`contrato ${contratoId} no encontrado`); return resultado }
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

  const otrosIds = [c.propiedades?.propietario_id, c.propiedades?.inmobiliario_id].filter(Boolean) as string[]
  const otrosMap = new Map<string, { nombre: string }>()
  if (otrosIds.length > 0) {
    const { data: otros } = await supabase.from('perfiles').select('id, nombre').in('id', otrosIds)
    for (const p of (otros ?? []) as { id: string; nombre: string }[]) otrosMap.set(p.id, { nombre: p.nombre })
  }

  const targets: { id: string; nombre: string; email: string; rol: 'inquilino' | 'propietario' | 'inmobiliario' }[] = []
  if (c.inquilino?.id   && emails.get(c.inquilino.id))   targets.push({ id: c.inquilino.id,   nombre: c.inquilino.nombre,   email: emails.get(c.inquilino.id)!,   rol: 'inquilino' })
  if (c.coinquilino?.id && emails.get(c.coinquilino.id)) targets.push({ id: c.coinquilino.id, nombre: c.coinquilino.nombre, email: emails.get(c.coinquilino.id)!, rol: 'inquilino' })
  const pid = c.propiedades?.propietario_id
  if (pid && emails.get(pid)) targets.push({ id: pid, nombre: otrosMap.get(pid)?.nombre ?? 'Propietario', email: emails.get(pid)!, rol: 'propietario' })
  const iid = c.propiedades?.inmobiliario_id
  if (iid && emails.get(iid)) targets.push({ id: iid, nombre: otrosMap.get(iid)?.nombre ?? 'Inmobiliaria', email: emails.get(iid)!, rol: 'inmobiliario' })

  for (const t of targets) {
    const { asunto, html } = buildContratoBienvenidaEmail({
      rol: t.rol, nombreDestinatario: t.nombre,
      propiedad: propiedadStr, inquilinoNombre: inqNombre,
      monto: Number(c.monto_inicial ?? 0),
      fechaInicio: c.fecha_inicio, fechaFin: c.fecha_fin ?? null,
      contratoId: c.id,
    })
    await reservarYEnviar({
      evento, organizacion_id: c.organizacion_id, destinatario_id: t.id,
      destinatarioEmail: t.email, contexto_unico: `contrato:${c.id}:bienvenida`,
      asunto, html, metadata: { contrato_id: c.id, rol: t.rol },
    }, resultado)
  }

  return resultado
}
