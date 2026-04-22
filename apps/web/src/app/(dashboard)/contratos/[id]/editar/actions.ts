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

  if (!fechaFin || isNaN(montoActual) || diaVencPago === null || reqSeguro === null || modalidad === null) redirect(`/contratos/${contratoId}`)

  // Traer el día actual para saber si cambió
  const { data: contratoPrev } = await (supabase as any)
    .from('contratos')
    .select('dia_vencimiento_pago, fecha_inicio')
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
      vencimiento_seguro_incendio: seguroVto,
    })
    .eq('id', contratoId)

  if (error) redirect(`/contratos/${contratoId}`)

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

  revalidatePath(`/contratos/${contratoId}`)
  revalidatePath(`/contratos/${contratoId}/pagos`)
  revalidatePath('/contratos')
  revalidatePath('/pagos')
  redirect(`/contratos/${contratoId}`)
}
