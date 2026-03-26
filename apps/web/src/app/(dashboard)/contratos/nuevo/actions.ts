'use server'

import { redirect } from 'next/navigation'
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

  // 1. Crear propietario
  const propietarioNombre    = formData.get('propietario_nombre') as string
  const propietarioApellido  = formData.get('propietario_apellido') as string
  const propietarioEmail     = formData.get('propietario_email') as string
  const propietarioDni       = formData.get('propietario_dni') as string
  const propietarioTelefono  = formData.get('propietario_telefono') as string

  let propietarioId: string

  const emailPropietario = propietarioEmail || `propietario-${crypto.randomUUID()}@placeholder.local`
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: emailPropietario,
    email_confirm: true,
    user_metadata: {
      organizacion_id: perfil.organizacion_id,
      rol: 'propietario',
      nombre: propietarioNombre,
      apellido: propietarioApellido,
      telefono: propietarioTelefono || null,
    },
  })
  if (authError) return { error: `Error al crear propietario: ${authError.message}` }
  propietarioId = authData.user.id

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

    let id: string
    if (email) {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { organizacion_id: perfil.organizacion_id, rol: 'inquilino', nombre, apellido },
      })
      if (authError) return { error: `Error al crear inquilino ${i + 1}: ${authError.message}` }
      id = authData.user.id
    } else {
      const { data: perfilData, error: perfilError } = await db
        .from('perfiles')
        .insert({ id: crypto.randomUUID(), organizacion_id: perfil.organizacion_id, rol: 'inquilino', nombre, apellido })
        .select('id').single()
      if (perfilError) return { error: `Error al crear perfil ${i + 1}: ${(perfilError as any).message}` }
      id = (perfilData as any).id
    }
    inquilinoIds.push(id)
  }

  const inquilinoId   = inquilinoIds[0]
  const coinquilinoId = inquilinoIds[1] ?? null

  // 4. Crear contrato
  const monto    = parseFloat(formData.get('monto_inicial') as string)
  const deposito = formData.get('monto_deposito') as string
  const analisis = formData.get('ia_analisis_resultado') as string

  const { data: contratoData, error: contratoError } = await db
    .from('contratos')
    .insert({
      organizacion_id:      perfil.organizacion_id,
      propiedad_id:         propiedadId,
      inquilino_id:         inquilinoId,
      coinquilino_id:       coinquilinoId,
      fecha_inicio:         formData.get('fecha_inicio') as string,
      fecha_fin:            formData.get('fecha_fin') as string,
      monto_inicial:        monto,
      monto_actual:         monto,
      moneda:               (formData.get('moneda') as string) || 'ars',
      moneda_deposito:      (formData.get('moneda_deposito') as string) || 'ars',
      indice_ajuste:        formData.get('indice_ajuste') as 'ipc' | 'icl' | 'fijo',
      periodo_ajuste_meses: parseInt(formData.get('periodo_ajuste_meses') as string) || 3,
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
  const fechaInicio = new Date(formData.get('fecha_inicio') as string)
  const fechaFin    = new Date(formData.get('fecha_fin') as string)

  const periodos: object[] = []
  const pagosRows: object[] = []

  const cursor = new Date(fechaInicio)
  cursor.setDate(1) // Primer día del mes de inicio

  while (cursor <= fechaFin) {
    const anio = cursor.getFullYear()
    const mes  = cursor.getMonth() + 1

    // Vencimiento: mismo día del mes que fecha_inicio, en el mes del cursor
    const diaVenc = fechaInicio.getDate()
    const fechaVenc = new Date(anio, cursor.getMonth(), diaVenc)
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

  redirect(`/contratos/${contratoId}`)
}
