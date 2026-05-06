// Lectura de los días de offset configurados por organización por evento.
// Si la fila no existe o no tiene dias_offset, devuelve el default del código.
// El handler se aplica el offset con su sentido natural (antes/después).

import { getAdminClient } from './supabase.ts'
import type { EventoCritico } from './types.ts'

const DEFAULT_OFFSET: Record<string, number> = {
  pago_proximo_vencer:           5,
  pago_vence_hoy:                0,
  pago_vencido:                  1,
  pago_atrasado_7:               7,
  pago_atrasado_15:              15,
  seguro_pendiente:              10,
  seguro_incendio_recordatorio:  15,
  seguro_proximo_vencer:         30,
  seguro_incendio_vencido:       1,
  contrato_por_vencer:           30,
  contrato_vencido:              1,
  tasas_ajuste_faltantes:        0,
  solicitud_sin_respuesta:       2,
}

interface OffsetPorOrg {
  organizacion_id: string
  dias:            number
}

/**
 * Devuelve un mapa organizacion_id → días de offset configurado para un evento.
 * Solo incluye orgs con el evento habilitado. Las orgs cuya configuracion
 * jsonb no tenga dias_offset usan el default.
 */
export async function offsetsPorOrg(evento: EventoCritico): Promise<OffsetPorOrg[]> {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('notificaciones_config')
    .select('organizacion_id, configuracion')
    .eq('evento', evento)
    .eq('habilitado', true)

  if (error) throw new Error(`offsetsPorOrg(${evento}): ${error.message}`)

  const def = DEFAULT_OFFSET[evento] ?? 0
  return (data ?? []).map((r: { organizacion_id: string; configuracion: { dias_offset?: number } | null }) => {
    const raw = r.configuracion?.dias_offset
    return {
      organizacion_id: r.organizacion_id,
      dias:            typeof raw === 'number' && Number.isFinite(raw) ? raw : def,
    }
  })
}

/**
 * Helper: agrupa los offsets en un Map para lookup rápido por org.
 */
export function aMap(lista: OffsetPorOrg[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of lista) m.set(r.organizacion_id, r.dias)
  return m
}
