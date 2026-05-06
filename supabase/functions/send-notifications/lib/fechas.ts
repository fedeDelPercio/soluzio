// Helpers de fechas en formato YYYY-MM-DD (UTC).

export function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ayer(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function haceDias(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export function describirPropiedad(prop: { calle: string; numero: string; piso?: string | null; depto?: string | null } | null | undefined): string {
  if (!prop) return 'Propiedad'
  const partes = [
    `${prop.calle} ${prop.numero}`,
    prop.piso  ? `Piso ${prop.piso}` : null,
    prop.depto ? `Depto ${prop.depto}` : null,
  ].filter(Boolean)
  return partes.join(' ')
}
