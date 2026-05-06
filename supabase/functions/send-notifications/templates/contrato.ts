// Templates C3 (contrato vencido) y C5 (contrato rescindido).

import { renderBaseTemplate, formatFecha, escapeHtml } from './base.ts'

interface ContratoData {
  rol:              'inquilino' | 'admin' | 'propietario' | 'inmobiliario'
  inquilinoNombre?: string
  propiedad:        string
  contratoId:       string
}

export function buildContratoVencidoEmail(data: ContratoData & { fechaFin: string }): { asunto: string; html: string } {
  const asunto = `Contrato vencido — ${data.propiedad}`
  const intro =
    data.rol === 'inquilino'
      ? `Tu contrato de alquiler venció el ${formatFecha(data.fechaFin)}. Coordiná con el administrador la renovación o la entrega.`
      : data.rol === 'admin'
      ? `El contrato de ${data.inquilinoNombre ?? 'el inquilino'} venció el ${formatFecha(data.fechaFin)}.`
      : `El contrato de tu propiedad venció el ${formatFecha(data.fechaFin)}.`
  const cuerpoHtml = `
    <div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#991b1b;font-weight:500;">Vencido el ${formatFecha(data.fechaFin)}</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Contrato vencido',
      intro,
      cuerpoHtml,
      ctaLabel:  'Ver contrato',
      ctaHref:   `/contratos/${data.contratoId}`,
    }),
  }
}

export function buildContratoRescindidoEmail(data: ContratoData): { asunto: string; html: string } {
  const asunto = `Contrato rescindido — ${data.propiedad}`
  const intro =
    data.rol === 'inquilino'
      ? `El contrato de tu alquiler fue rescindido. Coordiná los siguientes pasos con el administrador.`
      : data.rol === 'admin'
      ? `El contrato de ${data.inquilinoNombre ?? 'el inquilino'} fue rescindido.`
      : `El contrato de tu propiedad fue rescindido.`
  const cuerpoHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:   'Contrato rescindido',
      intro,
      cuerpoHtml,
      ctaLabel: 'Ver contrato',
      ctaHref:  `/contratos/${data.contratoId}`,
    }),
  }
}
