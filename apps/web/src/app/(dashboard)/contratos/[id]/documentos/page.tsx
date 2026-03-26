import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PdfUpload } from './pdf-upload'
import { ChevronLeft } from 'lucide-react'
import type { Contrato, Documento } from '@alquileres/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentosPage({ params }: Props) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()

  const { data: contratoRaw } = await supabase
    .from('contratos')
    .select('id, estado, propiedad_id, organizacion_id')
    .eq('id', id)
    .single()

  if (!contratoRaw) notFound()
  const contrato = contratoRaw as unknown as Pick<Contrato, 'id' | 'estado' | 'propiedad_id' | 'organizacion_id'>

  // Buscar el documento tipo "contrato"
  const { data: documentoRaw } = await supabase
    .from('documentos')
    .select('id, estado, ruta_archivo')
    .eq('contrato_id', id)
    .eq('tipo_documento', 'contrato')
    .single()
  const documento = documentoRaw as unknown as Pick<Documento, 'id' | 'estado' | 'ruta_archivo'> | null

  // Si el contrato ya fue analizado, redirigir a análisis
  if (contrato.estado !== 'borrador' || documento?.estado === 'verificado') {
    redirect(`/contratos/${id}/analisis`)
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <Link
          href="/contratos"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Contratos
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Subir PDF del contrato</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Claude va a extraer automáticamente los datos del contrato.
          Después podrás revisar y confirmar la información.
        </p>
      </div>

      {documento ? (
        <PdfUpload
          contratoId={contrato.id}
          documentoId={documento.id}
          organizacionId={contrato.organizacion_id}
        />
      ) : (
        <p className="text-sm text-red-600">
          No se encontró el registro de documento. Intentá recargar la página.
        </p>
      )}
    </div>
  )
}
