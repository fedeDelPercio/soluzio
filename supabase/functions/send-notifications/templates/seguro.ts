// Templates S2 (recordatorio a 15 días) y S4 (vencido).

import { renderBaseTemplate, formatFecha, escapeHtml } from './base.ts'

interface SeguroData {
  esAdmin:          boolean
  inquilinoNombre?: string
  propiedad:        string
  contratoId:       string
}

export function buildSeguroRecordatorioEmail(data: SeguroData): { asunto: string; html: string } {
  const asunto = data.esAdmin
    ? `Seguro de incendio pendiente — ${data.propiedad}`
    : `Subí el seguro de incendio — ${data.propiedad}`
  const intro = data.esAdmin
    ? `${data.inquilinoNombre ?? 'El inquilino'} todavía no cargó la póliza de seguro de incendio (límite legal cumplido).`
    : `Pasaron 15 días desde el inicio del contrato y todavía no subiste el seguro de incendio. Es un requisito legal.`
  const cuerpoHtml = `
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#7f1d1d;font-weight:500;">El seguro contra incendio es obligatorio por ley para alquileres residenciales.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    data.esAdmin ? 'Seguro de incendio sin cargar' : 'Subí el seguro de incendio',
      intro,
      cuerpoHtml,
      ctaLabel:  data.esAdmin ? 'Ver contrato' : 'Subir póliza',
      ctaHref:   data.esAdmin ? `/contratos/${data.contratoId}` : `/contratos/${data.contratoId}/documentos`,
    }),
  }
}

interface SeguroVencidoData extends SeguroData {
  fechaVencimiento: string
}

export function buildSeguroVencidoEmail(data: SeguroVencidoData): { asunto: string; html: string } {
  const asunto = data.esAdmin
    ? `Seguro de incendio vencido — ${data.propiedad}`
    : `Tu seguro de incendio venció — ${data.propiedad}`
  const intro = data.esAdmin
    ? `La póliza de seguro de ${data.inquilinoNombre ?? 'el inquilino'} venció el ${formatFecha(data.fechaVencimiento)}.`
    : `Tu póliza de seguro de incendio venció el ${formatFecha(data.fechaVencimiento)}. Renová y subí la nueva lo antes posible.`
  const cuerpoHtml = `
    <div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#991b1b;font-weight:500;">Vencido el ${formatFecha(data.fechaVencimiento)}</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;">El seguro contra incendio es obligatorio mientras dure el contrato.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    data.esAdmin ? 'Seguro de incendio vencido' : 'Tu seguro venció',
      intro,
      cuerpoHtml,
      ctaLabel:  data.esAdmin ? 'Ver contrato' : 'Renovar póliza',
      ctaHref:   data.esAdmin ? `/contratos/${data.contratoId}` : `/contratos/${data.contratoId}/documentos`,
    }),
  }
}
