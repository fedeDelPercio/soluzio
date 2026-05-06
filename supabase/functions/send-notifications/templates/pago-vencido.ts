// Template P3: Pago vencido (al día siguiente del vto sin comprobante).
// Destinatarios: Inquilino + Admin.

import { renderBaseTemplate, formatARS, formatFecha, escapeHtml } from './base.ts'

export interface PagoVencidoData {
  destinatarioNombre: string
  esAdmin:            boolean
  inquilinoNombre?:   string   // solo para admin
  propiedad:          string   // ej: "Avenida Nazca 1781 Piso 9 B"
  monto:              number
  fechaVencimiento:   string   // YYYY-MM-DD
  contratoId:         string
}

export function buildPagoVencidoEmail(data: PagoVencidoData): { asunto: string; html: string } {
  const asunto = data.esAdmin
    ? `Pago vencido — ${data.propiedad}`
    : `Tenés un pago vencido — ${data.propiedad}`

  const cuerpoHtml = `
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#991b1b;font-weight:500;">Vencido el ${formatFecha(data.fechaVencimiento)}</p>
      <p style="margin:0;font-size:24px;font-weight:600;color:#7f1d1d;">${formatARS(data.monto)}</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
          <p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p>
          <p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p>
        </td>
      </tr>
      ${data.esAdmin && data.inquilinoNombre ? `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
            <p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p>
            <p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p>
          </td>
        </tr>
      ` : ''}
    </table>
  `

  const intro = data.esAdmin
    ? `El inquilino ${data.inquilinoNombre ?? ''} tiene un pago de alquiler vencido sin comprobante cargado.`
    : `Te recordamos que tenés un pago de alquiler vencido. Subí el comprobante para regularizar tu situación.`

  const ctaLabel = data.esAdmin ? 'Ver pago' : 'Subir comprobante'
  const ctaHref  = data.esAdmin ? `/pagos` : `/contratos/${data.contratoId}/pagos`

  const html = renderBaseTemplate({
    preheader:  `${formatARS(data.monto)} vencido el ${formatFecha(data.fechaVencimiento)}`,
    titulo:     data.esAdmin ? 'Pago vencido' : 'Tenés un pago vencido',
    intro,
    cuerpoHtml,
    ctaLabel,
    ctaHref,
  })

  return { asunto, html }
}
