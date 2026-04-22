'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MoreHorizontal, FileEdit, Ban, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { rescindirContratoAction, eliminarContratoAction } from './contrato-actions'

interface Props {
  contratoId: string
  estado: string
}

export function ContratoActionsMenu({ contratoId, estado }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-7 h-7" />

  async function handleRescindir() {
    if (!confirm('¿Rescindir este contrato? Se marcará como rescindido pero el historial se conserva.')) return
    await rescindirContratoAction(contratoId)
  }

  async function handleEliminar() {
    if (!confirm('¿Eliminar este contrato permanentemente? Esta acción no se puede deshacer.')) return
    await eliminarContratoAction(contratoId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors outline-none"
      >
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/contratos/${contratoId}/editar`) }}>
          <FileEdit className="w-4 h-4" />
          Editar
        </DropdownMenuItem>

        {estado !== 'rescindido' && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRescindir() }}>
            <Ban className="w-4 h-4" />
            Rescindir
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); handleEliminar() }}>
          <Trash2 className="w-4 h-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
