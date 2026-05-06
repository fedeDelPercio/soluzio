// Templates P1 (pago próximo a vencer) y P2 (pago vence hoy).
// Solo van al inquilino — son recordatorios proactivos.

import { renderBaseTemplate, formatARS, formatFecha, escapeHtml } from './base.ts'

interface PagoAvisoData {
  propiedad:        string
  monto:            number
  fechaVencimiento: string
  diasFaltantes:    number  // cuántos días faltan al vto (0 = hoy)
  contratoId:       string
}

export function buildPagoProximoVencerEmail(data: PagoAvisoData): { asunto: string; html: string } {
  const asunto = `Tu alquiler vence en ${data.diasFaltantes} dia${data.diasFaltantes !== 1 ? 's' : ''} — ${data.propiedad}`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 6px 0;font-size:13px;color:#92400e;font-weight:500;">Vence el ${formatFecha(data.fechaVencimiento)}</p>
      <p style="margin:0;font-size:24px;font-weight:600;color:#78350f;">${formatARS(data.monto)}</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      preheader: `Quedan ${data.diasFaltantes} dia${data.diasFaltantes !== 1 ? 's' : ''} para el vencimiento`,
      titulo:    'Tu alquiler vence pronto',
      intro:     `Faltan ${data.diasFaltantes} dia${data.diasFaltantes !== 1 ? 's' : ''} para el vencimiento. Si ya pagaste, subi el comprobante para que el administrador lo verifique.`,
      cuerpoHtml,
      ctaLabel:  'Ver pago',
      ctaHref:   `/contratos/${data.contratoId}/pagos`,
    }),
  }
}

export function buildPagoVenceHoyEmail(data: Omit<PagoAvisoData, 'diasFaltantes'>): { asunto: string; html: string } {
  const asunto = `Tu alquiler vence hoy — ${data.propiedad}`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 6px 0;font-size:13px;color:#92400e;font-weight:500;">Vence hoy</p>
      <p style="margin:0;font-size:24px;font-weight:600;color:#78350f;">${formatARS(data.monto)}</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      preheader: `Tu alquiler vence hoy`,
      titulo:    'Tu alquiler vence hoy',
      intro:     'Hoy es la fecha de vencimiento del alquiler. Si ya pagaste, subi el comprobante.',
      cuerpoHtml,
      ctaLabel:  'Ver pago',
      ctaHref:   `/contratos/${data.contratoId}/pagos`,
    }),
  }
}
