import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

interface IndiceRow {
  tipo_indice: 'ipc' | 'icl'
  anio:        number
  mes:         number
  valor_tasa:  number
}

// ───────────────────────────────────────────────────────────
// Sources
// ───────────────────────────────────────────────────────────

// IPC: argentinadatos.com publica la variación mensual oficial del INDEC.
// Endpoint público sin auth. Respuesta: [{fecha:"YYYY-MM-DD", valor:8.8}, ...]
// El valor es % mensual (8.8 = 8.8%).
async function fetchIPC(): Promise<IndiceRow[]> {
  const res = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion')
  if (!res.ok) throw new Error(`IPC API ${res.status}`)
  const data = await res.json() as Array<{ fecha: string; valor: number }>

  return data.map((d) => {
    const [y, m] = d.fecha.split('-').map(Number)
    return {
      tipo_indice: 'ipc' as const,
      anio: y,
      mes:  m,
      // valor viene en % → convertir a decimal (8.8 → 0.088)
      valor_tasa: Math.round((d.valor / 100) * 1_000_000) / 1_000_000,
    }
  }).filter((r) => Number.isFinite(r.anio) && Number.isFinite(r.mes) && Number.isFinite(r.valor_tasa))
}

// ICL: BCRA publica el coeficiente diario (variable id=40, v4 API).
// Calculamos la variación mensual como (ICL_fin_mes / ICL_inicio_mes) - 1.
async function fetchICL(): Promise<IndiceRow[]> {
  // Fetcheamos los últimos ~3 años en chunks (la API limita a 1000 filas).
  const hoy = new Date()
  const fmtDate = (d: Date) => d.toISOString().split('T')[0]

  const series: Array<{ fecha: string; valor: number }> = []
  for (let i = 0; i < 3; i++) {
    const hasta = new Date(hoy.getFullYear() - i, hoy.getMonth(), hoy.getDate())
    const desde = new Date(hoy.getFullYear() - i - 1, hoy.getMonth(), hoy.getDate() + 1)
    const url = `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/40?desde=${fmtDate(desde)}&hasta=${fmtDate(hasta)}&limit=1000`
    const res = await fetch(url)
    if (!res.ok) {
      // si falla un chunk, seguimos con los demás
      continue
    }
    const json = await res.json() as { results?: Array<{ idVariable: number; detalle: Array<{ fecha: string; valor: number }> }> }
    const detalle = json.results?.[0]?.detalle ?? []
    for (const d of detalle) {
      if (Number.isFinite(d.valor)) series.push({ fecha: d.fecha, valor: d.valor })
    }
  }

  if (series.length < 2) return []

  // Ordenar por fecha asc
  series.sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Agrupar por (anio, mes), tomar primer y último valor de cada mes.
  const porMes = new Map<string, { primero: number; ultimo: number }>()
  for (const r of series) {
    const key = r.fecha.slice(0, 7) // YYYY-MM
    const cur = porMes.get(key)
    if (!cur) porMes.set(key, { primero: r.valor, ultimo: r.valor })
    else cur.ultimo = r.valor
  }

  // Convertir a array ordenado para procesar variación mes a mes.
  const meses = Array.from(porMes.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => a.key.localeCompare(b.key))

  // Variación del mes M = (ICL_inicio_M+1 / ICL_inicio_M) - 1
  // Donde ICL_inicio_M+1 ≈ ultimo valor del mes M (proxy razonable).
  const out: IndiceRow[] = []
  for (let i = 0; i < meses.length; i++) {
    const m = meses[i]
    const next = meses[i + 1]
    const inicio = m.primero
    const fin    = next ? next.primero : m.ultimo
    if (!inicio || inicio === 0) continue
    const tasa = (fin / inicio) - 1
    if (!Number.isFinite(tasa)) continue
    const [y, mm] = m.key.split('-').map(Number)
    out.push({
      tipo_indice: 'icl',
      anio: y,
      mes:  mm,
      valor_tasa: Math.round(tasa * 1_000_000) / 1_000_000,
    })
  }
  return out
}

// ───────────────────────────────────────────────────────────
// Handler
// ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  // Auth: requerimos service_role token para evitar abuso (lo llaman
  // crons, no usuarios). El verify_jwt está activado a nivel plataforma,
  // así que cualquier JWT válido pasa; chequeamos rol service_role aquí.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Decodificar payload del JWT (sin verificar firma — la verifica la plataforma).
  let role: string | undefined
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    role = decoded.role
  } catch (_) {
    role = undefined
  }
  if (role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Solo service_role puede invocar' }), {
      status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const resultado: {
    ipc:   { fetched: number; upserted: number; error?: string }
    icl:   { fetched: number; upserted: number; error?: string }
  } = {
    ipc: { fetched: 0, upserted: 0 },
    icl: { fetched: 0, upserted: 0 },
  }

  // IPC
  try {
    const filas = await fetchIPC()
    resultado.ipc.fetched = filas.length
    if (filas.length > 0) {
      const { error, count } = await supabase
        .from('indices_ajuste')
        .upsert(filas, { onConflict: 'tipo_indice,anio,mes', count: 'exact' })
      if (error) throw error
      resultado.ipc.upserted = count ?? filas.length
    }
  } catch (err) {
    resultado.ipc.error = (err as Error).message
  }

  // ICL
  try {
    const filas = await fetchICL()
    resultado.icl.fetched = filas.length
    if (filas.length > 0) {
      const { error, count } = await supabase
        .from('indices_ajuste')
        .upsert(filas, { onConflict: 'tipo_indice,anio,mes', count: 'exact' })
      if (error) throw error
      resultado.icl.upserted = count ?? filas.length
    }
  } catch (err) {
    resultado.icl.error = (err as Error).message
  }

  return new Response(JSON.stringify({
    ok: true,
    ejecutado_en: new Date().toISOString(),
    ...resultado,
  }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
