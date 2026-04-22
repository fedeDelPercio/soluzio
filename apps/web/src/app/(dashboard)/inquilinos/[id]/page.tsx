import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatARS, formatFecha } from '@/lib/utils'
import { Phone, Mail, CreditCard, FileText, ChevronRight, User } from 'lucide-react'
import { InquilinoActionsMenu } from '../inquilino-actions-menu'

const ESTADO_CONTRATO_COLOR: Record<string, string> = {
  activo:     'bg-green-100 text-green-700',
  borrador:   'bg-zinc-100 text-zinc-600',
  por_vencer: 'bg-amber-100 text-amber-700',
  vencido:    'bg-red-100 text-red-600',
  rescindido: 'bg-zinc-100 text-zinc-500',
}
const ESTADO_PAGO_COLOR: Record<string, string> = {
  pendiente:          'text-zinc-500',
  comprobante_subido: 'text-blue-600',
  verificado:         'text-green-600',
  atrasado:           'text-red-600',
}
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function InquilinoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()
  const db = supabase as any

  const { data: inq } = await db
    .from('perfiles')
    .select('id, nombre, apellido, dni, telefono, rol')
    .eq('id', id)
    .eq('rol', 'inquilino')
    .eq('organizacion_id', perfil.organizacion_id)
    .single()

  if (!inq) notFound()

  // Email desde auth.users (service role)
  const adminClient = createAdminClient()
  const { data: authUser } = await adminClient.auth.admin.getUserById(id)
  const email = authUser?.user?.email ?? null

  // Contratos del inquilino (como titular o coinquilino)
  const [{ data: comoInquilino }, { data: comoCoinquilino }] = await Promise.all([
    db.from('contratos')
      .select('id, estado, fecha_inicio, fecha_fin, monto_actual, indice_ajuste, propiedades ( calle, numero, piso, depto, ciudad )')
      .eq('inquilino_id', id)
      .eq('organizacion_id', perfil.organizacion_id)
      .order('fecha_inicio', { ascending: false }),
    db.from('contratos')
      .select('id, estado, fecha_inicio, fecha_fin, monto_actual, indice_ajuste, propiedades ( calle, numero, piso, depto, ciudad )')
      .eq('coinquilino_id', id)
      .eq('organizacion_id', perfil.organizacion_id)
      .order('fecha_inicio', { ascending: false }),
  ])

  const contratos = [
    ...(comoInquilino ?? []),
    ...(comoCoinquilino ?? []),
  ].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)) as any[]
  const tieneContratoActivo = contratos.some((c) => c.estado === 'activo')

  // Pagos recientes (últimos 6 meses) de todos sus contratos
  const finDeMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const contratoIds = contratos.map((c) => c.id)
  const { data: pagosRaw } = contratoIds.length > 0
    ? await db
        .from('pagos')
        .select('id, estado, monto_esperado, fecha_vencimiento, contrato_id, periodos_pago ( anio, mes )')
        .in('contrato_id', contratoIds)
        .lte('fecha_vencimiento', finDeMes)
        .order('fecha_vencimiento', { ascending: false })
        .limit(12)
    : { data: [] }

  const pagos = (pagosRaw ?? []) as any[]

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/inquilinos" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
            ← Inquilinos
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 mt-1">
            {inq.nombre} {inq.apellido}
          </h1>
        </div>
        <InquilinoActionsMenu inquilinoId={id} tieneContratoActivo={tieneContratoActivo} />
      </div>

      {/* Datos personales */}
      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <User className="w-3 h-3" /> Nombre completo
          </p>
          <p className="text-sm text-zinc-900">{inq.nombre} {inq.apellido}</p>
        </div>
        {inq.dni && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500">DNI</p>
            <p className="text-sm text-zinc-900">{inq.dni}</p>
          </div>
        )}
        {email && (
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-500 flex items-center gap-1.5 flex-shrink-0">
              <Mail className="w-3 h-3" /> Email
            </p>
            <p className="text-sm text-zinc-900 truncate">{email}</p>
          </div>
        )}
        {inq.telefono && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Teléfono
            </p>
            <p className="text-sm text-zinc-900">{inq.telefono}</p>
          </div>
        )}
        {!inq.dni && !email && !inq.telefono && (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-zinc-400">Sin datos adicionales registrados.</p>
          </div>
        )}
      </div>

      {/* Contratos */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" /> Contratos
        </h2>
        {contratos.length === 0 ? (
          <p className="text-xs text-zinc-400 bg-white border border-zinc-200 rounded-lg px-4 py-6 text-center">
            Sin contratos registrados.
          </p>
        ) : (
          <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
            {contratos.map((c) => {
              const prop = c.propiedades
              const dir = [prop?.calle, prop?.numero, prop?.piso && `Piso ${prop.piso}`, prop?.depto]
                .filter(Boolean).join(' ')
              return (
                <Link
                  key={c.id}
                  href={`/contratos/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900 truncate">{dir}</p>
                    <p className="text-xs text-zinc-400">{prop?.ciudad} · {formatARS(c.monto_actual)}/mes</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_CONTRATO_COLOR[c.estado]}`}>
                      {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagos recientes */}
      {pagos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-400" /> Pagos recientes
          </h2>
          <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
            {pagos.map((pago) => {
              const periodo = pago.periodos_pago
              const label = periodo
                ? `${MESES[(periodo.mes ?? 1) - 1]} ${periodo.anio}`
                : formatFecha(pago.fecha_vencimiento)
              return (
                <div key={pago.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <p className="text-sm text-zinc-900">{label}</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-medium text-zinc-700">{formatARS(pago.monto_esperado)}</p>
                    <span className={`text-xs font-medium ${ESTADO_PAGO_COLOR[pago.estado] ?? 'text-zinc-500'}`}>
                      {pago.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
