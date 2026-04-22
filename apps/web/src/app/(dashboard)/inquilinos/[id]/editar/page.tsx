import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { editarInquilinoAction } from '../../actions'

export default async function EditarInquilinoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()
  const { data: inq } = await (supabase as any)
    .from('perfiles')
    .select('id, nombre, apellido, dni, telefono')
    .eq('id', id)
    .eq('rol', 'inquilino')
    .eq('organizacion_id', perfil.organizacion_id)
    .single()

  if (!inq) notFound()

  // Obtener email desde auth.users
  const admin = createAdminClient()
  const { data: { user: authUser } } = await admin.auth.admin.getUserById(id)
  const emailActual = authUser?.email ?? ''

  const action = editarInquilinoAction.bind(null, id)

  return (
    <div className="p-4 sm:p-6 max-w-md space-y-6">
      <div>
        <Link href={`/inquilinos/${id}`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← {inq.nombre} {inq.apellido}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 mt-1">Editar inquilino</h1>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input name="nombre" required defaultValue={inq.nombre} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Apellido</Label>
            <Input name="apellido" required defaultValue={inq.apellido} className="h-9 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input name="email" type="email" defaultValue={emailActual} className="h-9 text-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">DNI <span className="text-zinc-400">(opc.)</span></Label>
            <Input name="dni" defaultValue={inq.dni ?? ''} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Teléfono <span className="text-zinc-400">(opc.)</span></Label>
            <Input name="telefono" defaultValue={inq.telefono ?? ''} className="h-9 text-sm" />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Link href={`/inquilinos/${id}`}>
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  )
}
