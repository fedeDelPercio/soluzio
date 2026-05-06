// Handler C3: Contrato vencido (al día siguiente).

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildContratoVencidoEmail } from '../templates/contrato.ts'
import { describirPropiedad, ayer } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

interface ContratoRow {
  id:              string
  organizacion_id: string
  fecha_fin:       string
  estado:          string
  propiedades: { propietario_id: string | null; calle: string; numero: string; piso: string | null; depto: string | null } | null
  inquilino:   { id: string; nombre: string; apellido: string } | null
  coinquilino: { id: string; nombre: string; apellido: string } | null
}

export async function handleContratoVencido(): Promise<ResultadoEvento> {
  const evento = 'contrato_vencido' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()
  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: contratosRaw, error } = await supabase
    .from('contratos')
    .select(`
      id, organizacion_id, fecha_fin, estado,
      propiedades ( propietario_id, calle, numero, piso, depto ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
      coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
    `)
    .eq('fecha_fin', ayer())
    .in('estado', ['activo', 'por_vencer'])

  if (error) { resultado.errores.push(`query: ${error.message}`); return resultado }
  const contratos = (contratosRaw ?? []) as unknown as ContratoRow[]
  if (contratos.length === 0) return resultado

  const ids: string[] = []
  for (const c of contratos) {
    if (c.inquilino?.id) ids.push(c.inquilino.id)
    if (c.coinquilino?.id) ids.push(c.coinquilino.id)
    if (c.propiedades?.propietario_id) ids.push(c.propiedades.propietario_id)
  }
  const emails = await resolverEmails(ids)

  // Nombres de propietarios
  const propIds = [...new Set(contratos.map((c) => c.propiedades?.propietario_id).filter(Boolean) as string[])]
  const propMap = new Map<string, { nombre: string }>()
  if (propIds.length > 0) {
    const { data: props } = await supabase.from('perfiles').select('id, nombre').in('id', propIds)
    for (const p of (props ?? []) as { id: string; nombre: string }[]) propMap.set(p.id, { nombre: p.nombre })
  }

  for (const c of contratos) {
    if (!orgsHab.has(c.organizacion_id)) continue
    const propiedadStr = describirPropiedad(c.propiedades)
    const inqNombre = c.inquilino ? `${c.inquilino.nombre} ${c.inquilino.apellido}`.trim() : 'el inquilino'

    const targets: { id: string; nombre: string; email: string; rol: 'inquilino' | 'admin' | 'propietario' }[] = []
    if (c.inquilino?.id   && emails.get(c.inquilino.id))   targets.push({ id: c.inquilino.id,   nombre: c.inquilino.nombre,   email: emails.get(c.inquilino.id)!,   rol: 'inquilino' })
    if (c.coinquilino?.id && emails.get(c.coinquilino.id)) targets.push({ id: c.coinquilino.id, nombre: c.coinquilino.nombre, email: emails.get(c.coinquilino.id)!, rol: 'inquilino' })
    const propId = c.propiedades?.propietario_id
    if (propId && emails.get(propId)) targets.push({ id: propId, nombre: propMap.get(propId)?.nombre ?? 'Propietario', email: emails.get(propId)!, rol: 'propietario' })
    for (const a of await adminsDeOrg(c.organizacion_id)) targets.push({ id: a.id, nombre: a.nombre, email: a.email, rol: 'admin' })

    for (const t of targets) {
      const { asunto, html } = buildContratoVencidoEmail({
        rol:              t.rol,
        inquilinoNombre:  t.rol !== 'inquilino' ? inqNombre : undefined,
        propiedad:        propiedadStr,
        contratoId:       c.id,
        fechaFin:         c.fecha_fin,
      })
      await reservarYEnviar({
        evento,
        organizacion_id:   c.organizacion_id,
        destinatario_id:   t.id,
        destinatarioEmail: t.email,
        contexto_unico:    `contrato:${c.id}:vencido`,
        asunto, html,
        metadata:          { contrato_id: c.id, fecha_fin: c.fecha_fin },
      }, resultado)
    }
  }
  return resultado
}
