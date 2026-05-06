// Layout base compartido por todos los templates de email.
// HTML inline-styled — máxima compatibilidad con clientes (Gmail, Outlook, etc.)

const APP_URL = Deno.env.get('APP_URL') ?? 'https://soluzio.com.ar'

export interface BaseTemplateProps {
  preheader?:   string         // primer línea visible en la inbox
  titulo:       string
  intro?:       string
  cuerpoHtml:   string
  ctaLabel?:    string
  ctaHref?:     string         // path relativo (ej: /pagos) o absoluto
}

export function renderBaseTemplate(props: BaseTemplateProps): string {
  const ctaHref = props.ctaHref
    ? (props.ctaHref.startsWith('http') ? props.ctaHref : `${APP_URL}${props.ctaHref}`)
    : null

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(props.titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  ${props.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(props.preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #f4f4f5;">
              <p style="margin:0;font-size:18px;font-weight:600;color:#18181b;">Soluzio</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(props.titulo)}</h1>
              ${props.intro ? `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#52525b;">${escapeHtml(props.intro)}</p>` : ''}
              <div style="font-size:14px;line-height:1.6;color:#27272a;">
                ${props.cuerpoHtml}
              </div>
              ${ctaHref && props.ctaLabel ? `
                <div style="margin-top:24px;">
                  <a href="${escapeAttr(ctaHref)}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;">${escapeHtml(props.ctaLabel)}</a>
                </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                Este es un email automático de Soluzio. Si tenés dudas, contactá al administrador de tu contrato.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeAttr(str: string): string {
  return escapeHtml(str)
}

// Helpers de formato compartidos
export function formatARS(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
}

export function formatFecha(fecha: string): string {
  // fecha en formato YYYY-MM-DD
  const [y, m, d] = fecha.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}
