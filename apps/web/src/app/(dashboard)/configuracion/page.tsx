import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Bell, Settings } from 'lucide-react'
import { getSession } from '@/lib/auth/session'

interface ConfigCardProps {
  href:        string
  icon:        React.ElementType
  titulo:      string
  descripcion: string
}

function ConfigCard({ href, icon: Icon, titulo, descripcion }: ConfigCardProps) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-zinc-200 p-4 space-y-2 hover:border-zinc-300 transition-colors block"
    >
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-zinc-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-900">{titulo}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{descripcion}</p>
      </div>
    </Link>
  )
}

export default async function ConfiguracionHubPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const esAdmin = perfil.rol === 'administrador'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-700" />
          <h1 className="text-xl font-semibold text-zinc-900">Configuración</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">Ajustes de tu cuenta y de la organización.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ConfigCard
          href="/configuracion/perfil"
          icon={User}
          titulo="Mi perfil"
          descripcion="Datos personales y notificaciones de tu cuenta."
        />
        {esAdmin && (
          <ConfigCard
            href="/configuracion/notificaciones"
            icon={Bell}
            titulo="Notificaciones"
            descripcion="Activá o desactivá avisos automáticos por email."
          />
        )}
      </div>
    </div>
  )
}
