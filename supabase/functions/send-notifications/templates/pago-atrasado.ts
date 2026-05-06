// Template P4 (7 días) y P5 (15 días): Pago atrasado.
// Destinatarios: Inquilino + Admin + Propietario.

import { renderBaseTemplate, formatARS, formatFecha, escapeHtml } from './base.ts'

export interface PagoAtrasadoData {
  destinatarioNombre: string
  rol:                'inquilino' | 'admin' | 'propietario'
  inquilinoNombre?:   string
  propiedad:          string
  monto:              number
  fechaVencimiento:   string
  diasAtraso:         7 | 15
  contratoId:         string
}

export function buildPagoAtrasadoEmail(data: PagoAtrasadoData): { asunto: string; html: string } {
  const asunto = data.rol === 'inquilino'
    ? `Pago atrasado +${data.diasAtraso} días — ${data.propiedad}`
    : `Pago atrasado +${data.diasAtraso} días — ${data.propiedad} (${data.inquilinoNombre ?? 'inquilino'})`

  const tono = data.diasAtraso >= 15 ? 'crítico' : 'urgente'
  const colorBg     = data.diasAtraso >= 15 ? '#fee2e2' : '#fef3c7'
  const colorBorder = data.diasAtraso >= 15 ? '#fca5a5' : '#fde68a'
  const colorText   = data.diasAtraso >= 15 ? '#7f1d1d' : '#78350f'
  const colorLabel  = data.diasAtraso >= 15 ? '#991b1b' : '#92400e'

  const cuerpoHtml = `
    <div style="background-color:${colorBg};border:1px solid ${colorBorder};border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 8px 0;font-size:13px;color:${colorLabel};font-weight:500;">Vencido hace ${data.diasAtraso} días — ${formatFecha(data.fechaVencimiento)}</p>
      <p style="margin:0;font-size:24px;font-weight:600;color:${colorText};">${formatARS(data.monto)}</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
          <p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p>
          <p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p>
        </td>
      </tr>
      ${data.rol !== 'inquilino' && data.inquilinoNombre ? `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
            <p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p>
            <p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p>
          </td>
        </tr>
      ` : ''}
    </table>
  `

  const intro =
    data.rol === 'inquilino'
      ? `Tu pago de alquiler está vencido hace ${data.diasAtraso} días. La situación es ${tono}: subí el comprobante o contactate con el administrador.`
      : data.rol === 'admin'
      ? `El inquilino ${data.inquilinoNombre ?? ''} no cargó comprobante hace ${data.diasAtraso} días.`
      : `El alquiler de tu propiedad lleva ${data.diasAtraso} días sin pago. El administrador ya fue notificado.`

  const ctaLabel = data.rol === 'inquilino' ? 'Subir comprobante' : 'Ver pago'
  const ctaHref  = data.rol === 'inquilino' ? `/contratos/${data.contratoId}/pagos` : `/contratos/${data.contratoId}`

  const html = renderBaseTemplate({
    preheader:  `${formatARS(data.monto)} vencido hace ${data.diasAtraso} días`,
    titulo:     data.rol === 'inquilino' ? `Pago atrasado +${data.diasAtraso} días` : `Atraso de pago +${data.diasAtraso} días`,
    intro,
    cuerpoHtml,
    ctaLabel,
    ctaHref,
  })

  return { asunto, html }
}
