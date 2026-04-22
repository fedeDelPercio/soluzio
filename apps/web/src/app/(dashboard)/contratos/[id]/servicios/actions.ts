'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

const SERVICIOS_VALIDOS = ['agua', 'electricidad', 'gas', 'municipal', 'expensas_ordinarias', 'expensas_extraordinarias', 'otro'] as const
type ServicioConcepto = typeof SERVICIOS_VALIDOS[number]

export async function crearPagoServicioAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  const contratoId  = formData.get('contrato_id') as string
  const concepto    = formData.get('concepto') as ServicioConcepto
  const anio        = parseInt(formData.get('anio') as string)
  const mes         = parseInt(formData.get('mes') as string)

  if (!contratoId) return { error: 'Falta contrato_id' }
  if (!SERVICIOS_VALIDOS.includes(concepto)) return { error: 'Servicio inválido' }
  if (!Number.isFinite(anio) || anio < 2000 || anio > 2100) return { error: 'Año inválido' }
  if (!Number.isFinite(mes) || mes < 1 || mes > 12) return { error: 'Mes inválido' }

  const admin = createAdminClient()

  const { data: contrato } = await admin
    .from('contratos')
    .select('id, organizacion_id, dia_vencimiento_pago, inquilino_id, coinquilino_id, facturas_servicios_las_carga, propiedad_id, propiedades ( propietario_id )')
    .eq('id', contratoId)
    .eq('organizacion_id', perfil.organizacion_id)
    .single()

  if (!contrato) return { error: 'Contrato no encontrado' }

  // Verificar que el usuario puede crear: admin o el rol designado (inquilino/propietario del contrato)
  const esAdmin       = perfil.rol === 'administrador'
  const esInquilino   = user.id === contrato.inquilino_id || user.id === contrato.coinquilino_id
  const esPropietario = user.id === (contrato.propiedades as any)?.propietario_id
  const rolDesignado  = contrato.facturas_servicios_las_carga ?? 'inquilino'
  const puedeCargar   = esAdmin
    || (rolDesignado === 'inquilino' && esInquilino)
    || (rolDesignado === 'propietario' && esPropietario)

  if (!puedeCargar) return { error: 'No tenés permiso para crear este pago' }

  // Buscar o crear el período del mes
  let periodoId: string | null = null
  const { data: periodoExist } = await admin
    .from('periodos_pago')
    .select('id')
    .eq('contrato_id', contratoId)
    .eq('anio', anio)
    .eq('mes', mes)
    .maybeSingle()

  if (periodoExist) {
    periodoId = (periodoExist as any).id
  } else {
    const diaVenc = contrato.dia_vencimiento_pago ?? 10
    const fechaVenc = new Date(anio, mes - 1, diaVenc)
    if (fechaVenc.getMonth() !== mes - 1) fechaVenc.setDate(0)
    const fechaVencStr = fechaVenc.toISOString().slice(0, 10)

    const { data: nuevoPeriodo, error: periodoErr } = await admin
      .from('periodos_pago')
      .insert({
        organizacion_id:   perfil.organizacion_id,
        contrato_id:       contratoId,
        anio,
        mes,
        fecha_vencimiento: fechaVencStr,
        monto:             0,
      })
      .select('id')
      .single()

    if (periodoErr || !nuevoPeriodo) return { error: periodoErr?.message ?? 'Error al crear período' }
    periodoId = (nuevoPeriodo as any).id
  }

  // Ya existe un pago para este período + concepto?
  const { data: existente } = await admin
    .from('pagos')
    .select('id')
    .eq('periodo_pago_id', periodoId)
    .eq('concepto', concepto)
    .maybeSingle()

  if (existente) {
    return { error: `Ya existe un pago de ${concepto.replace('_', ' ')} para ese mes.` }
  }

  // Fecha de vencimiento del período
  const { data: periodo } = await admin
    .from('periodos_pago')
    .select('fecha_vencimiento')
    .eq('id', periodoId)
    .single()

  const { error: pagoErr } = await admin.from('pagos').insert({
    organizacion_id:   perfil.organizacion_id,
    periodo_pago_id:   periodoId,
    contrato_id:       contratoId,
    concepto,
    estado:            'pendiente',
    monto_esperado:    0,
    fecha_vencimiento: (periodo as any).fecha_vencimiento,
  })

  if (pagoErr) return { error: pagoErr.message }

  revalidatePath(`/contratos/${contratoId}/servicios`)
  revalidatePath(`/contratos/${contratoId}/pagos`)
  revalidatePath('/pagos')
  return { ok: true }
}

export async function subirArchivoPagoServicioAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) return { error: 'No autorizado' }

  const pagoId        = formData.get('pago_id') as string
  const contratoId    = formData.get('contrato_id') as string
  const rutaArchivo   = formData.get('ruta_archivo') as string
  const tipo          = formData.get('tipo_comprobante') as 'factura' | 'pago'
  const montoRaw      = parseFloat(formData.get('monto') as string)
  const monto         = Number.isFinite(montoRaw) ? montoRaw : null

  if (!pagoId || !rutaArchivo) return { error: 'Datos incompletos' }
  if (tipo !== 'factura' && tipo !== 'pago') return { error: 'Tipo inválido' }

  const admin = createAdminClient()

  const { data: pago } = await admin
    .from('pagos')
    .select('id, organizacion_id, contrato_id, estado, monto_esperado')
    .eq('id', pagoId)
    .eq('organizacion_id', perfil.organizacion_id)
    .single()

  if (!pago) return { error: 'Pago no encontrado' }

  const { error: insErr } = await admin.from('comprobantes_pago').insert({
    organizacion_id:  perfil.organizacion_id,
    pago_id:          pagoId,
    ruta_archivo:     rutaArchivo,
    tipo_comprobante: tipo,
  })
  if (insErr) return { error: insErr.message }

  const updates: Record<string, unknown> = {}
  if (monto !== null && monto > 0) updates.monto_esperado = monto
  if (tipo === 'pago') updates.estado = 'comprobante_subido'

  if (Object.keys(updates).length > 0) {
    await admin.from('pagos').update(updates).eq('id', pagoId)
  }

  revalidatePath(`/contratos/${contratoId}/servicios`)
  revalidatePath(`/contratos/${contratoId}/pagos`)
  revalidatePath('/pagos')
  return { ok: true }
}

export async function eliminarPagoServicioAction(pagoId: string): Promise<{ ok?: true; error?: string }> {
  const { perfil } = await getSession()
  if (!perfil || perfil.rol !== 'administrador') return { error: 'Solo administradores' }

  const admin = createAdminClient()

  const { data: pago } = await admin
    .from('pagos')
    .select('contrato_id')
    .eq('id', pagoId)
    .single()

  if (!pago) return { error: 'Pago no encontrado' }

  const { error } = await admin.from('pagos').delete().eq('id', pagoId)
  if (error) return { error: error.message }

  revalidatePath(`/contratos/${pago.contrato_id}/servicios`)
  return { ok: true }
}
