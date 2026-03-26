import type { RolUsuario } from '@alquileres/database'

export interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_ADMIN: NavItem[] = [
  { label: 'Resumen', href: '/overview', icon: 'LayoutDashboard' },
  { label: 'Contratos', href: '/contratos', icon: 'FileText' },
  { label: 'Pagos', href: '/pagos', icon: 'CreditCard' },
  { label: 'Mantenimiento', href: '/mantenimiento', icon: 'Wrench' },
  { label: 'Propiedades', href: '/propiedades', icon: 'Building2' },
  { label: 'Configuración', href: '/configuracion', icon: 'Settings' },
]

const NAV_PROPIETARIO: NavItem[] = [
  { label: 'Resumen', href: '/overview', icon: 'LayoutDashboard' },
  { label: 'Mis propiedades', href: '/propiedades', icon: 'Building2' },
  { label: 'Pagos', href: '/pagos', icon: 'CreditCard' },
  { label: 'Mi perfil', href: '/configuracion/perfil', icon: 'User' },
]

const NAV_INQUILINO: NavItem[] = [
  { label: 'Resumen', href: '/overview', icon: 'LayoutDashboard' },
  { label: 'Mis pagos', href: '/pagos', icon: 'CreditCard' },
  { label: 'Mantenimiento', href: '/mantenimiento', icon: 'Wrench' },
  { label: 'Mis documentos', href: '/documentos', icon: 'FileText' },
  { label: 'Mi perfil', href: '/configuracion/perfil', icon: 'User' },
]

const NAV_INMOBILIARIO: NavItem[] = [
  { label: 'Resumen', href: '/overview', icon: 'LayoutDashboard' },
  { label: 'Mis alquileres', href: '/contratos', icon: 'FileText' },
  { label: 'Mi perfil', href: '/configuracion/perfil', icon: 'User' },
]

export function getNavItems(rol: RolUsuario): NavItem[] {
  switch (rol) {
    case 'administrador': return NAV_ADMIN
    case 'propietario': return NAV_PROPIETARIO
    case 'inquilino': return NAV_INQUILINO
    case 'inmobiliario': return NAV_INMOBILIARIO
  }
}
