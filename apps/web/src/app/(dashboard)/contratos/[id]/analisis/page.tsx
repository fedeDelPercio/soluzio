import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { AnalisisPanel } from './analisis-panel'
import { ChevronLeft } from 'lucide-react'
import type { Contrato } from '@alquileres/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalisisPage({ params }: Props) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()

  const { data: contratoRaw } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', id)
    .single()

  if (!contratoRaw) notFound()
  const contrato = contratoRaw as unknown as Contrato

  // Si no tiene análisis de IA, redirigir a documentos
  if (!contrato.ia_analisis_resultado) {
    redirect(`/contratos/${id}/documentos`)
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/contratos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Contrato
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Análisis del contrato</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Revisá los datos que extrajo Claude y confirmá para activar el contrato.
        </p>
      </div>

      <AnalisisPanel contrato={contrato} />
    </div>
  )
}
