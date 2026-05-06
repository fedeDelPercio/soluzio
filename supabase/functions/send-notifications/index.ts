// Edge Function: send-notifications (v5: 19 eventos, timing configurable)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Críticos (cron)
import { handlePagoVencido } from './events/pago-vencido.ts'
import { handlePagoAtrasado7, handlePagoAtrasado15 } from './events/pago-atrasado.ts'
import { handleSeguroRecordatorio, handleSeguroVencido } from './events/seguro.ts'
import { handleContratoVencido } from './events/contrato-vencido.ts'
import { handleTasasFaltantes } from './events/tasas-faltantes.ts'

// Medios (cron)
import { handlePagoProximoVencer } from './events/pago-proximo-vencer.ts'
import { handlePagoVenceHoy } from './events/pago-vence-hoy.ts'
import { handleSeguroPendiente } from './events/seguro-pendiente.ts'
import { handleSeguroProximoVencer } from './events/seguro-proximo-vencer.ts'
import { handleContratoPorVencer } from './events/contrato-por-vencer.ts'
import { handleSolicitudSinRespuesta } from './events/solicitud-sin-respuesta.ts'

// Críticos (event-driven)
import { handleComprobanteRechazado } from './events/comprobante-rechazado.ts'
import { handleDocumentoRechazado } from './events/documento-rechazado.ts'
import { handleContratoRescindido } from './events/contrato-rescindido.ts'
import { handleSolicitudUrgente } from './events/solicitud-urgente.ts'

// Medios (event-driven)
import { handleContratoBienvenida } from './events/contrato-bienvenida.ts'
import { handleSolicitudNueva } from './events/solicitud-nueva.ts'

import type { RequestBody, ResultadoEvento, EventoCritico } from './lib/types.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

type HandlerCron = () => Promise<ResultadoEvento>

const HANDLERS_CRON: Partial<Record<EventoCritico, HandlerCron>> = {
  pago_proximo_vencer:            handlePagoProximoVencer,
  pago_vence_hoy:                 handlePagoVenceHoy,
  pago_vencido:                   handlePagoVencido,
  pago_atrasado_7:                handlePagoAtrasado7,
  pago_atrasado_15:               handlePagoAtrasado15,
  seguro_pendiente:               handleSeguroPendiente,
  seguro_incendio_recordatorio:   handleSeguroRecordatorio,
  seguro_proximo_vencer:          handleSeguroProximoVencer,
  seguro_incendio_vencido:        handleSeguroVencido,
  contrato_por_vencer:            handleContratoPorVencer,
  contrato_vencido:               handleContratoVencido,
  tasas_ajuste_faltantes:         handleTasasFaltantes,
  solicitud_sin_respuesta:        handleSolicitudSinRespuesta,
}

type HandlerEvento = (recursoId: string, metadata?: Record<string, unknown>) => Promise<ResultadoEvento>

const HANDLERS_EVENTO: Partial<Record<EventoCritico, HandlerEvento>> = {
  comprobante_rechazado: (id, meta) => handleComprobanteRechazado(id, meta?.motivo as string | undefined),
  documento_rechazado:   (id, meta) => handleDocumentoRechazado(id, meta?.motivo as string | undefined),
  contrato_rescindido:   (id) => handleContratoRescindido(id),
  solicitud_urgente:     (id) => handleSolicitudUrgente(id),
  contrato_bienvenida:   (id) => handleContratoBienvenida(id),
  solicitud_nueva:       (id) => handleSolicitudNueva(id),
}

function verificarServiceRole(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const auth  = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, status: 401, error: 'No autorizado' }
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
    if (decoded.role !== 'service_role') return { ok: false, status: 403, error: 'Solo service_role puede invocar' }
    return { ok: true }
  } catch { return { ok: false, status: 401, error: 'Token invalido' } }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  const auth = verificarServiceRole(req)
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
  let body: RequestBody
  try { body = (await req.json()) as RequestBody } catch { return new Response(JSON.stringify({ error: 'JSON invalido' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }) }

  if (body.modo === 'cron') {
    const resultados: ResultadoEvento[] = []
    for (const [evento, handler] of Object.entries(HANDLERS_CRON) as [EventoCritico, HandlerCron][]) {
      try { resultados.push(await handler()) } catch (err) { resultados.push({ evento, enviados: 0, dedup: 0, fallidos: 0, errores: [`handler crash: ${(err as Error).message}`] }) }
    }
    const totales = resultados.reduce((acc, r) => ({ enviados: acc.enviados + r.enviados, dedup: acc.dedup + r.dedup, fallidos: acc.fallidos + r.fallidos }), { enviados: 0, dedup: 0, fallidos: 0 })
    return new Response(JSON.stringify({ ok: true, modo: 'cron', totales, eventos: resultados }, null, 2), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
  }

  if (body.modo === 'evento') {
    const handler = HANDLERS_EVENTO[body.evento]
    if (!handler) return new Response(JSON.stringify({ ok: false, error: `Evento '${body.evento}' no es event-driven o no esta registrado` }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    try {
      const resultado = await handler(body.recurso_id, body.metadata)
      return new Response(JSON.stringify({ ok: true, modo: 'evento', resultado }, null, 2), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: `handler crash: ${(err as Error).message}` }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }
  }

  return new Response(JSON.stringify({ error: 'modo invalido' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
})
