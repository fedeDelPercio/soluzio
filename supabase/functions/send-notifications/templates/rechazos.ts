// Templates P8 (comprobante rechazado) y D2 (documento rechazado).

import { renderBaseTemplate, escapeHtml } from './base.ts'

interface RechazoComprobanteData {
  esAdmin:          boolean
  inquilinoNombre?: string
  propiedad:        string
  monto:            number
  motivo?:          string
  contratoId:       string
}

export function buildComprobanteRechazadoEmail(data: RechazoComprobanteData): { asunto: string; html: string } {
  const asunto = data.esAdmin
    ? `Comprobante rechazado — ${data.propiedad}`
    : `Tu comprobante fue rechazado — ${data.propiedad}`
  const intro = data.esAdmin
    ? `El comprobante de ${data.inquilinoNombre ?? 'el inquilino'} fue rechazado.`
    : `Tu comprobante de pago fue rechazado por el administrador. Por favor, subí uno nuevo.`
  const cuerpoHtml = `
    <div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#7f1d1d;font-weight:500;">Comprobante no válido</p>
      ${data.motivo ? `<p style="margin:6px 0 0 0;font-size:13px;color:#991b1b;">${escapeHtml(data.motivo)}</p>` : ''}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:   data.esAdmin ? 'Comprobante rechazado' : 'Tu comprobante fue rechazado',
      intro,
      cuerpoHtml,
      ctaLabel: data.esAdmin ? 'Ver pago' : 'Subir nuevo comprobante',
      ctaHref:  data.esAdmin ? `/pagos` : `/contratos/${data.contratoId}/pagos`,
    }),
  }
}

interface RechazoDocumentoData {
  esAdmin:          boolean
  inquilinoNombre?: string
  propiedad:        string
  tipoDocumento:    string
  motivo?:          string
  contratoId:       string
}

export function buildDocumentoRechazadoEmail(data: RechazoDocumentoData): { asunto: string; html: string } {
  const asunto = data.esAdmin
    ? `Documento rechazado — ${data.propiedad}`
    : `Tu ${data.tipoDocumento} fue rechazado — ${data.propiedad}`
  const intro = data.esAdmin
    ? `El documento "${data.tipoDocumento}" de ${data.inquilinoNombre ?? 'el inquilino'} fue rechazado.`
    : `Tu documento "${data.tipoDocumento}" fue rechazado por el administrador. Subí uno nuevo cuando puedas.`
  const cuerpoHtml = `
    <div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#7f1d1d;font-weight:500;">${escapeHtml(data.tipoDocumento)} no válido</p>
      ${data.motivo ? `<p style="margin:6px 0 0 0;font-size:13px;color:#991b1b;">${escapeHtml(data.motivo)}</p>` : ''}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:   data.esAdmin ? 'Documento rechazado' : 'Tu documento fue rechazado',
      intro,
      cuerpoHtml,
      ctaLabel: data.esAdmin ? 'Ver contrato' : 'Subir nuevo documento',
      ctaHref:  `/contratos/${data.contratoId}/documentos`,
    }),
  }
}
