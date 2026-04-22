import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Camera, Info } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatFecha } from '@/lib/utils'
import { UploadFotoEstadoInicial } from './upload-foto'
import { FotoCard } from './foto-card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EstadoInicialPage({ params }: Props) {
  const { id: contratoId } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const supabase = await createClient()
  const db       = supabase as any

  const { data: contrato } = await db
    .from('contratos')
    .select(`
      id, organizacion_id, inquilino_id, coinquilino_id,
      propiedades ( calle, numero, piso, depto, ciudad )
    `)
    .eq('id', contratoId)
    .single()

  if (!contrato) notFound()

  const esInquilinoDelContrato = contrato.inquilino_id === user.id || contrato.coinquilino_id === user.id
  const esAdmin                = perfil.rol === 'administrador'
  const esPropietario          = perfil.rol === 'propietario'

  if (!esInquilinoDelContrato && !esAdmin && !esPropietario) {
    redirect(`/contratos/${contratoId}`)
  }

  const { data: fotosRaw } = await db
    .from('estado_inicial_fotos')
    .select('id, ruta_archivo, descripcion, feedback_admin, subido_por, creado_en')
    .eq('contrato_id', contratoId)
    .order('creado_en', { ascending: false })

  const fotos = (fotosRaw ?? []) as Array<{
    id: string
    ruta_archivo: string
    descripcion: string | null
    feedback_admin: string | null
    subido_por: string
    creado_en: string
  }>

  // Generar URLs firmadas
  const admin = createAdminClient()
  const rutas = fotos.map((f) => f.ruta_archivo)
  let signedMap: Record<string, string> = {}
  if (rutas.length > 0) {
    const { data: signed } = await (admin.storage.from('estado-inicial') as any)
      .createSignedUrls(rutas, 3600)
    ;(signed ?? []).forEach((s: { path: string; signedUrl: string }) => {
      if (s.signedUrl) signedMap[s.path] = s.signedUrl
    })
  }

  const prop   = contrato.propiedades
  const titulo = [prop?.calle, prop?.numero, prop?.piso && `Piso ${prop.piso}`, prop?.depto]
    .filter(Boolean).join(' ')

  const puedeSubir = esInquilinoDelContrato && fotos.length < 30

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <Link href={`/contratos/${contratoId}`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> {titulo || 'Contrato'}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 mt-1 flex items-center gap-2">
          <Camera className="w-5 h-5 text-zinc-400" /> Estado inicial de la vivienda
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {esInquilinoDelContrato
            ? 'Subí fotos de cómo recibís la vivienda. Te sirve de respaldo al momento de desocuparla.'
            : 'Fotos que subió el inquilino documentando el estado inicial de la vivienda.'}
        </p>
      </div>

      {fotos.length === 0 && !esInquilinoDelContrato && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center text-sm text-zinc-500">
          Todavía no se subieron fotos del estado inicial.
        </div>
      )}

      {esInquilinoDelContrato && (
        <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Podés subir hasta 30 fotos ({fotos.length}/30). Usá la descripción para indicar algo puntual (ej: "azulejo roto en el baño").
          </p>
        </div>
      )}

      {esInquilinoDelContrato && <UploadFotoEstadoInicial contratoId={contratoId} organizacionId={contrato.organizacion_id} disabled={!puedeSubir} />}

      {fotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fotos.map((foto) => {
            const url = signedMap[foto.ruta_archivo]
            if (!url) return null
            return (
              <FotoCard
                key={foto.id}
                foto={{
                  id: foto.id,
                  ruta_archivo: foto.ruta_archivo,
                  descripcion: foto.descripcion,
                  feedback_admin: foto.feedback_admin,
                  url,
                }}
                esDueño={foto.subido_por === user.id}
                esAdmin={esAdmin}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
