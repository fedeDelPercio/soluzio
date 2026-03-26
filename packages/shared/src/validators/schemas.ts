import { z } from 'zod'
import { ROL_USUARIO, INDICE_AJUSTE } from '../types/enums'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  telefono: z.string().optional(),
})

export const createOrganizacionSchema = z.object({
  nombre: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  cuit: z.string().optional(),
})

export const inviteUserSchema = z.object({
  email: z.string().email(),
  rol: z.enum([
    ROL_USUARIO.ADMINISTRADOR,
    ROL_USUARIO.PROPIETARIO,
    ROL_USUARIO.INQUILINO,
    ROL_USUARIO.INMOBILIARIO,
  ]),
  nombre: z.string().min(2),
  apellido: z.string().min(2),
})

export const createPropiedadSchema = z.object({
  propietario_id: z.string().uuid(),
  inmobiliario_id: z.string().uuid().optional(),
  direccion_calle: z.string().min(2),
  direccion_numero: z.string().min(1),
  direccion_piso: z.string().optional(),
  direccion_unidad: z.string().optional(),
  direccion_ciudad: z.string().min(2),
  direccion_provincia: z.string().default('Buenos Aires'),
  tipo_propiedad: z.enum(['departamento', 'casa', 'local', 'cochera']).default('departamento'),
})

export const createContratoSchema = z.object({
  propiedad_id: z.string().uuid(),
  inquilino_id: z.string().uuid(),
  garante_id: z.string().uuid().optional(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto_inicial: z.number().positive(),
  indice_ajuste: z.enum([INDICE_AJUSTE.IPC, INDICE_AJUSTE.ICL, INDICE_AJUSTE.FIJO]),
  periodo_ajuste_meses: z.number().int().min(1).max(12),
  monto_deposito: z.number().positive().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateOrganizacionInput = z.infer<typeof createOrganizacionSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type CreatePropiedadInput = z.infer<typeof createPropiedadSchema>
export type CreateContratoInput = z.infer<typeof createContratoSchema>
