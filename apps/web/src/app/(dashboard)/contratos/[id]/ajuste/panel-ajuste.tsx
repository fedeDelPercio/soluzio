'use client'

import { useTransition } from 'react'
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { calcularAjuste, type TasaMensual } from '@alquileres/shared'
import { formatARS, formatFecha } from '@/lib/utils'
import { aplicarAjusteAction } from './actions'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface PanelAjusteProps {
  contratoId: string
  montoActual: number
  indiceAjuste: string
  periodoMeses: number
  proximaFechaAjuste: string
  tasas: TasaMensual[]
}

export function PanelAjuste({
  contratoId,
  montoActual,
  indiceAjuste,
  periodoMeses,
  proximaFechaAjuste,
  tasas,
}: PanelAjusteProps) {
  const [pending, startTransition] = useTransition()

  if (tasas.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Ajuste pendiente — sin datos de índice</p>
          <p className="text-xs text-amber-600 mt-0.5">
            No se encontraron tasas {indiceAjuste.toUpperCase()} para el período requerido. Verificar tabla índices.
          </p>
        </div>
      </div>
    )
  }

  const resultado = calcularAjuste(montoActual, tasas, periodoMeses)

  const hoy = new Date().toISOString().slice(0, 10)
  const vencido = proximaFechaAjuste <= hoy

  // Bloqueos: no se puede aplicar el ajuste si:
  //  1) Faltan tasas (algún mes del rango no fue publicado todavía).
  //  2) La fecha de ajuste todavía no llegó (aún si las tasas estuvieran).
  const tasasFaltan       = tasas.length < periodoMeses
  const aplicableHoy      = hoy >= proximaFechaAjuste
  const puedeAplicar      = !tasasFaltan && aplicableHoy

  // Mes que falta = el más reciente del rango requerido (último mes antes
  // de la fecha de ajuste).
  const proximaDate = new Date(proximaFechaAjuste + 'T00:00:00')
  const ultimoMesRequerido = new Date(proximaDate.getFullYear(), proximaDate.getMonth() - 1, 1)
  const ultimoMesLabel     = `${MESES[ultimoMesRequerido.getMonth()]} ${ultimoMesRequerido.getFullYear()}`

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${vencido ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <TrendingUp className={`w-4 h-4 flex-shrink-0 mt-0.5 ${vencido ? 'text-red-600' : 'text-blue-600'}`} />
        <div>
          <p className={`text-sm font-semibold ${vencido ? 'text-red-800' : 'text-blue-800'}`}>
            {vencido ? 'Ajuste de alquiler vencido' : 'Ajuste de alquiler próximo'}
          </p>
          <p className={`text-xs mt-0.5 ${vencido ? 'text-red-600' : 'text-blue-600'}`}>
            Fecha de ajuste: {formatFecha(proximaFechaAjuste)} · Índice {indiceAjuste.toUpperCase()} · {periodoMeses} meses
          </p>
        </div>
      </div>

      {/* Resumen del cálculo */}
      <div className="bg-white rounded-md border border-zinc-200 divide-y divide-zinc-100">
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Monto actual</p>
          <p className="text-sm font-medium text-zinc-900">{formatARS(resultado.monto_anterior)}/mes</p>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Variación acumulada</p>
          <p className="text-sm font-medium text-green-700">+{resultado.variacion_porcentual}%</p>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-700">Nuevo monto</p>
          <p className="text-base font-semibold text-zinc-900">{formatARS(resultado.monto_nuevo)}/mes</p>
        </div>
      </div>

      {/* Detalle de tasas */}
      <details className="text-xs">
        <summary className="text-zinc-500 cursor-pointer hover:text-zinc-700">
          Ver tasas mensuales usadas ({tasas.length} meses)
        </summary>
        <div className="mt-2 bg-white rounded-md border border-zinc-200 divide-y divide-zinc-100">
          {tasas.map(t => (
            <div key={`${t.anio}-${t.mes}`} className="px-3 py-1.5 flex justify-between">
              <span className="text-zinc-600">{MESES[t.mes - 1]} {t.anio}</span>
              <span className="text-zinc-900 font-medium">+{(t.valor_tasa * 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </details>

      {/* Aviso de tasas faltantes */}
      {tasasFaltan && (
        <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <p>
            Faltan datos del IPC/ICL para calcular el ajuste completo (tenés {tasas.length} de {periodoMeses} meses).
            INDEC y BCRA suelen publicar el dato del mes anterior entre el 10 y el 15 del mes siguiente.
            <br />
            Mes pendiente: <strong>{ultimoMesLabel}</strong>. El cálculo de arriba es estimativo y puede cambiar.
          </p>
        </div>
      )}

      {/* Aviso de fecha futura */}
      {!aplicableHoy && !tasasFaltan && (
        <div className="flex items-start gap-2 text-xs bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-500" />
          <p>
            Todas las tasas están disponibles, pero la fecha del ajuste es <strong>{formatFecha(proximaFechaAjuste)}</strong>.
            Vas a poder aplicarlo ese día.
          </p>
        </div>
      )}

      {/* Botón aplicar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!puedeAplicar) return
          startTransition(() => aplicarAjusteAction(contratoId))
        }}
      >
        <button
          type="submit"
          disabled={pending || !puedeAplicar}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed px-4 py-2 rounded-md transition-colors"
        >
          {pending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando ajuste...</>
          ) : !puedeAplicar ? (
            <>{tasasFaltan ? 'Esperando publicación de índices' : 'Disponible el día del ajuste'}</>
          ) : (
            <><TrendingUp className="w-4 h-4" /> Aplicar ajuste: {formatARS(resultado.monto_nuevo)}/mes</>
          )}
        </button>
      </form>
    </div>
  )
}
