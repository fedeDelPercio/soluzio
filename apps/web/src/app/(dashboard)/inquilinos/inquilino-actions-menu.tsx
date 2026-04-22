'use client'

import { useRouter } from 'next/navigation'
import { MoreHorizontal, FileEdit, Trash2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { eliminarInquilinoAction } from './actions'

interface Props {
  inquilinoId: string
  tieneContratoActivo: boolean
}

export function InquilinoActionsMenu({ inquilinoId, tieneContratoActivo }: Props) {
  const router = useRouter()

  async function handleEliminar() {
    if (tieneContratoActivo) {
      alert('No se puede eliminar un inquilino con contratos activos.')
      return
    }
    if (!confirm('¿Eliminar este inquilino permanentemente? Esta acción no se puede deshacer.')) return
    const res = await eliminarInquilinoAction(inquilinoId)
    if (res?.error) alert(res.error)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors outline-none"
      >
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/inquilinos/${inquilinoId}/editar`) }}>
          <FileEdit className="w-4 h-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => { e.stopPropagation(); handleEliminar() }}
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
