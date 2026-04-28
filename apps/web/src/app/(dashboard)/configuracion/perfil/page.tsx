import { redirect } from 'next/navigation'
import { User, Mail, Phone, IdCard, Building2 } from 'lucide-react'
import { getSession } from '@/lib/auth/session'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  propietario:   'Propietario',
  inquilino:     'Inquilino',
  inmobiliario:  'Inmobiliario',
}

export default async function MiPerfilPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const filas: Array<{ label: string; valor: string | null; icon: React.ElementType }> = [
    { label: 'Nombre completo', valor: `${perfil.nombre} ${perfil.apellido}`, icon: User },
    { label: 'Email',           valor: user.email ?? null,                    icon: Mail },
    { label: 'DNI',             valor: perfil.dni,                            icon: IdCard },
    { label: 'Teléfono',        valor: perfil.telefono,                       icon: Phone },
    { label: 'Rol',             valor: ROL_LABEL[perfil.rol] ?? perfil.rol,   icon: Building2 },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Mi perfil</h1>
        <p className="text-sm text-zinc-500 mt-1">Datos personales y de la cuenta.</p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        {filas.map(({ label, valor, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <p className="text-xs text-zinc-500 w-32 flex-shrink-0">{label}</p>
            <p className="text-sm text-zinc-900 truncate">
              {valor || <span className="text-zinc-400 italic">No cargado</span>}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        Para cambiar tu contraseña o algún dato personal, contactá al administrador.
      </p>
    </div>
  )
}
