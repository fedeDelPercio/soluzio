import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const SYSTEM_PROMPT = `Sos un asistente especializado en analizar contratos de alquiler argentinos.
Tu tarea es extraer información clave del contrato y devolverla en formato JSON.
Seguí exactamente el schema indicado. Si no encontrás un dato, usá null.
Fechas siempre en formato YYYY-MM-DD.
Montos siempre como números (sin símbolo $, sin puntos de miles, solo el número).
El campo "confianza" debe reflejar qué tan seguro estás de la extracción (0.0 a 1.0).

REGLAS CRÍTICAS:
1. LOCADOR = propietario. LOCATARIO = inquilino(s). GARANTE o FIADOR = garante.
2. Si hay MÚLTIPLES personas identificadas como LOCATARIO, incluilas TODAS en el array "inquilinos". Es común que una pareja o dos personas firmen juntas como LOCATARIO.
3. "Domicilio electrónico" en contratos argentinos ES el email de esa persona. Extraelo siempre.
4. El depósito/garantía puede aparecer como "depósito de garantía", "garantía equivalente a X meses de alquiler", o un monto específico en alguna cláusula. Buscalo en todo el documento.
5. Si el documento combina contrato + anexo de garantía, extraé los datos del CONTRATO principal. El garante va en el campo "garante", NO en "inquilinos".
6. Para la moneda, detectá si los montos son en pesos argentinos (ARS) o dólares (USD). "Dólares estadounidenses", "U$S", "USD" → "usd". Pesos, "$", "ARS" → "ars".
7. Para el día de vencimiento del pago mensual ("dia_vencimiento_pago"):
   - Buscá en la cláusula de PRECIO / FORMA DE PAGO frases que indiquen cuándo debe abonarse el alquiler cada mes.
   - Variantes típicas: "del día 1 al día 10 de cada mes", "del 1° al 10 de cada mes", "entre el 1 y el 10", "dentro de los primeros 10 días", "hasta el día 10", "por mes adelantado hasta el 10", "vencimiento el día 10 de cada mes".
   - Si el rango cruza un salto de página o está separado por saltos de línea, igual interpretalo (ej: "del día 1° al día" + "10 de cada mes" = 10).
   - Extraé SIEMPRE el último día del rango (ej: "del 1 al 10" → 10; "dentro de los primeros 5 días" → 5; "hasta el 5" → 5).
   - El valor debe ser un entero entre 1 y 31. Solo usar null si realmente no hay ninguna mención al día de pago.
8. Para el seguro de incendio ("requiere_seguro_incendio"):
   - true si el contrato obliga al locatario a contratar un seguro de incendio/hogar/responsabilidad civil (frases como "deberá contratar seguro de incendio", "obligación de contratar seguro", "cobertura de incendio").
   - false si el contrato explícitamente NO exige seguro.
   - null si no hay ninguna mención.
9. Para la tasa de punitorio mensual ("tasa_punitorio_mensual"):
   - Buscá cláusulas de mora/punitorio con porcentaje mensual (frases como "interés punitorio del 5% mensual", "mora del 3% mensual", "punitorio equivalente al 5% mensual").
   - Extraé el número como porcentaje (ej: "5% mensual" → 5; "2.5% mensual" → 2.5).
   - Si la tasa es diaria, convertila a mensual aprox (ej: "0.2% diario" → 6).
   - null si no hay mención explícita.
10. Para la observación sobre modalidad de cobro ("observacion_modalidad_cobro"):
   - Leé la cláusula de mora y resumí en UNA frase CORTA (máx 80 caracteres) lo que dice el contrato.
   - Ejemplos: "mora automática al vencimiento", "mora a criterio del locador", "mora con intimación previa de 10 días", "no menciona mora".
   - Esta observación es SOLO para ayudar al admin a decidir si aplicará la mora de forma estricta o flexible; NO determina vos la modalidad.
   - null si no hay cláusula de mora en el contrato.`

const USER_PROMPT = `Analizá este contrato de alquiler y extraé los datos en el siguiente JSON exacto:

{
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD",
  "monto_inicial": número,
  "moneda": "ars" | "usd",
  "monto_deposito": número o null,
  "moneda_deposito": "ars" | "usd",
  "indice_ajuste": "ipc" | "icl" | "fijo",
  "periodo_ajuste_meses": número (cuántos meses acumula el índice, ej: 3 para trimestral),
  "dia_vencimiento_pago": número entre 1 y 31 o null (último día del rango de pago mensual, ej: "del 1 al 10" → 10),
  "requiere_seguro_incendio": true | false | null (si el contrato obliga al locatario a contratar seguro),
  "tasa_punitorio_mensual": número o null (porcentaje mensual de mora, ej: 5 para "5% mensual"),
  "observacion_modalidad_cobro": "string o null (frase corta sobre la cláusula de mora, ej: 'mora automática al vencimiento')",
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
      "email": "string o null (buscar 'domicilio electrónico')",
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
  },
  "clausulas_especiales": ["lista de cláusulas especiales relevantes"],
  "confianza": número entre 0.0 y 1.0,
  "notas": "string o null con advertencias o comentarios"
}

IMPORTANTE sobre "inquilinos": Si hay dos o más personas como LOCATARIO, el array debe tener UN objeto por cada persona. Ejemplo si son dos: [{"nombre":"Juan","apellido":"Pérez",...}, {"nombre":"María","apellido":"García",...}].
IMPORTANTE sobre "garante": Si no hay garante, poner null. No confundir garante con inquilino.
IMPORTANTE sobre "monto_deposito": Buscá en TODO el contrato frases como "depósito de garantía", "garantía equivalente a", "meses de depósito". Si encontrás el monto, extraelo. Si no hay ninguna mención, poner null.

Respondé SOLO con el JSON, sin texto adicional ni markdown.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('No autorizado', 401)

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Leer body una sola vez
    const body = await req.json()
    const { ruta_archivo, user_id, solo_analisis, contrato_id } = body

    // Autenticación: detectar si es service_role (API Route) o JWT de usuario (directo)
    let userId: string

    // Decodificar el JWT para ver el rol (sin verificar firma — el gateway ya lo hizo)
    const token = authHeader.replace('Bearer ', '')
    let jwtRole = ''
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      jwtRole = payload.role ?? ''
    } catch { /* token mal formado — se maneja abajo */ }

    if (jwtRole === 'service_role') {
      // Llamada desde el API Route del servidor — confiable
      if (!user_id) return jsonError('Falta user_id', 400)
      userId = user_id
    } else if (jwtRole === 'authenticated') {
      // Llamada con JWT de usuario — extraer sub del token
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

    // Verificar que el usuario es administrador
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('organizacion_id, rol')
      .eq('id', userId)
      .single()

    if (!perfil || perfil.rol !== 'administrador') {
      return jsonError('Solo administradores pueden procesar contratos', 403)
    }

    if (!ruta_archivo) return jsonError('Falta ruta_archivo', 400)

    // Descargar PDF desde Storage
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

    // Llamar a Claude con reintentos para errores transitorios
    const claudeBody = JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
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
    })

    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 4000
    let claudeRes: Response | null = null
    let lastErr = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      claudeRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta':    'pdfs-2024-09-25',
        },
        body: claudeBody,
      })

      if (claudeRes.ok) break

      const errText = await claudeRes.text()
      let errType = ''
      try { errType = JSON.parse(errText)?.error?.type ?? '' } catch { /* noop */ }

      // Solo reintentar en overloaded o rate_limit
      if (errType === 'overloaded_error' || claudeRes.status === 529 || claudeRes.status === 529) {
        lastErr = errType
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
          continue
        }
        return jsonError('El servicio de análisis está temporalmente saturado. Intentá de nuevo en unos minutos.', 503)
      }

      // Otro error — no reintentar
      return jsonError(`Error al analizar el contrato. Código: ${claudeRes.status}`, 502)
    }

    if (!claudeRes!.ok) {
      return jsonError('No se pudo conectar con el servicio de análisis después de varios intentos.', 503)
    }

    const claudeData = await claudeRes!.json()
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

    // Modo solo análisis: devolver sin guardar en DB
    if (solo_analisis) {
      return new Response(
        JSON.stringify({ ok: true, resultado }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
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
        ia_analisis_raw:             claudeData,
        ia_analisis_resultado:       resultado,
        ia_confianza:                resultado.confianza ?? null,
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
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return jsonError(msg, 500)
  }
})

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
