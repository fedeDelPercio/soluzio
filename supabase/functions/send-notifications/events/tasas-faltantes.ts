// Handler A4: Tasas faltantes el día del ajuste.
// Llega el día de aplicar un ajuste y la tasa IPC/ICL del mes anterior
// no fue cargada en indices_ajuste.
// Destinatario: Admin (solo).

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildTasasFaltantesEmail } from '../templates/tasas-faltantes.ts'
import { describirPropiedad, hoy } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

interface ContratoRow {
  id:                    string
  organizacion_id:       string
  proxima_fecha_ajuste:  string
  indice_ajuste:         'ipc' | 'icl' | 'fijo'
  estado:                string
  propiedades: { calle: string; numero: string; piso: string | null; depto: string | null } | null
  inquilino:   { nombre: string; apellido: string } | null
}

export async function handleTasasFaltantes(): Promise<ResultadoEvento> {
  const evento = 'tasas_ajuste_faltantes' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()
  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const fechaHoy = hoy()

  // Contratos que tienen ajuste hoy con índice IPC o ICL
  const { data: contratosRaw, error } = await supabase
    .from('contratos')
    .select(`
      id, organizacion_id, proxima_fecha_ajuste, indice_ajuste, estado,
      propiedades ( calle, numero, piso, depto ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
    `)
    .eq('proxima_fecha_ajuste', fechaHoy)
    .in('indice_ajuste', ['ipc', 'icl'])
    .in('estado', ['activo', 'por_vencer'])

  if (error) { resultado.errores.push(`query: ${error.message}`); return resultado }
  const contratos = (contratosRaw ?? []) as unknown as ContratoRow[]
  if (contratos.length === 0) return resultado

  // Para cada contrato, ver si la tasa del mes anterior está en indices_ajuste.
  const [yyyy, mm] = fechaHoy.split('-').map(Number)
  const fecha = new Date(Date.UTC(yyyy, mm - 1, 1))
  fecha.setUTCMonth(fecha.getUTCMonth() - 1)
  const anioMesAnterior = fecha.getUTCFullYear()
  const mesAnterior     = fecha.getUTCMonth() + 1
  const mesFaltanteStr  = `${anioMesAnterior}-${String(mesAnterior).padStart(2, '0')}`

  // Buscar tasas existentes de los índices que aparezcan en los contratos
  const indicesUsados = [...new Set(contratos.map((c) => c.indice_ajuste))]
  const { data: tasas } = await supabase
    .from('indices_ajuste')
    .select('tipo_indice')
    .eq('anio', anioMesAnterior)
    .eq('mes', mesAnterior)
    .in('tipo_indice', indicesUsados)

  const tasasPresentes = new Set((tasas ?? []).map((t: { tipo_indice: string }) => t.tipo_indice))

  for (const c of contratos) {
    if (!orgsHab.has(c.organizacion_id)) continue
    if (tasasPresentes.has(c.indice_ajuste)) continue  // tasa ya cargada → skip

    const propiedadStr = describirPropiedad(c.propiedades)
    const inqNombre = c.inquilino ? `${c.inquilino.nombre} ${c.inquilino.apellido}`.trim() : 'el inquilino'

    for (const a of await adminsDeOrg(c.organizacion_id)) {
      const { asunto, html } = buildTasasFaltantesEmail({
        contratoId:      c.id,
        propiedad:       propiedadStr,
        inquilinoNombre: inqNombre,
        fechaAjuste:     c.proxima_fecha_ajuste,
        indice:          c.indice_ajuste as 'ipc' | 'icl',
        mesFaltante:     mesFaltanteStr,
      })
      await reservarYEnviar({
        evento,
        organizacion_id:   c.organizacion_id,
        destinatario_id:   a.id,
        destinatarioEmail: a.email,
        contexto_unico:    `ajuste:${c.id}:${mesFaltanteStr}`,
        asunto, html,
        metadata:          { contrato_id: c.id, mes_faltante: mesFaltanteStr, indice: c.indice_ajuste },
      }, resultado)
    }
  }

  return resultado
}
