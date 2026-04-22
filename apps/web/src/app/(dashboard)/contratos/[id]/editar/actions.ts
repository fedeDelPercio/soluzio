'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

export async function editarContratoAction(contratoId: string, formData: FormData): Promise<void> {
  const { perfil } = await getSession()
  if (perfil?.rol !== 'administrador') redirect('/login')

  const supabase = await createClient()

  const montoActual    = parseFloat(formData.get('monto_actual') as string)
  const montoDeposito  = formData.get('monto_deposito') ? parseFloat(formData.get('monto_deposito') as string) : null
  const fechaFin       = formData.get('fecha_fin') as string
  const indiceAjuste   = formData.get('indice_ajuste') as string
  const periodoAjuste  = parseInt(formData.get('periodo_ajuste_meses') as string)
  const seguroVto      = (formData.get('vencimiento_seguro_incendio') as string) || null
  const diaVencRaw     = parseInt(formData.get('dia_vencimiento_pago') as string)
  const diaVencPago    = Number.isFinite(diaVencRaw) && diaVencRaw >= 1 && diaVencRaw <= 31 ? diaVencRaw : null

  const reqSeguroRaw   = formData.get('requiere_seguro_incendio') as string
  const reqSeguro      = reqSeguroRaw === 'si' ? true : reqSeguroRaw === 'no' ? false : null

  const modalidadRaw   = formData.get('modalidad_cobro') as string
  const modalidad      = (modalidadRaw === 'estricto' || modalidadRaw === 'flexible') ? modalidadRaw : null

  const tasaRaw        = parseFloat(formData.get('tasa_punitorio_mensual') as string)
  const tasaPunitorio  = Number.isFinite(tasaRaw) && tasaRaw >= 0 && tasaRaw <= 100 ? tasaRaw : null

  const facturasRaw    = formData.get('facturas_servicios_las_carga') as string
  const facturasLasCarga = (facturasRaw === 'inquilino' || facturasRaw === 'propietario') ? facturasRaw : 'inquilino'

  const SERVICIOS_VALIDOS = ['electricidad', 'gas', 'agua', 'expensas_ordinarias', 'expensas_extraordinarias', 'municipal', 'otro']
  const serviciosAplicables = formData.getAll('servicios_aplicables')
    .map((v) => v as string)
    .filter((v) => SERVICIOS_VALIDOS.includes(v))

  const inmobiliarioId = (formData.get('inmobiliario_id') as string) || null

  if (!fechaFin || isNaN(montoActual) || diaVencPago === null || reqSeguro === null || modalidad === null) redirect(`/contratos/${contratoId}`)

  // Traer el estado previo (para detectar cambios en día de venc. y servicios)
  const { data: contratoPrev } = await (supabase as any)
    .from('contratos')
    .select('dia_vencimiento_pago, fecha_inicio, fecha_fin, servicios_aplicables, organizacion_id')
    .eq('id', contratoId)
    .single()

  const { error } = await (supabase as any)
    .from('contratos')
    .update({
      fecha_fin:                  fechaFin,
      monto_actual:               montoActual,
      monto_deposito:             montoDeposito,
      indice_ajuste:              indiceAjuste,
      periodo_ajuste_meses:       periodoAjuste,
      dia_vencimiento_pago:       diaVencPago,
      requiere_seguro_incendio:   reqSeguro,
      modalidad_cobro:            modalidad,
      tasa_punitorio_mensual:     tasaPunitorio,
      facturas_servicios_las_carga: facturasLasCarga,
      servicios_aplicables:       serviciosAplicables,
      vencimiento_seguro_incendio: seguroVto,
    })
    .eq('id', contratoId)

  if (error) redirect(`/contratos/${contratoId}`)

  // Actualizar inmobiliario_id en la propiedad vinculada
  const { data: contratoProp } = await (supabase as any)
    .from('contratos')
    .select('propiedad_id')
    .eq('id', contratoId)
    .single()
  if (contratoProp?.propiedad_id) {
    await (supabase as any)
      .from('propiedades')
      .update({ inmobiliario_id: inmobiliarioId })
      .eq('id', contratoProp.propiedad_id)
  }

  // Si cambió el día de vencimiento, recalcular fecha_vencimiento de pagos no abonados
  // y sus periodos_pago asociados.
  if (contratoPrev?.dia_vencimiento_pago !== diaVencPago) {
    const { data: periodos } = await (supabase as any)
      .from('periodos_pago')
      .select('id, anio, mes')
      .eq('contrato_id', contratoId)

    if (periodos && periodos.length > 0) {
      for (const p of periodos as { id: string; anio: number; mes: number }[]) {
        const fechaVenc = new Date(p.anio, p.mes - 1, diaVencPago)
        if (fechaVenc.getMonth() !== p.mes - 1) fechaVenc.setDate(0)
        const fechaVencStr = fechaVenc.toISOString().slice(0, 10)

        await (supabase as any)
          .from('periodos_pago')
          .update({ fecha_vencimiento: fechaVencStr })
          .eq('id', p.id)

        // Solo recalculamos pagos que aún no fueron confirmados (pendiente, atrasado)
        await (supabase as any)
          .from('pagos')
          .update({ fecha_vencimiento: fechaVencStr })
          .eq('periodo_pago_id', p.id)
          .in('estado', ['pendiente', 'atrasado'])
      }
    }
  }

  // Reconciliar pagos de servicios si hubo cambios en servicios_aplicables
  const prevServicios = new Set((contratoPrev?.servicios_aplicables ?? []) as string[])
  const nuevServicios = new Set(serviciosAplicables)
  const agregados = serviciosAplicables.filter((s) => !prevServicios.has(s))
  const removidos = Array.from(prevServicios).filter((s) => !nuevServicios.has(s))

  if (agregados.length > 0 || removidos.length > 0) {
    const hoy = new Date()
    const anioActual = hoy.getFullYear()
    const mesActual  = hoy.getMonth() + 1

    // 1. Remover pagos de servicios desmarcados (solo futuros pendientes sin comprobante)
    if (removidos.length > 0) {
      const { data: pagosABorrar } = await (supabase as any)
        .from('pagos')
        .select('id, periodos_pago(anio, mes), comprobantes_pago(id)')
        .eq('contrato_id', contratoId)
        .in('concepto', removidos)
        .eq('estado', 'pendiente')

      const idsABorrar = (pagosABorrar ?? [])
        .filter((p: any) => {
          const pp = p.periodos_pago
          if (!pp) return false
          const esActualOFuturo = pp.anio > anioActual || (pp.anio === anioActual && pp.mes >= mesActual)
          const sinComprobante  = (p.comprobantes_pago ?? []).length === 0
          return esActualOFuturo && sinComprobante
        })
        .map((p: any) => p.id)

      if (idsABorrar.length > 0) {
        await (supabase as any).from('pagos').delete().in('id', idsABorrar)
      }
    }

    // 2. Agregar pagos para servicios recién marcados (desde este mes hasta fin de contrato)
    if (agregados.length > 0) {
      const { data: periodos } = await (supabase as any)
        .from('periodos_pago')
        .select('id, anio, mes, fecha_vencimiento')
        .eq('contrato_id', contratoId)
        .order('anio', { ascending: true })
        .order('mes', { ascending: true })

      const periodosFuturos = (periodos ?? []).filter((p: any) =>
        p.anio > anioActual || (p.anio === anioActual && p.mes >= mesActual),
      )

      const nuevosPagos: object[] = []
      for (const p of periodosFuturos) {
        for (const servicio of agregados) {
          // Evitar duplicados si ya existe
          const { count } = await (supabase as any)
            .from('pagos')
            .select('id', { count: 'exact', head: true })
            .eq('periodo_pago_id', p.id)
            .eq('concepto', servicio)
          if ((count ?? 0) > 0) continue

          nuevosPagos.push({
            organizacion_id:   contratoPrev?.organizacion_id,
            periodo_pago_id:   p.id,
            contrato_id:       contratoId,
            concepto:          servicio,
            estado:            'pendiente',
            monto_esperado:    0,
            fecha_vencimiento: p.fecha_vencimiento,
          })
        }
      }

      if (nuevosPagos.length > 0) {
        await (supabase as any).from('pagos').insert(nuevosPagos)
      }
    }
  }

  revalidatePath(`/contratos/${contratoId}`)
  revalidatePath(`/contratos/${contratoId}/pagos`)
  revalidatePath(`/contratos/${contratoId}/servicios`)
  revalidatePath('/contratos')
  revalidatePath('/pagos')
  revalidatePath('/servicios')
  redirect(`/contratos/${contratoId}`)
}
