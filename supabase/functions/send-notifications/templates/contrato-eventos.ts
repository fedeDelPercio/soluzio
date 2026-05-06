// Templates C1 (bienvenida) y C2 (contrato por vencer).

import { renderBaseTemplate, formatFecha, formatARS, escapeHtml } from './base.ts'

interface BienvenidaData {
  rol:               'inquilino' | 'propietario' | 'inmobiliario'
  nombreDestinatario: string
  propiedad:         string
  inquilinoNombre:   string
  monto:             number
  fechaInicio:       string
  fechaFin:          string | null
  contratoId:        string
}

export function buildContratoBienvenidaEmail(data: BienvenidaData): { asunto: string; html: string } {
  const asunto = data.rol === 'inquilino'
    ? `Bienvenido a ${data.propiedad}`
    : `Nuevo contrato registrado — ${data.propiedad}`

  const intro = data.rol === 'inquilino'
    ? `Tu contrato de alquiler en ${data.propiedad} esta registrado en Soluzio. Desde tu cuenta vas a poder subir comprobantes, cargar facturas de servicios y reportar solicitudes.`
    : data.rol === 'propietario'
    ? `Se registro un nuevo contrato para tu propiedad ${data.propiedad}. Te avisaremos cuando los pagos lleguen y cuando haya solicitudes pendientes.`
    : `Se registro un nuevo contrato para ${data.propiedad} bajo tu inmobiliaria.`

  const cuerpoHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Inquilino</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.inquilinoNombre)}</p></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Inicio</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${formatFecha(data.fechaInicio)}</p></td></tr>
      ${data.fechaFin ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Fin</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${formatFecha(data.fechaFin)}</p></td></tr>` : ''}
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Monto inicial</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${formatARS(data.monto)}/mes</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    data.rol === 'inquilino' ? `Hola ${data.nombreDestinatario}` : 'Nuevo contrato registrado',
      intro,
      cuerpoHtml,
      ctaLabel:  'Ver contrato',
      ctaHref:   `/contratos/${data.contratoId}`,
    }),
  }
}

interface ContratoPorVencerData {
  rol:               'inquilino' | 'admin' | 'propietario'
  inquilinoNombre?:  string
  propiedad:         string
  fechaFin:          string
  diasFaltantes:     number
  contratoId:        string
}

export function buildContratoPorVencerEmail(data: ContratoPorVencerData): { asunto: string; html: string } {
  const asunto = data.rol === 'inquilino'
    ? `Tu contrato vence en ${data.diasFaltantes} dias — ${data.propiedad}`
    : `Contrato proximo a vencer — ${data.propiedad}`
  const intro = data.rol === 'inquilino'
    ? `Tu contrato de alquiler vence el ${formatFecha(data.fechaFin)}. Quedan ${data.diasFaltantes} dias. Te conviene coordinar con el administrador la renovacion o la entrega.`
    : data.rol === 'admin'
    ? `El contrato de ${data.inquilinoNombre ?? 'el inquilino'} vence el ${formatFecha(data.fechaFin)} (en ${data.diasFaltantes} dias).`
    : `El contrato de tu propiedad vence el ${formatFecha(data.fechaFin)} (en ${data.diasFaltantes} dias).`
  const cuerpoHtml = `
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#92400e;font-weight:500;">Vence el ${formatFecha(data.fechaFin)}</p>
      <p style="margin:0;font-size:14px;color:#78350f;">Quedan ${data.diasFaltantes} dias.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;"><p style="margin:0;font-size:13px;color:#71717a;">Propiedad</p><p style="margin:0;font-size:14px;color:#27272a;font-weight:500;">${escapeHtml(data.propiedad)}</p></td></tr>
    </table>
  `
  return {
    asunto,
    html: renderBaseTemplate({
      titulo:    'Contrato por vencer',
      intro,
      cuerpoHtml,
      ctaLabel:  'Ver contrato',
      ctaHref:   `/contratos/${data.contratoId}`,
    }),
  }
}
