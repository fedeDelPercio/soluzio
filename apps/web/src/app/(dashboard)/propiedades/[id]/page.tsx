import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Building2, FileText, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import type { Propiedad } from '@alquileres/database'

type ContratoItem = {
  id: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  monto_actual: number
  inquilino_id: string | null
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function PropiedadPage({ params }: Props) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()

  const { data: propiedadRaw } = await (supabase as any)
    .from('propiedades')
    .select('*')
    .eq('id', id)
    .single()

  if (!propiedadRaw) notFound()
  const propiedad = propiedadRaw as unknown as Propiedad

  const { data: contratosRaw } = await (supabase as any)
    .from('contratos')
    .select('id, estado, fecha_inicio, fecha_fin, monto_actual, inquilino_id')
    .eq('propiedad_id', id)
    .order('creado_en', { ascending: false })
  const contratos = (contratosRaw ?? []) as ContratoItem[]

  const esAdmin = perfil.rol === 'administrador'

  const direccion = [
    propiedad.calle, propiedad.numero,
    propiedad.piso && `Piso ${propiedad.piso}`,
    propiedad.depto,
  ].filter(Boolean).join(' ')

  const ESTADO_LABEL: Record<string, string> = {
    borrador: 'Borrador', activo: 'Activo', por_vencer: 'Por vencer',
    vencido: 'Vencido', rescindido: 'Rescindido',
  }
  const ESTADO_COLOR: Record<string, string> = {
    borrador: 'bg-zinc-100 text-zinc-600',
    activo: 'bg-green-100 text-green-700',
    por_vencer: 'bg-amber-100 text-amber-700',
    vencido: 'bg-red-100 text-red-600',
    rescindido: 'bg-zinc-100 text-zinc-500',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-zinc-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{direccion}</h1>
            <p className="text-sm text-zinc-500">
              {[propiedad.barrio, propiedad.ciudad, propiedad.provincia].filter(Boolean).join(', ')}
              {' · '}
              <span className="capitalize">{propiedad.tipo_propiedad}</span>
            </p>
          </div>
        </div>
        {esAdmin && (
          <Link href={`/contratos/nuevo?propiedad_id=${propiedad.id}`} className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-1" />
            Nuevo contrato
          </Link>
        )}
      </div>

      {/* Contratos */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-700">Contratos</h2>
        </div>

        {!contratos || contratos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">Sin contratos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {contratos.map((c) => (
              <Link
                key={c.id}
                href={`/contratos/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm text-zinc-900">
                    {c.fecha_inicio} → {c.fecha_fin}
                  </p>
                  <p className="text-xs text-zinc-500">
                    ${c.monto_actual.toLocaleString('es-AR')} / mes
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[c.estado]}`}>
                  {ESTADO_LABEL[c.estado]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
