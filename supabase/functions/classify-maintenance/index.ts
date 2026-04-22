import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const SYSTEM_PROMPT = `Sos un asistente especializado en administración de alquileres en Argentina.
Tu tarea es clasificar quién es responsable de una reparación o problema reportado por un inquilino.

REGLAS DE RESPONSABILIDAD (basadas en el Código Civil y Comercial argentino):

PROPIETARIO (Art. 1201 CCCN — reparaciones que no son de uso normal):
- Problemas estructurales: filtraciones de techo, humedad por construcción, grietas
- Cañerías rotas o tapadas por antigüedad (no por mal uso)
- Instalación eléctrica defectuosa (tablero, cables, tomas quemadas por falla de instalación)
- Caldera, termotanque o calefacción central que deja de funcionar
- Ventanas o puertas que no cierran por deformación estructural
- Plagas si es problema del edificio (no por suciedad del inquilino)

INQUILINO (Art. 1206 CCCN — reparaciones de uso normal):
- Vidrio roto por golpe o accidente del inquilino
- Llave o cerradura dañada por mal uso
- Desagüe tapado por uso (pelos, residuos)
- Cambio de cueritosgrifería desgastados por uso
- Limpieza y mantenimiento básico
- Daños causados directamente por el inquilino o sus visitas

CONSORCIO (áreas comunes del edificio):
- Ascensor o montacargas
- Tanque de agua colectivo
- Fachada, frente o terraza común
- Palier, escaleras, pasillos
- Medianeras
- Instalaciones del edificio que no son de la unidad

INDETERMINADO: si la descripción es ambigua, falta información, o no se puede determinar sin inspección.

CATEGORÍAS DISPONIBLES: plomeria, electricidad, gas, estructura, cerrajeria, pintura, humedad, plagas, ascensor, ventanas_puertas, electrodomesticos, otro

Respondé SOLO con JSON válido, sin texto adicional ni markdown:
{
  "responsable": "inquilino" | "propietario" | "consorcio" | "indeterminado",
  "confianza": número entre 0.0 y 1.0,
  "razonamiento": "explicación breve en español (máximo 2 oraciones)",
  "categoria_sugerida": "una de las categorías listadas"
}`

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('No autorizado', 401)

    const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
    const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey  = Deno.env.get('ANTHROPIC_API_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { solicitud_id, titulo: tituloDirecto, descripcion: descripcionDirecta, user_id } = body

    // Autenticación: service_role (desde API Route) o JWT de usuario
    let userId: string
    const token = authHeader.replace('Bearer ', '')
    let jwtRole = ''
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      jwtRole = payload.role ?? ''
    } catch { /* ignorar */ }

    if (jwtRole === 'service_role') {
      if (!user_id) return jsonError('Falta user_id', 400)
      userId = user_id
    } else if (jwtRole === 'authenticated') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.sub
        if (!userId) return jsonError('Token inválido', 401)
      } catch {
        return jsonError('Token inválido', 401)
      }
    } else {
      return jsonError('No autorizado', 401)
    }

    // Verificar que el usuario es admin o inquilino
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('organizacion_id, rol')
      .eq('id', userId)
      .single()

    if (!perfil || !['administrador', 'inquilino'].includes(perfil.rol)) {
      return jsonError('No autorizado para clasificar solicitudes', 403)
    }

    // Obtener titulo y descripcion (desde solicitud_id o directo)
    let titulo = tituloDirecto as string
    let descripcion = descripcionDirecta as string
    let fotosRutas: string[] = []

    if (solicitud_id) {
      const { data: solicitud } = await supabaseAdmin
        .from('solicitudes')
        .select('titulo, descripcion, tipo')
        .eq('id', solicitud_id)
        .single()

      if (!solicitud) return jsonError('Solicitud no encontrada', 404)
      if (solicitud.tipo !== 'mantenimiento') {
        return jsonError('Solo se clasifican solicitudes de mantenimiento', 400)
      }

      titulo = solicitud.titulo
      descripcion = solicitud.descripcion

      // Obtener fotos (máximo 3)
      const { data: fotos } = await supabaseAdmin
        .from('fotos_solicitud')
        .select('ruta_archivo')
        .eq('solicitud_id', solicitud_id)
        .limit(3)

      fotosRutas = (fotos ?? []).map((f: { ruta_archivo: string }) => f.ruta_archivo)
    }

    if (!titulo || !descripcion) {
      return jsonError('Faltan titulo y descripcion', 400)
    }

    // Construir el contenido del mensaje para Claude
    const messageContent: unknown[] = []

    // Descargar y encodear fotos si hay
    for (const ruta of fotosRutas) {
      try {
        const { data: fileData } = await supabaseAdmin.storage
          .from('mantenimiento')
          .download(ruta)
        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          let binary = ''
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          const base64 = btoa(binary)
          const ext = ruta.split('.').pop()?.toLowerCase() ?? 'jpeg'
          const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          })
        }
      } catch {
        // Si falla una foto, continuar sin ella
      }
    }

    // Texto de la solicitud
    messageContent.push({
      type: 'text',
      text: `Título del problema: ${titulo}\n\nDescripción: ${descripcion}`,
    })

    // Llamar a Claude
    const claudeResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text()
      console.error('Claude error:', errText)
      return jsonError('Error al clasificar con IA', 500)
    }

    const claudeData = await claudeResponse.json()
    const rawText = claudeData.content?.[0]?.text ?? ''

    // Parsear JSON (puede venir envuelto en markdown)
    let resultado: {
      responsable: string
      confianza: number
      razonamiento: string
      categoria_sugerida: string
    }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      resultado = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    } catch {
      console.error('Error parseando respuesta de Claude:', rawText)
      return jsonError('Error procesando respuesta de IA', 500)
    }

    // Si se proporcionó solicitud_id, actualizar la fila
    if (solicitud_id) {
      const { error: updateError } = await supabaseAdmin
        .from('solicitudes')
        .update({
          ia_sugerencia_responsable: resultado.responsable,
          ia_clasificacion_raw: claudeData,
          ia_confianza: resultado.confianza,
          categoria: resultado.categoria_sugerida,
          estado: 'clasificado',
        })
        .eq('id', solicitud_id)

      if (updateError) {
        console.error('Error actualizando solicitud:', updateError)
      }
    }

    return jsonOk({ ok: true, resultado })
  } catch (err) {
    console.error('Error en classify-maintenance:', err)
    return jsonError('Error interno del servidor', 500)
  }
})
