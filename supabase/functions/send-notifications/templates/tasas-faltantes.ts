// Template A4: Tasas faltantes el día del ajuste.

import { renderBaseTemplate, formatFecha, escapeHtml } from './base.ts'

export interface TasasFaltantesData {
  contratoId:           string
  propiedad:            string
  inquilinoNombre:      string
  fechaAjuste:          string
  indice:               'ipc' | 'icl'
  mesFaltante:          string  // ej: '2026-04'
}

export function buildTasasFaltantesEmail(data: TasasFaltantesData): { asunto: string; html: string } {
  const asunto = `Faltan tasas ${data.indice.toUpperCase()} para ajustar — ${data.propiedad}`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#78350f;">Hoy correspondía aplicar el ajuste pero falta la tasa <strong>${data.indice.toUpperCase()}</strong> de <strong>${data.mesFaltante}</strong>.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Fecha de ajuste</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${formatFecha(data.fechaAjuste)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Tasas faltantes para aplicar ajuste',
      intro:     'Cargá la tasa pendiente o esperá a que el cron mensual la sincronice automáticamente.',
      cuerpoHtml,
      ctaLabel:  'Ver contrato',
      ctaHref:   `/contratos/${data.contratoId}/ajuste`,
    }),
  }
}
