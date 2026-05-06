// Wrapper de la API de Resend.
// Usa fetch directo (no SDK) para minimizar dependencias en Deno.
// Docs: https://resend.com/docs/api-reference/emails/send-email

interface ResendSendInput {
  to:      string
  subject: string
  html:    string
  from?:   string
  tags?:   { name: string; value: string }[]
}

interface ResendSendResult {
  ok:        boolean
  id?:       string   // id del email en Resend (para tracking)
  error?:    string
  dryRun?:   boolean  // true cuando se saltó el envío por NOTIFICATIONS_DRY_RUN
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendEmail(input: ResendSendInput): Promise<ResendSendResult> {
  const apiKey       = Deno.env.get('RESEND_API_KEY')
  const fromEnv      = Deno.env.get('RESEND_FROM_EMAIL')
  // Salvaguarda 1: si está seteada, todos los emails se redirigen a este
  // email durante testing. Borrarla del vault para pasar a producción.
  const testOverride = Deno.env.get('NOTIFICATIONS_TEST_EMAIL')
  // Salvaguarda 2: dry-run global. Si está activa, ningún email se manda
  // pero la lógica corre completa (queries, dedup, registro). Útil para
  // validar handlers nuevos sin gastar reputación de dominio.
  const dryRun       = (Deno.env.get('NOTIFICATIONS_DRY_RUN') ?? '').toLowerCase() === 'true'

  if (!apiKey)  return { ok: false, error: 'RESEND_API_KEY no seteada' }
  if (!fromEnv && !input.from) return { ok: false, error: 'RESEND_FROM_EMAIL no seteada' }

  if (dryRun) {
    return { ok: true, id: `dry-run:${input.to}:${Date.now()}`, dryRun: true }
  }

  const destinoFinal = testOverride || input.to
  const subjectFinal = testOverride
    ? `[TEST → ${input.to}] ${input.subject}`
    : input.subject

  const payload = {
    from:    input.from ?? fromEnv,
    to:      [destinoFinal],
    subject: subjectFinal,
    html:    input.html,
    tags:    [
      ...(input.tags ?? []),
      ...(testOverride ? [{ name: 'modo', value: 'test' }] : []),
    ],
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({})) as { id?: string; message?: string; name?: string }

    if (!res.ok) {
      const msg = json.message || json.name || `HTTP ${res.status}`
      return { ok: false, error: `Resend: ${msg}` }
    }

    return { ok: true, id: json.id }
  } catch (err) {
    return { ok: false, error: `Resend fetch error: ${(err as Error).message}` }
  }
}
