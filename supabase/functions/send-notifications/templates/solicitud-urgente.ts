// Template M2: Solicitud urgente (apenas se crea con prioridad alta o urgente).

import { renderBaseTemplate, escapeHtml } from './base.ts'

export interface SolicitudUrgenteData {
  solicitudId:     string
  titulo:          string
  tipo:            string
  prioridad:       string
  inquilinoNombre: string
  propiedad:       string
}

export function buildSolicitudUrgenteEmail(data: SolicitudUrgenteData): { asunto: string; html: string } {
  const asunto = `🚨 Solicitud ${data.prioridad} — ${data.propiedad}`
  const cuerpoHtml = `
    <div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#991b1b;font-weight:500;text-transform:uppercase;">Prioridad ${data.prioridad}</p>
      <p style="margin:0;font-size:16px;color:#7f1d1d;font-weight:600;">${escapeHtml(data.titulo)}</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Tipo</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.tipo)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Solicitud nueva con prioridad alta',
      intro:     'Un inquilino reportó una solicitud que requiere atención inmediata.',
      cuerpoHtml,
      ctaLabel:  'Ver solicitud',
      ctaHref:   `/solicitudes/${data.solicitudId}`,
    }),
  }
}
