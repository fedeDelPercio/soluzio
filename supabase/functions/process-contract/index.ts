import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `Sos un asistente especializado en analizar contratos de alquiler argentinos.
Tu tarea es extraer información clave del contrato y devolverla en formato JSON.
Seguí exactamente el schema indicado. Si no encontrás un dato, usá null.
Fechas siempre en formato YYYY-MM-DD.
Montos siempre como números (sin símbolo $, sin puntos de miles, solo el número).
El campo "confianza" debe reflejar qué tan seguro estás de la extracción (0.0 a 1.0).`

const USER_PROMPT = `Analizá este contrato de alquiler y extraé los datos en el siguiente JSON exacto:

{
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD",
  "monto_inicial": número,
  "monto_deposito": número o null,
  "indice_ajuste": "ipc" | "icl" | "fijo",
  "periodo_ajuste_meses": número (cuántos meses acumula el índice, ej: 3 para trimestral),
  "vencimiento_seguro_incendio": "YYYY-MM-DD o null",
  "propiedad": {
    "tipo_propiedad": "departamento" | "casa" | "ph" | "local" | "oficina" | "galpon" | "otro",
    "calle": "string",
    "numero": "string",
    "piso": "string o null",
    "depto": "string o null",
    "barrio": "string o null",
    "ciudad": "string",
    "provincia": "string"
  },
  "inquilinos": [
    {
      "nombre": "string",
      "apellido": "string",
      "dni": "string o null",
      "email": "string o null",
      "telefono": "string o null"
    }
  ],
  "propietario": {
    "nombre": "string",
    "apellido": "string",
    "dni": "string o null",
    "email": "string o null",
    "telefono": "string o null"
  },
  "garante": {
    "nombre": "string",
    "apellido": "string",
    "dni": "string o null"
  } o null si no hay garante,
  "clausulas_especiales": ["lista de cláusulas especiales relevantes"],
  "confianza": número entre 0.0 y 1.0,
  "notas": "string o null con advertencias o comentarios"
}

Respondé SOLO con el JSON, sin texto adicional ni markdown.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('No autorizado', 401)

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return jsonError('No autorizado', 401)

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('organizacion_id, rol')
      .eq('id', user.id)
      .single()

    if (!perfil || perfil.rol !== 'administrador') {
      return jsonError('Solo administradores pueden procesar contratos', 403)
    }

    const body = await req.json()
    const { ruta_archivo, solo_analisis, contrato_id } = body

    if (!ruta_archivo) return jsonError('Falta ruta_archivo', 400)

    // Descargar el PDF desde Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('documentos')
      .download(ruta_archivo)

    if (downloadError || !fileData) {
      return jsonError(`Error al descargar el PDF: ${downloadError?.message}`, 500)
    }

    // Convertir a base64 (chunked para evitar stack overflow en PDFs grandes)
    const arrayBuffer = await fileData.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize))
    }
    const base64Pdf = btoa(binary)

    // Llamar a Claude
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type:   'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
              },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return jsonError(`Error de Claude API: ${err}`, 502)
    }

    const claudeData = await claudeRes.json()
    const rawText    = claudeData.content?.[0]?.text ?? ''

    let resultado
    try {
      resultado = JSON.parse(rawText)
    } catch {
      const match = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
      if (match) {
        resultado = JSON.parse(match[1])
      } else {
        return jsonError('Claude no devolvió JSON válido', 502)
      }
    }

    // Modo solo análisis: devolver resultado sin guardar en DB
    if (solo_analisis) {
      return new Response(
        JSON.stringify({ ok: true, resultado }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Modo completo: guardar en contrato existente
    if (!contrato_id) return jsonError('Falta contrato_id para modo completo', 400)

    const { data: contrato } = await supabaseAdmin
      .from('contratos')
      .select('id, organizacion_id')
      .eq('id', contrato_id)
      .eq('organizacion_id', perfil.organizacion_id)
      .single()

    if (!contrato) return jsonError('Contrato no encontrado', 404)

    await supabaseAdmin
      .from('contratos')
      .update({
        ia_analisis_raw:            claudeData,
        ia_analisis_resultado:      resultado,
        ia_confianza:               resultado.confianza ?? null,
        vencimiento_seguro_incendio: resultado.vencimiento_seguro_incendio ?? null,
      })
      .eq('id', contrato_id)

    await supabaseAdmin
      .from('documentos')
      .update({ estado: 'subido' })
      .eq('contrato_id', contrato_id)
      .eq('tipo_documento', 'contrato')

    return new Response(
      JSON.stringify({ ok: true, resultado }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return jsonError(msg, 500)
  }
})

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
