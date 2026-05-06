// Helper de alto nivel: dado un destinatario y el contenido, hace
// reservarSlot → sendEmail → actualizarEstado, y actualiza el
// ResultadoEvento. Saca boilerplate de los handlers.

import { reservarSlot, actualizarEstado } from './dedup.ts'
import { sendEmail } from './resend.ts'
import type { EventoCritico, ResultadoEvento } from './types.ts'

interface EnviarInput {
  evento:           EventoCritico
  organizacion_id:  string
  destinatario_id:  string
  destinatarioEmail: string
  contexto_unico:   string
  asunto:           string
  html:             string
  metadata?:        Record<string, unknown>
}

export async function reservarYEnviar(
  input: EnviarInput,
  resultado: ResultadoEvento,
): Promise<void> {
  let reservado: { id: string } | null = null
  try {
    reservado = await reservarSlot({
      organizacion_id:   input.organizacion_id,
      destinatario_id:   input.destinatario_id,
      tipo_notificacion: input.evento,
      contexto_unico:    input.contexto_unico,
      metadata:          input.metadata,
    })
  } catch (err) {
    resultado.errores.push(`reservarSlot ${input.destinatarioEmail}: ${(err as Error).message}`)
    return
  }

  if (reservado === null) {
    resultado.dedup++
    return
  }

  const send = await sendEmail({
    to:      input.destinatarioEmail,
    subject: input.asunto,
    html:    input.html,
    tags:    [{ name: 'evento', value: input.evento }],
  })

  if (send.ok) {
    resultado.enviados++
    const estadoFinal = send.dryRun ? 'suprimido' : 'enviado'
    await actualizarEstado(reservado.id, estadoFinal, send.id)
  } else {
    resultado.fallidos++
    resultado.errores.push(`${input.destinatarioEmail}: ${send.error}`)
    await actualizarEstado(reservado.id, 'fallido', undefined, { error: send.error })
  }
}
