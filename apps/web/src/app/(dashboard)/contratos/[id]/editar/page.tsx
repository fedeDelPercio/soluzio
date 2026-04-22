import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { editarContratoAction } from './actions'

const SELECT_CLASS = 'flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarContratoPage({ params }: Props) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (perfil.rol !== 'administrador') redirect(`/contratos/${id}`)

  const supabase = await createClient()
  const db       = supabase as any
  const { data: contrato } = await db
    .from('contratos')
    .select(`
      id, estado, fecha_inicio, fecha_fin, monto_inicial, monto_actual,
      monto_deposito, indice_ajuste, periodo_ajuste_meses,
      dia_vencimiento_pago,
      requiere_seguro_incendio, modalidad_cobro, tasa_punitorio_mensual,
      facturas_servicios_las_carga, servicios_aplicables,
      vencimiento_seguro_incendio,
      propiedad_id,
      propiedades ( calle, numero, piso, depto, ciudad, inmobiliario_id )
    `)
    .eq('id', id)
    .single()

  if (!contrato) notFound()

  const { data: inmobiliariosRaw } = await db
    .from('perfiles')
    .select('id, nombre, apellido')
    .eq('rol', 'inmobiliario')
    .order('apellido')
  const inmobiliarios = (inmobiliariosRaw ?? []) as { id: string; nombre: string; apellido: string }[]

  const prop = contrato.propiedades
  const titulo = [prop?.calle, prop?.numero, prop?.piso && `Piso ${prop.piso}`, prop?.depto]
    .filter(Boolean).join(' ')

  const action = editarContratoAction.bind(null, id)

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <Link href={`/contratos/${id}`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← {titulo}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 mt-1">Editar contrato</h1>
        <p className="text-sm text-zinc-500">{prop?.ciudad}</p>
      </div>

      <form action={action} className="space-y-6">

        {/* Fechas */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800">Período</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fecha de inicio <span className="text-zinc-400">(no editable)</span></Label>
              <Input value={contrato.fecha_inicio} disabled className="h-8 text-sm bg-zinc-50 text-zinc-400" readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha de fin</Label>
              <Input
                name="fecha_fin"
                type="date"
                required
                defaultValue={contrato.fecha_fin}
                className="h-8 text-sm bg-white"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Montos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800">Montos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Monto inicial <span className="text-zinc-400">(no editable)</span></Label>
              <Input value={`$ ${contrato.monto_inicial.toLocaleString('es-AR')}`} disabled className="h-8 text-sm bg-zinc-50 text-zinc-400" readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monto actual</Label>
              <Input
                name="monto_actual"
                type="number"
                required
                min="0"
                step="0.01"
                defaultValue={contrato.monto_actual}
                className="h-8 text-sm bg-white"
              />
            </div>
          </div>
          <div className="space-y-1 max-w-[50%] pr-1.5">
            <Label className="text-xs">Depósito <span className="text-zinc-400">(opc.)</span></Label>
            <Input
              name="monto_deposito"
              type="number"
              min="0"
              step="0.01"
              defaultValue={contrato.monto_deposito ?? ''}
              className="h-8 text-sm bg-white"
            />
          </div>
        </div>

        <Separator />

        {/* Ajuste */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800">Condiciones de ajuste</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Índice de ajuste</Label>
              <select name="indice_ajuste" defaultValue={contrato.indice_ajuste} className={SELECT_CLASS}>
                <option value="icl">ICL (BCRA)</option>
                <option value="ipc">IPC (INDEC)</option>
                <option value="fijo">Fijo</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Período de ajuste</Label>
              <select name="periodo_ajuste_meses" defaultValue={String(contrato.periodo_ajuste_meses)} className={SELECT_CLASS}>
                <option value="1">Mensual</option>
                <option value="3">Trimestral</option>
                <option value="4">Cuatrimestral</option>
                <option value="6">Semestral</option>
                <option value="12">Anual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Día de vencimiento del pago mensual</Label>
              <Input
                name="dia_vencimiento_pago"
                type="number"
                min="1"
                max="31"
                required
                defaultValue={contrato.dia_vencimiento_pago ?? ''}
                placeholder="ej: 10"
                className="h-8 text-sm bg-white"
              />
              <p className="text-[11px] text-zinc-400">
                Al cambiar este valor se recalculan las fechas de los pagos aún no abonados.
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Requiere seguro de incendio</Label>
              <select
                name="requiere_seguro_incendio"
                required
                defaultValue={contrato.requiere_seguro_incendio === true ? 'si' : contrato.requiere_seguro_incendio === false ? 'no' : ''}
                className={SELECT_CLASS}
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Cobro de multa */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800">Cobro de multa por mora</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Modalidad de cobro</Label>
              <select
                name="modalidad_cobro"
                required
                defaultValue={contrato.modalidad_cobro ?? ''}
                className={SELECT_CLASS}
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="estricto">Estricto (cobrar multa)</option>
                <option value="flexible">Flexible (no cobrar multa)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tasa punitoria mensual (%)</Label>
              <Input
                name="tasa_punitorio_mensual"
                type="number"
                min="0"
                max="100"
                step="0.1"
                defaultValue={contrato.tasa_punitorio_mensual ?? ''}
                placeholder="ej: 5"
                className="h-8 text-sm bg-white"
              />
              <p className="text-[11px] text-zinc-400">Solo se usa si la modalidad es estricta.</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Servicios */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800">Servicios (luz, gas, agua, etc.)</h2>
          <div className="space-y-1 max-w-[50%]">
            <Label className="text-xs">¿Quién carga las facturas?</Label>
            <select
              name="facturas_servicios_las_carga"
              required
              defaultValue={contrato.facturas_servicios_las_carga ?? 'inquilino'}
              className={SELECT_CLASS}
            >
              <option value="inquilino">Inquilino</option>
              <option value="propietario">Propietario</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Servicios aplicables al contrato</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 bg-white border border-zinc-200 rounded-lg px-3 py-2.5">
              {[
                { value: 'electricidad',              label: 'Electricidad' },
                { value: 'gas',                       label: 'Gas' },
                { value: 'agua',                      label: 'Agua' },
                { value: 'expensas_ordinarias',       label: 'Expensas ord.' },
                { value: 'expensas_extraordinarias',  label: 'Expensas extra.' },
                { value: 'municipal',                 label: 'ABL / Municipal' },
                { value: 'otro',                      label: 'Otro' },
              ].map((s) => (
                <label key={s.value} className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="servicios_aplicables"
                    value={s.value}
                    defaultChecked={(contrato.servicios_aplicables ?? []).includes(s.value)}
                    className="w-3.5 h-3.5 accent-zinc-900 cursor-pointer"
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400">Al marcar un servicio nuevo se generan pagos desde este mes en adelante. Al desmarcarlo, se borran los pagos futuros pendientes (los ya cargados se conservan).</p>
          </div>
        </div>

        <Separator />

        {/* Inmobiliario */}
        {inmobiliarios.length > 0 && (
          <>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-800">Inmobiliario</h2>
              <div className="space-y-1">
                <Label className="text-xs">Agente externo que cedió la propiedad <span className="text-zinc-400">(opc.)</span></Label>
                <select
                  name="inmobiliario_id"
                  defaultValue={(contrato.propiedades as any)?.inmobiliario_id ?? ''}
                  className={SELECT_CLASS}
                >
                  <option value="">Sin inmobiliario asignado</option>
                  {inmobiliarios.map((i) => (
                    <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400">Podrá ver los datos del contrato en modo solo lectura.</p>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Seguro */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-800">Seguro de incendio</h2>
          <div className="space-y-1 max-w-[50%]">
            <Label className="text-xs">Vencimiento <span className="text-zinc-400">(opc.)</span></Label>
            <Input
              name="vencimiento_seguro_incendio"
              type="date"
              defaultValue={contrato.vencimiento_seguro_incendio ?? ''}
              className="h-8 text-sm bg-white"
            />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Link href={`/contratos/${id}`}>
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  )
}
