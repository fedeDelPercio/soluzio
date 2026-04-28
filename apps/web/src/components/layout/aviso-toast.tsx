'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { AlertCircle, X } from 'lucide-react'

const MENSAJES: Record<string, string> = {
  acceso_denegado:    'No tenés permiso para acceder a esa sección.',
  permiso_denegado:   'No tenés permiso para realizar esa acción.',
  recurso_no_existe:  'El recurso al que intentaste acceder no existe o no es accesible.',
  sesion_expirada:    'Tu sesión expiró, volvé a iniciar.',
  no_autorizado:      'No tenés autorización para esa operación.',
}

export function AvisoToast() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const aviso        = searchParams.get('aviso')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!aviso) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      // Limpiar el query param sin recargar
      const params = new URLSearchParams(searchParams.toString())
      params.delete('aviso')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 5000)
    return () => clearTimeout(t)
  }, [aviso, pathname, router, searchParams])

  if (!aviso || !visible) return null
  const mensaje = MENSAJES[aviso] ?? 'Algo salió distinto a lo esperado.'

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm">
      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 shadow-lg">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p className="text-sm flex-1">{mensaje}</p>
        <button
          onClick={() => setVisible(false)}
          className="text-red-400 hover:text-red-600 flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
