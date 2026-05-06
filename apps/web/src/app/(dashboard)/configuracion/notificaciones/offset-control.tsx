'use client'

import { useState, useTransition } from 'react'
import { setOffsetNotificacionAction, resetOffsetNotificacionAction } from './actions'

interface Props {
  evento:     string
  initial:    number
  defaultDias: number
  minDias:    number
  maxDias:    number
  direccion:  'antes' | 'despues' | 'mismo_dia'
  referencia: string
}

function descripcion(dias: number, direccion: Props['direccion'], referencia: string): string {
  if (direccion === 'mismo_dia') return `Se manda el día ${referencia}`
  if (dias === 0)              return `Se manda el día ${referencia}`
  if (dias === 1) return direccion === 'antes' ? `Se manda 1 día antes ${referencia}` : `Se manda 1 día después ${referencia}`
  return direccion === 'antes' ? `Se manda ${dias} días antes ${referencia}` : `Se manda ${dias} días después ${referencia}`
}

export function OffsetControl({ evento, initial, defaultDias, minDias, maxDias, direccion, referencia }: Props) {
  const [valor, setValor]       = useState(initial)
  const [pending, startPending] = useTransition()
  const [error, setError]       = useState<string | null>(null)
  const [savedTick, setSavedTick] = useState(0)

  // Mismo día: no editable
  const editable = direccion !== 'mismo_dia' && minDias !== maxDias

  function commit(next: number) {
    if (next < minDias || next > maxDias) return
    setError(null)
    const prev = valor
    setValor(next)
    startPending(async () => {
      const res = await setOffsetNotificacionAction(evento, next)
      if (!res.ok) {
        setValor(prev)
        setError(res.error ?? 'Error')
      } else {
        setSavedTick((t) => t + 1)
      }
    })
  }

  function onReset() {
    commit(defaultDias)
  }

  if (!editable) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{descripcion(valor, direccion, referencia)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => commit(valor - 1)}
          disabled={pending || valor <= minDias}
          className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
          aria-label="Reducir días"
        >−</button>
        <input
          type="number"
          inputMode="numeric"
          min={minDias}
          max={maxDias}
          value={valor}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) setValor(Math.min(maxDias, Math.max(minDias, Math.round(n))))
          }}
          onBlur={() => { if (valor !== initial) commit(valor) }}
          className="w-12 h-6 text-center border border-zinc-200 rounded bg-white"
        />
        <button
          type="button"
          onClick={() => commit(valor + 1)}
          disabled={pending || valor >= maxDias}
          className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
          aria-label="Aumentar días"
        >+</button>
        <span className="text-zinc-500">días</span>
      </div>
      <p className="text-[11px] text-zinc-500">{descripcion(valor, direccion, referencia)}</p>
      {valor !== defaultDias && (
        <button
          type="button"
          onClick={onReset}
          disabled={pending}
          className="text-[11px] text-zinc-400 hover:text-zinc-700 underline"
        >
          Restaurar default ({defaultDias})
        </button>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
      {!error && savedTick > 0 && pending === false && (
        <span className="text-[11px] text-green-600">Guardado</span>
      )}
    </div>
  )
}
