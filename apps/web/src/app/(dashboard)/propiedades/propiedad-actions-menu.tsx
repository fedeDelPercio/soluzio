'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { eliminarPropiedadAction } from './actions'

interface Props {
  propiedadId: string
  tieneContratoActivo: boolean
}

export function PropiedadActionsMenu({ propiedadId, tieneContratoActivo }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-7 h-7" />

  async function handleEliminar() {
    if (tieneContratoActivo) {
      alert('No se puede eliminar una propiedad con contratos activos.')
      return
    }
    if (!confirm('¿Eliminar esta propiedad permanentemente? Esta acción no se puede deshacer.')) return
    const res = await eliminarPropiedadAction(propiedadId)
    if (res?.error) {
      alert(res.error)
    } else {
      router.refresh()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.preventDefault()}
        className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors outline-none"
      >
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => { e.preventDefault(); handleEliminar() }}
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
