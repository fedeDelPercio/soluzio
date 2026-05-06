import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Bell, Info } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import {
  EVENTOS_NOTIFICACION_CRITICOS,
  EVENTOS_NOTIFICACION_META,
  GRUPO_LABEL,
  ROL_LABEL,
  type GrupoNotificacion,
} from '@alquileres/shared'
import { NotificacionToggle } from './notificacion-toggle'

export default async function NotificacionesConfigPage() {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')
  if (perfil.rol !== 'administrador') redirect('/overview')

  const supabase = await createClient()
  const db = supabase as any

  const { data: configRows } = await db
    .from('notificaciones_config')
    .select('evento, habilitado')
    .eq('organizacion_id', perfil.organizacion_id)

  const configMap = new Map<string, boolean>()
  for (const row of (configRows ?? []) as { evento: string; habilitado: boolean }[]) {
    configMap.set(row.evento, row.habilitado)
  }

  // Agrupar eventos críticos por dominio
  const porGrupo = new Map<GrupoNotificacion, typeof EVENTOS_NOTIFICACION_CRITICOS[number][]>()
  for (const evento of EVENTOS_NOTIFICACION_CRITICOS) {
    const meta = EVENTOS_NOTIFICACION_META[evento]
    if (!meta) continue
    if (!porGrupo.has(meta.grupo)) porGrupo.set(meta.grupo, [])
    porGrupo.get(meta.grupo)!.push(evento)
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link href="/configuracion" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> Configuración
        </Link>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-zinc-700" />
          <h1 className="text-xl font-semibold text-zinc-900">Notificaciones</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Activá o desactivá los avisos automáticos por email para tu organización.
        </p>
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
        <p>
          Los cambios se aplican de inmediato a la organización. El siguiente disparo del cron diario o evento puntual
          tendrá en cuenta esta configuración.
        </p>
      </div>

      <div className="space-y-6">
        {[...porGrupo.entries()].map(([grupo, eventos]) => (
          <section key={grupo} className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <header className="px-4 py-3 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-800">{GRUPO_LABEL[grupo]}</h2>
            </header>
            <ul className="divide-y divide-zinc-100">
              {eventos.map((evento) => {
                const meta       = EVENTOS_NOTIFICACION_META[evento]!
                const habilitado = configMap.get(evento) ?? true
                const destinatariosLabel = meta.destinatarios.map((r) => ROL_LABEL[r]).join(' · ')
                return (
                  <li key={evento} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-zinc-900">{meta.label}</p>
                        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          meta.trigger === 'cron' ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {meta.trigger === 'cron' ? 'Diario' : 'Inmediato'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-1">{meta.descripcion}</p>
                      <p className="text-xs text-zinc-400">A: {destinatariosLabel}</p>
                    </div>
                    <NotificacionToggle evento={evento} initial={habilitado} />
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
