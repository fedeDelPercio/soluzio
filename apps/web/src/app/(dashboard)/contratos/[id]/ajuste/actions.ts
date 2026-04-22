'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { calcularAjuste } from '@alquileres/shared'

export async function aplicarAjusteAction(contratoId: string): Promise<void> {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') redirect('/login')

  const supabase = await createClient()
  const db = supabase as any

  // 1. Cargar el contrato
  const { data: contratoRaw } = await db
    .from('contratos')
    .select('id, organizacion_id, monto_actual, indice_ajuste, periodo_ajuste_meses, proxima_fecha_ajuste')
    .eq('id', contratoId)
    .single()

  if (!contratoRaw) return

  const contrato = contratoRaw as {
    id: string
    organizacion_id: string
    monto_actual: number
    indice_ajuste: string
    periodo_ajuste_meses: number
    proxima_fecha_ajuste: string
  }

  if (contrato.indice_ajuste === 'fijo') return

  // 2. Calcular el rango de meses a usar
  // Meses = los periodo_ajuste_meses meses anteriores a proxima_fecha_ajuste
  const proxima = new Date(contrato.proxima_fecha_ajuste + 'T00:00:00')
  const mesDesde = new Date(proxima)
  mesDesde.setMonth(mesDesde.getMonth() - contrato.periodo_ajuste_meses)
  // mesDesde = primer mes del rango (inclusive)
  // proxima = mes hasta (exclusive) → último mes = proxima - 1 mes

  const { data: tasasRaw } = await db
    .from('indices_ajuste')
    .select('anio, mes, valor_tasa')
    .eq('tipo_indice', contrato.indice_ajuste)
    .gte('anio', mesDesde.getFullYear())
    .lte('anio', proxima.getFullYear())
    .order('anio', { ascending: true })
    .order('mes', { ascending: true })

  // Filtrar al rango exacto por (anio*12 + mes)
  const desdeTotal = mesDesde.getFullYear() * 12 + mesDesde.getMonth() + 1  // getMonth() es 0-based
  const hastaTotal = proxima.getFullYear() * 12 + proxima.getMonth()         // exclusive: mes de proxima_fecha_ajuste no incluido

  const tasas = ((tasasRaw ?? []) as { anio: number; mes: number; valor_tasa: number }[])
    .filter(t => {
      const total = t.anio * 12 + t.mes
      return total >= desdeTotal && total < hastaTotal
    })

  if (tasas.length === 0) return

  // 3. Calcular nuevo monto
  const resultado = calcularAjuste(contrato.monto_actual, tasas, contrato.periodo_ajuste_meses)

  // 4. Insertar en calculos_ajuste
  await db.from('calculos_ajuste').insert({
    organizacion_id:      contrato.organizacion_id,
    contrato_id:          contratoId,
    monto_anterior:       resultado.monto_anterior,
    monto_nuevo:          resultado.monto_nuevo,
    tasa_acumulada:       resultado.tasa_acumulada,
    variacion_porcentual: resultado.variacion_porcentual,
    periodos_usados:      resultado.periodos_usados,
    aplicado_por:         user.id,
  })

  // 5. Actualizar monto_actual y proxima_fecha_ajuste en el contrato
  const nuevaProxima = new Date(proxima)
  nuevaProxima.setMonth(nuevaProxima.getMonth() + contrato.periodo_ajuste_meses)

  await db
    .from('contratos')
    .update({
      monto_actual:         resultado.monto_nuevo,
      proxima_fecha_ajuste: nuevaProxima.toISOString().slice(0, 10),
    })
    .eq('id', contratoId)

  // 6. Actualizar periodos_pago y pagos futuros (aún no vencidos) con el nuevo monto
  const hoy = new Date().toISOString().slice(0, 10)

  const { data: periodosRaw } = await db
    .from('periodos_pago')
    .select('id')
    .eq('contrato_id', contratoId)
    .gte('fecha_vencimiento', hoy)

  if (periodosRaw && periodosRaw.length > 0) {
    const periodoIds = (periodosRaw as { id: string }[]).map(p => p.id)

    await db
      .from('periodos_pago')
      .update({ monto: resultado.monto_nuevo })
      .in('id', periodoIds)

    await db
      .from('pagos')
      .update({ monto_esperado: resultado.monto_nuevo })
      .eq('contrato_id', contratoId)
      .gte('fecha_vencimiento', hoy)
      .in('estado', ['pendiente', 'atrasado'])
  }

  revalidatePath(`/contratos/${contratoId}`)
}
