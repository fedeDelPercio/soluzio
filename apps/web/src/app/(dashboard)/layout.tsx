import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/sidebar'
import { getNavItems } from '@/components/layout/nav-items'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, perfil } = await getSession()

  if (!user) redirect('/login')

  // Si el usuario existe pero no tiene perfil aún (ej: trigger tardó), mostrar pantalla de espera
  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Cargando perfil...</p>
      </div>
    )
  }

  const navItems = getNavItems(perfil.rol)

  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil} navItems={navItems} />
      <main className="flex-1 bg-zinc-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
