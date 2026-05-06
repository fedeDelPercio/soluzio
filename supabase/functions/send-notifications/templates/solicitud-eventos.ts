// Templates M1 (solicitud nueva) y M5 (solicitud sin respuesta).

import { renderBaseTemplate, formatFecha, escapeHtml } from './base.ts'

interface SolicitudNuevaData {
  solicitudId:     string
  titulo:          string
  tipo:            string
  prioridad:       string
  inquilinoNombre: string
  propiedad:       string
}

export function buildSolicitudNuevaEmail(data: SolicitudNuevaData): { asunto: string; html: string } {
  const asunto = `Solicitud nueva — ${data.propiedad}`
  const cuerpoHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Titulo</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.titulo)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Tipo</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.tipo)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Prioridad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.prioridad)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Nueva solicitud reportada',
      intro:     'Un inquilino reporto una nueva solicitud. Revisala cuando puedas.',
      cuerpoHtml,
      ctaLabel:  'Ver solicitud',
      ctaHref:   `/solicitudes/${data.solicitudId}`,
    }),
  }
}

interface SolicitudSinRespuestaData {
  solicitudId:     string
  titulo:          string
  inquilinoNombre: string
  propiedad:       string
  diasSinRespuesta: number
  creadoEn:        string
}

export function buildSolicitudSinRespuestaEmail(data: SolicitudSinRespuestaData): { asunto: string; html: string } {
  const asunto = `Solicitud sin respuesta hace ${data.diasSinRespuesta} dias — ${data.propiedad}`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#78350f;">Esta solicitud lleva ${data.diasSinRespuesta} dias sin actividad.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Titulo</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.titulo)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Reportada</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${formatFecha(data.creadoEn.slice(0, 10))}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Solicitud sin respuesta',
      intro:     'Hay una solicitud que lleva varios dias sin actividad del administrador.',
      cuerpoHtml,
      ctaLabel:  'Ver solicitud',
      ctaHref:   `/solicitudes/${data.solicitudId}`,
    }),
  }
}
