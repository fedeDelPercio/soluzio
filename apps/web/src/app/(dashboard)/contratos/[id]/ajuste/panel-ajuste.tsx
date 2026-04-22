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

      {/* Botón aplicar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(() => aplicarAjusteAction(contratoId))
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 rounded-md transition-colors"
        >
          {pending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando ajuste...</>
          ) : (
            <><TrendingUp className="w-4 h-4" /> Aplicar ajuste: {formatARS(resultado.monto_nuevo)}/mes</>
          )}
        </button>
      </form>
    </div>
  )
}
