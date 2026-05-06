'use client'

import { useState, useTransition } from 'react'
import { toggleNotificacionAction } from './actions'

interface Props {
  evento:     string
  initial:    boolean
}

export function NotificacionToggle({ evento, initial }: Props) {
  const [enabled, setEnabled]   = useState(initial)
  const [pending, startPending] = useTransition()
  const [error, setError]       = useState<string | null>(null)

  function onClick() {
    const next = !enabled
    setEnabled(next)
    setError(null)
    startPending(async () => {
      const res = await toggleNotificacionAction(evento, next)
      if (!res.ok) {
        setEnabled(!next)  // revert
        setError(res.error ?? 'Error')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onClick}
        disabled={pending}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-zinc-900' : 'bg-zinc-200'
        } ${pending ? 'opacity-60' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
