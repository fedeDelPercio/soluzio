import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { ContratoWizard } from './contrato-wizard'

export default async function NuevoContratoPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil || perfil.rol !== 'administrador') redirect('/overview')

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Nuevo contrato</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Subí el PDF del contrato y Claude va a extraer todos los datos automáticamente.
        </p>
      </div>

      <ContratoWizard organizacionId={perfil.organizacion_id} />
    </div>
  )
}
