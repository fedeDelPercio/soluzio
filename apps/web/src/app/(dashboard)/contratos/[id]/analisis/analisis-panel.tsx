'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { confirmarContratoAction } from './confirmar-action'
import type { Contrato } from '@alquileres/database'
import type { ResultadoAnalisisContrato } from '@alquileres/shared'
import { CheckCircle2, AlertTriangle, Bot } from 'lucide-react'

interface AnalisisPanelProps {
  contrato: Contrato
}

function ConfianzaBadge({ valor }: { valor: number }) {
  const pct = Math.round(valor * 100)
  const color = valor >= 0.85
    ? 'bg-green-100 text-green-700'
    : valor >= 0.65
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-600'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      <Bot className="w-3 h-3" />
      {pct}% confianza
    </span>
  )
}

export function AnalisisPanel({ contrato }: AnalisisPanelProps) {
  const ia = contrato.ia_analisis_resultado as ResultadoAnalisisContrato | null
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Valores editables pre-cargados desde la IA
  const [fechaInicio, setFechaInicio]   = useState(ia?.fecha_inicio ?? contrato.fecha_inicio)
  const [fechaFin, setFechaFin]         = useState(ia?.fecha_fin ?? contrato.fecha_fin)
  const [monto, setMonto]               = useState(String(ia?.monto_inicial ?? contrato.monto_inicial))
  const [deposito, setDeposito]         = useState(String(ia?.monto_deposito ?? contrato.monto_deposito ?? ''))
  const [indice, setIndice]             = useState(ia?.indice_ajuste ?? contrato.indice_ajuste)
  const [periodo, setPeriodo]           = useState(String(ia?.periodo_ajuste_meses ?? contrato.periodo_ajuste_meses))
  const [seguro, setSeguro]             = useState(ia?.vencimiento_seguro_incendio ?? contrato.vencimiento_seguro_incendio ?? '')

  function handleConfirmar(formData: FormData) {
    formData.set('contrato_id', contrato.id)
    setError(null)
    startTransition(async () => {
      const result = await confirmarContratoAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  if (!ia) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-sm font-medium">Análisis no disponible</p>
        </div>
        <p className="text-sm text-amber-600 mt-1">
          El contrato aún no fue procesado por la IA. Volvé a la página de documentos y subí el PDF.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header IA */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200 flex-1">
          <Bot className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-zinc-900">
              Claude analizó el contrato
            </p>
            {ia.notas && (
              <p className="text-xs text-zinc-500">{ia.notas}</p>
            )}
          </div>
          <ConfianzaBadge valor={ia.confianza} />
        </div>
      </div>

      {/* Partes detectadas */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-medium text-zinc-700">Partes del contrato</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Inquilino</p>
            <p className="font-medium text-zinc-900">{ia.inquilino.nombre} {ia.inquilino.apellido}</p>
            {ia.inquilino.dni && <p className="text-zinc-500 text-xs">DNI {ia.inquilino.dni}</p>}
            {ia.inquilino.email && <p className="text-zinc-500 text-xs">{ia.inquilino.email}</p>}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Propietario</p>
            <p className="font-medium text-zinc-900">{ia.propietario.nombre} {ia.propietario.apellido}</p>
            {ia.propietario.dni && <p className="text-zinc-500 text-xs">DNI {ia.propietario.dni}</p>}
          </div>
          {ia.garante && (
            <div>
              <p className="text-xs text-zinc-400 mb-1">Garante</p>
              <p className="font-medium text-zinc-900">{ia.garante.nombre} {ia.garante.apellido}</p>
              {ia.garante.dni && <p className="text-zinc-500 text-xs">DNI {ia.garante.dni}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Cláusulas especiales */}
      {ia.clausulas_especiales.length > 0 && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 px-4 py-3">
          <p className="text-xs font-medium text-amber-700 mb-2">Cláusulas especiales detectadas</p>
          <ul className="space-y-1">
            {ia.clausulas_especiales.map((c, i) => (
              <li key={i} className="text-xs text-amber-800">• {c}</li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      {/* Formulario de confirmación / corrección */}
      <form action={handleConfirmar} className="space-y-5">
        <p className="text-sm font-medium text-zinc-700">
          Revisá y confirmá los datos extraídos
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
            <Input id="fecha_inicio" name="fecha_inicio" type="date" required
              value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha_fin">Fecha de fin</Label>
            <Input id="fecha_fin" name="fecha_fin" type="date" required
              value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monto_inicial">Monto inicial (ARS)</Label>
            <Input id="monto_inicial" name="monto_inicial" type="number" required
              value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monto_deposito">Depósito</Label>
            <Input id="monto_deposito" name="monto_deposito" type="number"
              value={deposito} onChange={(e) => setDeposito(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="indice_ajuste">Índice de ajuste</Label>
            <select id="indice_ajuste" name="indice_ajuste"
              value={indice} onChange={(e) => setIndice(e.target.value as typeof indice)}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="icl">ICL (BCRA)</option>
              <option value="ipc">IPC (INDEC)</option>
              <option value="fijo">Fijo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodo_ajuste_meses">Período (meses)</Label>
            <select id="periodo_ajuste_meses" name="periodo_ajuste_meses"
              value={periodo} onChange={(e) => setPeriodo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="1">1 (Mensual)</option>
              <option value="3">3 (Trimestral)</option>
              <option value="4">4 (Cuatrimestral)</option>
              <option value="6">6 (Semestral)</option>
              <option value="12">12 (Anual)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vencimiento_seguro_incendio">Vto. seguro incendio</Label>
            <Input id="vencimiento_seguro_incendio" name="vencimiento_seguro_incendio" type="date"
              value={seguro} onChange={(e) => setSeguro(e.target.value)} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isPending ? 'Activando contrato...' : 'Confirmar y activar contrato'}
        </Button>
      </form>
    </div>
  )
}
