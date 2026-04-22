import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { getNavItems } from '@/components/layout/nav-items'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, perfil } = await getSession()

  if (!user) redirect('/login')

  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Cargando perfil...</p>
      </div>
    )
  }

  const navItems = getNavItems(perfil.rol)

  return (
    <DashboardShell perfil={perfil} navItems={navItems}>
      {children}
    </DashboardShell>
  )
}
