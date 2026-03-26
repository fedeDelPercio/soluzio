'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import type { TablesUpdate } from '@alquileres/database'

export async function confirmarContratoAction(formData: FormData) {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') {
    return { error: 'No autorizado' }
  }

  const supabase  = await createClient()
  const contratoId = formData.get('contrato_id') as string

  const monto = parseFloat(formData.get('monto_inicial') as string)

  const updateContrato: TablesUpdate<'contratos'> = {
    fecha_inicio:               formData.get('fecha_inicio') as string,
    fecha_fin:                  formData.get('fecha_fin') as string,
    monto_inicial:              monto,
    monto_actual:               monto,
    monto_deposito:             formData.get('monto_deposito') ? parseFloat(formData.get('monto_deposito') as string) : null,
    indice_ajuste:              formData.get('indice_ajuste') as 'ipc' | 'icl' | 'fijo',
    periodo_ajuste_meses:       parseInt(formData.get('periodo_ajuste_meses') as string) || 3,
    vencimiento_seguro_incendio: (formData.get('vencimiento_seguro_incendio') as string) || null,
    estado:                     'activo',
  }

  const db = supabase as any

  const { error } = await db
    .from('contratos')
    .update(updateContrato)
    .eq('id', contratoId)

  if (error) return { error: (error as any).message }

  const updateDoc: TablesUpdate<'documentos'> = { estado: 'verificado', verificado_por: user.id }
  await db
    .from('documentos')
    .update(updateDoc)
    .eq('contrato_id', contratoId)
    .eq('tipo_documento', 'contrato')

  redirect(`/contratos/${contratoId}`)
}
