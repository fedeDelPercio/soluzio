// Templates S1 (seguro pendiente — primer aviso) y S3 (seguro próximo a vencer).

import { renderBaseTemplate, formatFecha, escapeHtml } from './base.ts'

interface SeguroPendienteData {
  propiedad:    string
  diasDesdeInicio: number
  contratoId:   string
}

export function buildSeguroPendienteEmail(data: SeguroPendienteData): { asunto: string; html: string } {
  const asunto = `Recordatorio: subi el seguro de incendio — ${data.propiedad}`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#78350f;">Pasaron ${data.diasDesdeInicio} dias desde el inicio del contrato y todavia no subiste el seguro de incendio. Es un requisito legal.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Subi el seguro de incendio',
      cuerpoHtml,
      ctaLabel:  'Subir poliza',
      ctaHref:   `/contratos/${data.contratoId}/documentos`,
    }),
  }
}

interface SeguroProximoVencerData {
  esAdmin:          boolean
  inquilinoNombre?: string
  propiedad:        string
  fechaVencimiento: string
  diasFaltantes:    number
  contratoId:       string
}

export function buildSeguroProximoVencerEmail(data: SeguroProximoVencerData): { asunto: string; html: string } {
  const asunto = data.esAdmin
    ? `Seguro proximo a vencer — ${data.propiedad}`
    : `Tu seguro vence en ${data.diasFaltantes} dias — ${data.propiedad}`
  const intro = data.esAdmin
    ? `La poliza de seguro de ${data.inquilinoNombre ?? 'el inquilino'} vence el ${formatFecha(data.fechaVencimiento)}. Quedan ${data.diasFaltantes} dias.`
    : `Tu poliza de seguro de incendio vence el ${formatFecha(data.fechaVencimiento)}. Quedan ${data.diasFaltantes} dias para que la renueves.`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#92400e;font-weight:500;">Vence el ${formatFecha(data.fechaVencimiento)}</p>
      <p style="margin:0;font-size:14px;color:#78350f;">Quedan ${data.diasFaltantes} dias para renovar.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Seguro proximo a vencer',
      intro,
      cuerpoHtml,
      ctaLabel:  data.esAdmin ? 'Ver contrato' : 'Subir poliza renovada',
      ctaHref:   data.esAdmin ? `/contratos/${data.contratoId}` : `/contratos/${data.contratoId}/documentos`,
    }),
  }
}
