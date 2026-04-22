import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatea un número como moneda ARS. Ej: 800000 → "$800.000" */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formatea una fecha ISO a formato legible. Ej: "2024-03-15" → "15/03/2024" */
export function formatFecha(fecha: string): string {
  // Si ya tiene hora (timestamptz) usarlo directo; si es solo fecha agregarle hora para evitar desfase UTC
  const d = new Date(fecha.includes('T') ? fecha : fecha + 'T00:00:00')
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
