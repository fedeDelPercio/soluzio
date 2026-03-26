/**
 * Calculadora de ajuste de alquiler por índice IPC/ICL.
 *
 * Esta función es pura (sin side effects) y es usada en dos lugares:
 * - Edge Function `calculate-adjustment` (cálculo real, server-side)
 * - UI del administrador (preview en tiempo real del nuevo monto)
 *
 * Al estar en `packages/shared`, ambos consumers usan exactamente la misma lógica.
 */

export interface TasaMensual {
  anio: number
  mes: number
  valor_tasa: number // tasa mensual como decimal, ej: 0.0823 = 8.23%
}

export interface ResultadoCalculo {
  monto_anterior: number
  monto_nuevo: number
  tasa_acumulada: number // tasa compuesta total aplicada
  periodos_usados: TasaMensual[]
  variacion_porcentual: number // porcentaje de aumento, ej: 24.5
}

/**
 * Calcula el nuevo monto de alquiler aplicando el índice acumulado de los últimos N meses.
 *
 * Fórmula: monto_nuevo = monto_actual × ∏(1 + tasa_i) para cada mes i
 *
 * @param montoActual - Monto mensual actual en ARS
 * @param tasasMensuales - Array de tasas mensuales en orden cronológico ascendente
 * @param periodoMeses - Cantidad de meses a acumular (extraído del contrato)
 */
export function calcularAjuste(
  montoActual: number,
  tasasMensuales: TasaMensual[],
  periodoMeses: number,
): ResultadoCalculo {
  // Tomar los últimos N meses en orden cronológico
  const periodosUsados = tasasMensuales.slice(-periodoMeses)

  if (periodosUsados.length === 0) {
    throw new Error('No hay tasas mensuales disponibles para calcular el ajuste')
  }

  // Calcular la tasa compuesta acumulada
  const tasaAcumulada = periodosUsados.reduce((acc, tasa) => {
    return acc * (1 + tasa.valor_tasa)
  }, 1) - 1

  const montoNuevo = Math.round(montoActual * (1 + tasaAcumulada))

  return {
    monto_anterior: montoActual,
    monto_nuevo: montoNuevo,
    tasa_acumulada: tasaAcumulada,
    periodos_usados: periodosUsados,
    variacion_porcentual: Number((tasaAcumulada * 100).toFixed(2)),
  }
}
