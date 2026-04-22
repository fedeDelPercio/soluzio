'use client'

import { useState, useTransition } from 'react'
import { FileText, Eye, Download, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import { getSignedUrlAction, verificarDocumentoAction, eliminarDocumentoAction } from './actions'

export const TIPO_LABEL: Record<string, string> = {
  contrato:           'Contrato PDF',
  dni_inquilino:      'DNI Inquilino',
  dni_garante:        'DNI Garante',
  escritura_garantia: 'Escritura garantía',
  informe_garantia:   'Informe garantía',
  seguro_incendio:    'Seguro de incendio',
  poliza_alternativa: 'Póliza alternativa',
  ficha_garante:      'Ficha garante',
  recibo_deposito:    'Recibo depósito',
  otro:               'Otro',
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente:  'bg-zinc-100 text-zinc-500',
  subido:     'bg-blue-100 text-blue-700',
  verificado: 'bg-green-100 text-green-700',
  rechazado:  'bg-red-100 text-red-600',
  vencido:    'bg-amber-100 text-amber-700',
}
const ESTADO_LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  subido:     'Subido',
  verificado: 'Verificado',
  rechazado:  'Rechazado',
  vencido:    'Vencido',
}

interface Documento {
  id: string
  tipo_documento: string
  estado: string
  creado_en: string
}

interface Props {
  documento: Documento
  contratoId: string
  esAdmin: boolean
}

export function DocumentoRow({ documento, contratoId, esAdmin }: Props) {
  const [loadingUrl, setLoadingUrl]   = useState(false)
  const [urlError, setUrlError]       = useState<string | null>(null)
  const [, startTransition]           = useTransition()

  async function abrirDoc(download: boolean) {
    setLoadingUrl(true)
    setUrlError(null)
    const res = await getSignedUrlAction(documento.id)
    setLoadingUrl(false)

    if ('error' in res) {
      setUrlError(res.error)
      return
    }

    if (download) {
      const a = document.createElement('a')
      a.href = res.url
      a.download = TIPO_LABEL[documento.tipo_documento] ?? 'documento'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      window.open(res.url, '_blank', 'noopener,noreferrer')
    }
  }

  function handleVerificar() {
    startTransition(async () => {
      const res = await verificarDocumentoAction(documento.id, contratoId)
      if (res?.error) alert(res.error)
    })
  }

  function handleEliminar() {
    if (!confirm('¿Eliminar este documento permanentemente?')) return
    startTransition(async () => {
      const res = await eliminarDocumentoAction(documento.id, contratoId)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900">
          {TIPO_LABEL[documento.tipo_documento] ?? documento.tipo_documento}
        </p>
        <p className="text-xs text-zinc-400">
          {new Date(documento.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Estado */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_COLOR[documento.estado] ?? 'bg-zinc-100 text-zinc-500'}`}>
        {ESTADO_LABEL[documento.estado] ?? documento.estado}
      </span>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {loadingUrl ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        ) : (
          <>
            <button
              onClick={() => abrirDoc(false)}
              title="Ver"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => abrirDoc(true)}
              title="Descargar"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {esAdmin && documento.estado === 'subido' && (
              <button
                onClick={handleVerificar}
                title="Marcar como verificado"
                className="p-1.5 rounded text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {esAdmin && (
              <button
                onClick={handleEliminar}
                title="Eliminar"
                className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {urlError && (
        <p className="text-xs text-red-500 flex-shrink-0">{urlError}</p>
      )}
    </div>
  )
}
