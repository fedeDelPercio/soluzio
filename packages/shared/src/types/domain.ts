// Tipos de dominio compartidos entre app web y Edge Functions

import type { IndiceAjuste } from './enums'

/**
 * Resultado del análisis de un contrato PDF por Claude.
 * Este tipo define la forma del JSON que devuelve la Edge Function `process-contract`.
 */
export interface ResultadoAnalisisContrato {
  fecha_inicio: string // YYYY-MM-DD
  fecha_fin: string // YYYY-MM-DD
  monto_inicial: number // ARS
  monto_deposito: number | null // ARS
  indice_ajuste: IndiceAjuste
  periodo_ajuste_meses: number // cuántos meses acumula el índice (ej: 3)
  dia_vencimiento_pago: number | null // día del mes en que vence el pago (1-31), ej: 10
  vencimiento_seguro_incendio: string // YYYY-MM-DD (fecha_inicio + 15 días)
  requiere_seguro_incendio: boolean | null // si el contrato exige contratar seguro de incendio
  tasa_punitorio_mensual: number | null // porcentaje mensual de interés punitorio por mora (ej: 5)
  observacion_modalidad_cobro: string | null // observación textual sobre la cláusula de mora (hint para el admin)
  inquilino: {
    nombre: string
    apellido: string
    dni: string | null
    email: string | null
    telefono: string | null
  }
  propietario: {
    nombre: string
    apellido: string
    dni: string | null
    email: string | null
    telefono: string | null
  }
  garante: {
    nombre: string
    apellido: string
    dni: string | null
  } | null
  clausulas_especiales: string[]
  confianza: number // 0.0 – 1.0
  notas: string | null // notas del análisis o advertencias
}

/**
 * Resultado de la clasificación de una solicitud de mantenimiento por Claude.
 */
export interface ResultadoClasificacionMantenimiento {
  responsable: 'inquilino' | 'propietario' | 'consorcio' | 'indeterminado'
  confianza: number // 0.0 – 1.0
  razonamiento: string
  categoria_sugerida: string // ej: 'plomeria', 'electricidad', 'estructura'
}
