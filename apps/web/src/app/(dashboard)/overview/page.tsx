import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { PropietarioDashboard } from '@/components/dashboards/propietario-dashboard'
import { InquilinoDashboard } from '@/components/dashboards/inquilino-dashboard'
import { InmobiliarioDashboard } from '@/components/dashboards/inmobiliario-dashboard'

export default async function OverviewPage() {
  const { user, perfil } = await getSession()

  if (!user || !perfil) redirect('/login')

  switch (perfil.rol) {
    case 'administrador':
      return <AdminDashboard perfil={perfil} />
    case 'propietario':
      return <PropietarioDashboard perfil={perfil} />
    case 'inquilino':
      return <InquilinoDashboard perfil={perfil} />
    case 'inmobiliario':
      return <InmobiliarioDashboard perfil={perfil} />
  }
}
