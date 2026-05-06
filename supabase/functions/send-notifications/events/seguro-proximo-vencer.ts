// Handler S3: Seguro próximo a vencer (default 30 días antes).

import { getAdminClient } from '../lib/supabase.ts'
import { offsetsPorOrg } from '../lib/offsets.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildSeguroProximoVencerEmail } from '../templates/seguro-aviso.ts'
import { describirPropiedad, enDias } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

interface ContratoRow {
  id: string; organizacion_id: string; vencimiento_seguro_incendio: string | null; estado: string;
  propiedades: { calle: string; numero: string; piso: string | null; depto: string | null } | null;
  inquilino: { id: string; nombre: string; apellido: string } | null;
  coinquilino: { id: string; nombre: string; apellido: string } | null;
}

export async function handleSeguroProximoVencer(): Promise<ResultadoEvento> {
  const evento = 'seguro_proximo_vencer' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()

  const offsets = await offsetsPorOrg(evento)
  if (offsets.length === 0) return resultado

  const porOffset = new Map<number, string[]>()
  for (const o of offsets) {
    if (!porOffset.has(o.dias)) porOffset.set(o.dias, [])
    porOffset.get(o.dias)!.push(o.organizacion_id)
  }

  for (const [diasOffset, orgIds] of porOffset) {
    const fechaTarget = enDias(diasOffset)  // futuro
    const { data: contratosRaw, error } = await supabase
      .from('contratos')
      .select(`
        id, organizacion_id, vencimiento_seguro_incendio, estado,
        propiedades ( calle, numero, piso, depto ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
        coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
      `)
      .eq('vencimiento_seguro_incendio', fechaTarget)
      .in('estado', ['activo', 'por_vencer'])
      .in('organizacion_id', orgIds)

    if (error) { resultado.errores.push(`query: ${error.message}`); continue }
    const contratos = (contratosRaw ?? []) as unknown as ContratoRow[]
    if (contratos.length === 0) continue

    const ids: string[] = []
    for (const c of contratos) { if (c.inquilino?.id) ids.push(c.inquilino.id); if (c.coinquilino?.id) ids.push(c.coinquilino.id) }
    const emails = await resolverEmails(ids)

    for (const c of contratos) {
      if (!c.vencimiento_seguro_incendio) continue
      const propiedadStr = describirPropiedad(c.propiedades)
      const inqNombre = c.inquilino ? `${c.inquilino.nombre} ${c.inquilino.apellido}`.trim() : 'el inquilino'
      const targets: { id: string; nombre: string; email: string; esAdmin: boolean }[] = []
      if (c.inquilino?.id   && emails.get(c.inquilino.id))   targets.push({ id: c.inquilino.id,   nombre: c.inquilino.nombre,   email: emails.get(c.inquilino.id)!,   esAdmin: false })
      if (c.coinquilino?.id && emails.get(c.coinquilino.id)) targets.push({ id: c.coinquilino.id, nombre: c.coinquilino.nombre, email: emails.get(c.coinquilino.id)!, esAdmin: false })
      for (const a of await adminsDeOrg(c.organizacion_id)) targets.push({ id: a.id, nombre: a.nombre, email: a.email, esAdmin: true })

      for (const t of targets) {
        const { asunto, html } = buildSeguroProximoVencerEmail({
          esAdmin: t.esAdmin, inquilinoNombre: t.esAdmin ? inqNombre : undefined,
          propiedad: propiedadStr, fechaVencimiento: c.vencimiento_seguro_incendio,
          diasFaltantes: diasOffset, contratoId: c.id,
        })
        await reservarYEnviar({
          evento, organizacion_id: c.organizacion_id, destinatario_id: t.id,
          destinatarioEmail: t.email, contexto_unico: `contrato:${c.id}:seguro_proximo:${c.vencimiento_seguro_incendio}`,
          asunto, html, metadata: { contrato_id: c.id, fecha_vencimiento: c.vencimiento_seguro_incendio, dias_offset: diasOffset },
        }, resultado)
      }
    }
  }

  return resultado
}
