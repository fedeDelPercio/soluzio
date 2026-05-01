import { createClient } from '@/lib/supabase/server'
import { formatARS, formatFecha } from '@/lib/utils'
import { History, TrendingUp } from 'lucide-react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface PeriodoUsado {
  anio:       number
  mes:        number
  valor_tasa: number
}

interface CalculoAjuste {
  id:                  string
  monto_anterior:      number
  monto_nuevo:         number
  tasa_acumulada:      number
  variacion_porcentual:number
  periodos_usados:     PeriodoUsado[] | null
  creado_en:           string
  aplicado_por_perfil: { nombre: string; apellido: string } | null
}

export async function HistoricoAjustes({ contratoId }: { contratoId: string }) {
  const supabase = await createClient()
  const db = supabase as any

  const { data } = await db
    .from('calculos_ajuste')
    .select(`
      id, monto_anterior, monto_nuevo, tasa_acumulada, variacion_porcentual,
      periodos_usados, creado_en,
      aplicado_por_perfil:perfiles!calculos_ajuste_aplicado_por_fkey ( nombre, apellido )
    `)
    .eq('contrato_id', contratoId)
    .order('creado_en', { ascending: false })

  const ajustes = (data ?? []) as CalculoAjuste[]
  if (ajustes.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
        <History className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-medium text-zinc-700">Historial de ajustes</h2>
        <span className="text-xs text-zinc-400">{ajustes.length} aplicado{ajustes.length === 1 ? '' : 's'}</span>
      </div>

      <div className="divide-y divide-zinc-100">
        {ajustes.map((a) => {
          const periodos = a.periodos_usados ?? []
          const variacion = a.variacion_porcentual

          return (
            <div key={a.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-900">
                    <span className="font-medium">{formatARS(a.monto_anterior)}</span>
                    <span className="text-zinc-400 mx-1.5">→</span>
                    <span className="font-semibold">{formatARS(a.monto_nuevo)}</span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatFecha(a.creado_en.slice(0, 10))}
                    {a.aplicado_por_perfil && (
                      <> · por {a.aplicado_por_perfil.nombre} {a.aplicado_por_perfil.apellido}</>
                    )}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 flex-shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{(variacion * 100).toFixed(2)}%
                </span>
              </div>

              {periodos.length > 0 && (
                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-700 select-none">
                    Ver tasas usadas ({periodos.length} {periodos.length === 1 ? 'mes' : 'meses'})
                  </summary>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {periodos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-zinc-50 rounded px-2 py-1">
                        <span className="text-zinc-600">{MESES[(p.mes ?? 1) - 1]} {p.anio}</span>
                        <span className="text-zinc-900 font-medium">{(p.valor_tasa * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
