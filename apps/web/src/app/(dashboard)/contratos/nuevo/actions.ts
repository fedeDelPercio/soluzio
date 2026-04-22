'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'

export async function crearContratoDesdeAnalisisAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') {
    return { error: 'No autorizado' }
  }

  const supabase = await createClient()
  const db       = supabase as any
  const admin    = createAdminClient()

  // Helper: buscar usuario existente por email o crearlo
  async function findOrCreateUser(email: string, metadata: Record<string, unknown>): Promise<{ id: string | null; error: string | null }> {
    const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (existing) return { id: existing.id, error: null }
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: metadata })
    if (error) return { id: null, error: error.message }
    return { id: data.user.id, error: null }
  }

  // 1. Crear propietario
  const propietarioNombre    = formData.get('propietario_nombre') as string
  const propietarioApellido  = formData.get('propietario_apellido') as string
  const propietarioEmail     = formData.get('propietario_email') as string
  const propietarioDni       = formData.get('propietario_dni') as string
  const propietarioTelefono  = formData.get('propietario_telefono') as string

  let propietarioId: string

  const emailPropietario = propietarioEmail || `propietario-${crypto.randomUUID()}@placeholder.local`
  const { id: propId, error: propAuthError } = await findOrCreateUser(emailPropietario, {
    organizacion_id: perfil.organizacion_id,
    rol: 'propietario',
    nombre: propietarioNombre,
    apellido: propietarioApellido,
    telefono: propietarioTelefono || null,
  })
  if (propAuthError || !propId) return { error: `Error al crear propietario: ${propAuthError}` }
  propietarioId = propId

  // 2. Crear propiedad
  const { data: propiedadData, error: propError } = await db
    .from('propiedades')
    .insert({
      organizacion_id: perfil.organizacion_id,
      propietario_id:  propietarioId,
      tipo_propiedad:  formData.get('tipo_propiedad') as string,
      calle:           formData.get('calle') as string,
      numero:          formData.get('numero') as string,
      piso:            (formData.get('piso') as string) || null,
      depto:           (formData.get('depto') as string) || null,
      barrio:          (formData.get('barrio') as string) || null,
      ciudad:          formData.get('ciudad') as string,
      provincia:       (formData.get('provincia') as string) || 'Buenos Aires',
    })
    .select('id')
    .single()

  if (propError) return { error: `Error al crear propiedad: ${(propError as any).message}` }
  const propiedadId = (propiedadData as any).id

  // 3. Crear inquilinos (1 o 2)
  const inquilinosCount = parseInt(formData.get('inquilinos_count') as string) || 1
  const inquilinoIds: string[] = []

  for (let i = 0; i < Math.min(inquilinosCount, 2); i++) {
    const nombre   = formData.get(`inquilino_${i}_nombre`) as string
    const apellido = formData.get(`inquilino_${i}_apellido`) as string
    const email    = formData.get(`inquilino_${i}_email`) as string
    const telefono = (formData.get(`inquilino_${i}_telefono`) as string) || null
    const dni      = (formData.get(`inquilino_${i}_dni`) as string) || null

    let id: string
    if (email) {
      const { id: inqId, error: inqAuthError } = await findOrCreateUser(email, {
        organizacion_id: perfil.organizacion_id, rol: 'inquilino', nombre, apellido, telefono,
      })
      if (inqAuthError || !inqId) return { error: `Error al crear inquilino ${i + 1}: ${inqAuthError}` }
      id = inqId
      // Guardar DNI en el perfil si fue provisto
      if (dni) {
        await db.from('perfiles').update({ dni }).eq('id', id)
      }
    } else {
      const { data: perfilData, error: perfilError } = await db
        .from('perfiles')
        .insert({ id: crypto.randomUUID(), organizacion_id: perfil.organizacion_id, rol: 'inquilino', nombre, apellido, telefono, dni })
        .select('id').single()
      if (perfilError) return { error: `Error al crear perfil ${i + 1}: ${(perfilError as any).message}` }
      id = (perfilData as any).id
    }
    inquilinoIds.push(id)
  }

  const inquilinoId   = inquilinoIds[0]
  const coinquilinoId = inquilinoIds[1] ?? null

  // 4. Crear contrato
  const monto         = parseFloat(formData.get('monto_inicial') as string)
  const deposito      = formData.get('monto_deposito') as string
  const analisis      = formData.get('ia_analisis_resultado') as string
  const periodoMeses  = parseInt(formData.get('periodo_ajuste_meses') as string) || 3
  const fechaInicioStr = formData.get('fecha_inicio') as string
  const diaVencRaw    = parseInt(formData.get('dia_vencimiento_pago') as string)
  const diaVencPago   = Number.isFinite(diaVencRaw) && diaVencRaw >= 1 && diaVencRaw <= 31 ? diaVencRaw : null
  if (diaVencPago === null) return { error: 'Falta el día de vencimiento del pago mensual.' }

  const reqSeguroRaw  = formData.get('requiere_seguro_incendio') as string
  const reqSeguro     = reqSeguroRaw === 'si' ? true : reqSeguroRaw === 'no' ? false : null
  if (reqSeguro === null) return { error: 'Falta indicar si el contrato exige seguro de incendio.' }

  const modalidadRaw  = formData.get('modalidad_cobro') as string
  const modalidad     = (modalidadRaw === 'estricto' || modalidadRaw === 'flexible') ? modalidadRaw : null
  if (modalidad === null) return { error: 'Falta indicar la modalidad de cobro de multa.' }

  const tasaRaw       = parseFloat(formData.get('tasa_punitorio_mensual') as string)
  const tasaPunitorio = Number.isFinite(tasaRaw) && tasaRaw >= 0 && tasaRaw <= 100 ? tasaRaw : null

  const facturasRaw   = formData.get('facturas_servicios_las_carga') as string
  const facturasLasCarga = (facturasRaw === 'inquilino' || facturasRaw === 'propietario') ? facturasRaw : 'inquilino'

  // Calcular proxima_fecha_ajuste = fecha_inicio + periodo_ajuste_meses
  const fechaInicioDate = new Date(fechaInicioStr)
  fechaInicioDate.setMonth(fechaInicioDate.getMonth() + periodoMeses)
  const proximaFechaAjuste = fechaInicioDate.toISOString().slice(0, 10)

  const { data: contratoData, error: contratoError } = await db
    .from('contratos')
    .insert({
      organizacion_id:      perfil.organizacion_id,
      propiedad_id:         propiedadId,
      inquilino_id:         inquilinoId,
      coinquilino_id:       coinquilinoId,
      fecha_inicio:         fechaInicioStr,
      fecha_fin:            formData.get('fecha_fin') as string,
      monto_inicial:        monto,
      monto_actual:         monto,
      moneda:               (formData.get('moneda') as string) || 'ars',
      moneda_deposito:      (formData.get('moneda_deposito') as string) || 'ars',
      indice_ajuste:        formData.get('indice_ajuste') as 'ipc' | 'icl' | 'fijo',
      periodo_ajuste_meses: periodoMeses,
      dia_vencimiento_pago: diaVencPago,
      requiere_seguro_incendio: reqSeguro,
      modalidad_cobro:      modalidad,
      tasa_punitorio_mensual: tasaPunitorio,
      facturas_servicios_las_carga: facturasLasCarga,
      proxima_fecha_ajuste: proximaFechaAjuste,
      monto_deposito:       deposito ? parseFloat(deposito) : null,
      vencimiento_seguro_incendio: (formData.get('vencimiento_seguro_incendio') as string) || null,
      ia_analisis_resultado: analisis ? JSON.parse(analisis) : null,
      ia_confianza:          formData.get('ia_confianza') ? parseFloat(formData.get('ia_confianza') as string) : null,
      estado:               'activo',
    })
    .select('id')
    .single()

  if (contratoError) return { error: `Error al crear contrato: ${(contratoError as any).message}` }
  const contratoId = (contratoData as any).id

  // 5. Registrar documento y vincular el PDF ya subido
  const rutaArchivo = formData.get('ruta_archivo') as string
  await db.from('documentos').insert({
    organizacion_id: perfil.organizacion_id,
    contrato_id:     contratoId,
    tipo_documento:  'contrato',
    estado:          rutaArchivo ? 'subido' : 'pendiente',
    ruta_archivo:    rutaArchivo || null,
    verificado_por:  user.id,
  })

  // 6. Generar periodos_pago + pagos (concepto alquiler) por cada mes del contrato
  const fechaInicio = new Date(fechaInicioStr)
  const fechaFin    = new Date(formData.get('fecha_fin') as string)

  const periodos: object[] = []
  const pagosRows: object[] = []

  // Primer período: si el día de inicio es posterior al día de vencimiento configurado,
  // el primer pago es del mes siguiente (ese mes ya venció al firmar).
  const cursor = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1)
  if (fechaInicio.getDate() > diaVencPago) {
    cursor.setMonth(cursor.getMonth() + 1)
  }

  while (cursor <= fechaFin) {
    const anio = cursor.getFullYear()
    const mes  = cursor.getMonth() + 1

    // Vencimiento: dia_vencimiento_pago del mes del cursor
    const fechaVenc = new Date(anio, cursor.getMonth(), diaVencPago)
    // Si el día no existe en el mes (ej: 31 en abril), usar último día del mes
    if (fechaVenc.getMonth() !== cursor.getMonth()) {
      fechaVenc.setDate(0)
    }
    const fechaVencStr = fechaVenc.toISOString().slice(0, 10)

    const periodoId = crypto.randomUUID()
    periodos.push({
      id:               periodoId,
      organizacion_id:  perfil.organizacion_id,
      contrato_id:      contratoId,
      anio,
      mes,
      fecha_vencimiento: fechaVencStr,
      monto,
    })
    pagosRows.push({
      organizacion_id:   perfil.organizacion_id,
      periodo_pago_id:   periodoId,
      contrato_id:       contratoId,
      concepto:          'alquiler',
      estado:            'pendiente',
      monto_esperado:    monto,
      fecha_vencimiento: fechaVencStr,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  if (periodos.length > 0) {
    await db.from('periodos_pago').insert(periodos)
    await db.from('pagos').insert(pagosRows)
  }

  return { contratoId }
}
