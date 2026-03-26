# Administrador de Alquileres — CLAUDE.md

## Contexto del Negocio

**Red Suma** maneja ~1.200 alquileres/año. Este sistema captura ese volumen ofreciendo administración de alquileres con un 5% de comisión sobre el valor del alquiler (~$40.000/mes por unidad con alquiler promedio de $800.000).

**Fase 1 (actual):** Construir el sistema y validar el modelo operativo usando Red Suma como fuente de clientes.
**Fase 2:** Vender el sistema como SaaS a otras inmobiliarias.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Estilos | Tailwind CSS 4, CVA (class-variance-authority) |
| Backend/Auth | Supabase (PostgreSQL + Auth + Storage) |
| Serverless | Deno Edge Functions (Supabase) |
| IA | Claude API — análisis de contratos PDF y clasificación de mantenimiento |
| Email | Resend API |
| Validación | Zod |
| Monorepo | pnpm workspaces + Turborepo |
| Íconos | Lucide React |
| Runtime | Node.js >=20, pnpm 10.32.1 |

---

## Estructura del Monorepo

```
/
├── apps/
│   └── web/                      # App Next.js (App Router)
├── packages/
│   ├── config/                   # Configs TypeScript compartidas
│   ├── database/                 # Tipos auto-generados de Supabase
│   ├── shared/                   # Tipos de dominio, validadores Zod, calculadora de ajuste
│   └── ui/                       # Componentes UI compartidos (en construcción)
├── supabase/
│   ├── migrations/               # Migraciones SQL numeradas (001–010)
│   └── functions/                # Edge Functions Deno
├── package.json                  # Root workspace
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=        # Análisis de contratos y clasificación de mantenimiento
RESEND_API_KEY=           # Notificaciones por email
RESEND_FROM_EMAIL=noreply@tudominio.com
```

Copiar `.env.example` a `.env.local` en `apps/web/`.

---

## Comandos Frecuentes

```bash
pnpm install          # Instalar dependencias (correr como Administrador si hay error de permisos)
pnpm dev              # Levantar todos los paquetes en paralelo
pnpm build            # Build de producción
pnpm typecheck        # Chequeo de tipos TypeScript
pnpm lint             # Linting
```

---

## Base de Datos (Supabase + PostgreSQL)

### Arquitectura Multi-tenant

Todas las tablas tienen `organizacion_id`. Las RLS policies aíslan los datos por organización. No se necesitan chequeos adicionales a nivel aplicación.

### Tablas

Todas las tablas (excepto `indices_ajuste`) tienen: `id`, `organizacion_id`, `creado_en`, `actualizado_en`.

| Tabla | Campos clave | Notas |
|-------|-------------|-------|
| `organizaciones` | nombre, slug, cuit, configuracion jsonb, plan | Base multi-tenant |
| `perfiles` | id (→ auth.users), rol, dni, preferencias_notificacion jsonb | Extiende Supabase Auth |
| `propiedades` | propietario_id, inmobiliario_id, direccion_*, tipo_propiedad | inmobiliario_id nullable |
| `contratos` | propiedad_id, inquilino_id, garante_id, fecha_inicio, fecha_fin, monto_inicial, monto_actual, indice_ajuste, periodo_ajuste_meses, proxima_fecha_ajuste, monto_deposito, vencimiento_seguro_incendio, ia_analisis_raw jsonb, ia_analisis_resultado jsonb, ia_confianza | Entidad central |
| `documentos` | contrato_id, tipo_documento, estado, ruta_archivo, verificado_por | Un row por documento |
| `indices_ajuste` | tipo_indice, anio, mes, valor_tasa | Sin organizacion_id (datos globales) |
| `periodos_pago` | contrato_id, anio, mes, fecha_vencimiento, monto, tasa_ajuste | **Inmutables** — registro histórico del monto que se debía |
| `pagos` | periodo_pago_id, contrato_id, concepto, estado, monto_esperado, monto_pagado, fecha_vencimiento | Un row por concepto (alquiler, expensas, servicios) |
| `comprobantes_pago` | pago_id, ruta_archivo, fecha_transferencia, referencia_bancaria, pago_recibido, recibido_por | Admin tilda `pago_recibido` para confirmar |
| `solicitudes_mantenimiento` | contrato_id, reportado_por, titulo, descripcion, ia_sugerencia_responsable, responsable_confirmado, estado, prioridad | Con clasificación IA |
| `fotos_mantenimiento` | solicitud_mantenimiento_id, ruta_archivo | Separado para N fotos |
| `registro_notificaciones` | destinatario_id, tipo_notificacion, canal, estado, id_externo | Append-only |
| `calculos_ajuste` | contrato_id, monto_anterior, monto_nuevo, tasa_indice, aplicado | Auditoría de cada ajuste |

### Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `administrador` | Acceso completo a la organización |
| `propietario` | Ve sus propiedades y contratos |
| `inquilino` | Ve su contrato, sube documentos y comprobantes |
| `inmobiliario` | Ve las propiedades que gestiona |

### Funciones SQL Helper (RLS)

```sql
auth.organizacion_id()            -- organizacion_id del usuario actual
auth.rol_usuario()                -- rol del usuario actual
auth.tiene_rol(VARIADIC roles[])  -- boolean
```

Patrón base en todas las policies: `organizacion_id = auth.organizacion_id()`

### Storage Buckets (privados)

| Bucket | Tamaño máx. | Uso |
|--------|-------------|-----|
| `documentos` | 20 MB | Contratos, DNIs, escrituras |
| `comprobantes` | 5 MB | Comprobantes de pago |
| `mantenimiento` | 10 MB | Fotos de solicitudes |

Formatos permitidos: PDF, JPEG, PNG, WebP.

### Migraciones

Numeradas en `supabase/migrations/`. Orden planificado:

| # | Contenido | Estado |
|---|-----------|--------|
| 001 | Extensiones (uuid-ossp, pgcrypto) | ✅ |
| 002 | Enums | ✅ |
| 003 | organizaciones | ✅ |
| 004 | perfiles + trigger handle_new_user | ✅ |
| 005 | Auth helpers RLS | ✅ |
| 006 | propiedades | ✅ |
| 007 | contratos | ✅ |
| 008 | documentos | ✅ |
| 009 | indices_ajuste | ✅ |
| 010 | Storage buckets y políticas | ✅ |
| 011 | periodos_pago, pagos, comprobantes_pago | Pendiente |
| 012 | indices_ajuste seed (24 meses históricos IPC/ICL) | Pendiente |
| 013 | solicitudes_mantenimiento, fotos_mantenimiento | Pendiente |
| 014 | registro_notificaciones, calculos_ajuste | Pendiente |

Los enums del SQL deben estar sincronizados con `packages/shared/src/types/enums.ts`.

---

## Packages Compartidos

### `@alquileres/shared`

- **`types/domain.ts`** — Tipos TypeScript de salida de IA:
  - `ResultadoAnalisisContrato` — Resultado del análisis del contrato (fechas, montos, partes, índices, cláusulas, confianza)
  - `ResultadoClasificacionMantenimiento` — Clasificación de responsabilidad (inquilino/propietario/consorcio)
- **`validators/schemas.ts`** — Schemas Zod para formularios (login, register, propiedad, contrato, etc.)
- **`lib/calculadora-ajuste.ts`** — Calculadora pura de ajuste de alquiler. Fórmula: `monto_nuevo = monto_actual × ∏(1 + tasa_i)`. Se usa en UI (preview) y en Edge Functions (cálculo real).

### `@alquileres/database`

- Tipos TypeScript auto-generados de Supabase (`database.types.ts`)
- Regenerar con: `supabase gen types typescript --linked > packages/database/types/database.types.ts`

---

## Estructura de la App Web

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/           # Login form + server actions
│   │   └── setup/           # Setup inicial de organización
│   └── (dashboard)/
│       ├── layout.tsx        # Layout con sidebar + sesión
│       ├── overview/         # Dashboard según rol
│       ├── contratos/        # Lista, nuevo contrato (wizard), detalle, análisis IA, documentos
│       └── propiedades/      # Lista, nueva propiedad, detalle
├── components/
│   ├── dashboards/           # admin, propietario, inquilino, inmobiliario
│   ├── layout/               # Sidebar + nav-items por rol
│   └── ui/                   # button, card, input, label, avatar, badge, dropdown, separator
├── lib/
│   ├── auth/session.ts       # getSession(), requireSession()
│   ├── supabase/             # client.ts (browser), server.ts (SSR), admin.ts (service role)
│   └── utils.ts              # cn(), formatARS(), formatFecha()
└── middleware.ts              # Protege rutas, redirige a /login si no autenticado
```

### Convenciones de la App

- Las rutas del dashboard están bajo `(dashboard)/` y requieren sesión
- `requireSession()` redirige automáticamente a `/login` si no hay sesión
- `formatARS(amount)` formatea como peso argentino (es-AR locale)
- `formatFecha(fecha)` formatea fechas ISO a es-AR
- Alias de importación: `@/*` → `apps/web/src/*`

---

## Edge Functions (Deno)

| Función | Trigger | Responsabilidad |
|---------|---------|-----------------|
| `process-contract` | POST al subir PDF | PDF → Claude → guarda `ia_analisis_resultado` + `vencimiento_seguro_incendio` |
| `calculate-adjustment` | Manual (admin) + cron mensual | IPC/ICL → inserta en `calculos_ajuste` → espera confirmación admin |
| `fetch-index-rates` | Cron día 15 de cada mes | Fetch INDEC (IPC) + BCRA (ICL) → inserta en `indices_ajuste` |
| `send-notifications` | Cron diario 9am ART + event-triggered | Evalúa reglas de alertas → Resend → loguea en `registro_notificaciones` |
| `classify-maintenance` | POST al crear ticket | Descripción + foto → Claude → guarda `ia_sugerencia_responsable` |

### `process-contract` (implementada)

**Endpoint:** `POST /functions/v1/process-contract`

**Body:**
```json
{
  "ruta_archivo": "documentos/org-id/contrato.pdf",
  "solo_analisis": true,
  "contrato_id": "uuid-opcional"
}
```

**Flujo:**
1. Verifica rol administrador
2. Descarga PDF desde Supabase Storage
3. Convierte a base64
4. Llama a Claude claude-sonnet-4-6 con visión de PDF
5. Extrae JSON estructurado: fechas, montos, partes, índices, cláusulas especiales, score de confianza
6. Opcional: guarda en `contratos` y actualiza estado del documento
7. Retorna `ResultadoAnalisisContrato`

---

## Lógica de Negocio Clave

### Ajuste de Alquiler

- Índices: IPC, ICL o fijo (según contrato)
- Cálculo de interés compuesto acumulado
- Los índices históricos están en tabla `indices_ajuste`
- El administrador confirma el nuevo monto antes de aplicarlo
- Se notifica al inquilino y propietario 15 días antes

### Documentos por Contrato

| Documento | Estado seguido | Deadline |
|-----------|---------------|----------|
| Contrato PDF | Subido → Verificado | — |
| DNI inquilino | Pendiente → Verificado | — |
| DNI garante | Pendiente → Verificado | — |
| Escritura garantía | Pendiente → Verificado | — |
| Informe garantía | Pendiente → Verificado | — |
| Seguro de incendio | Pendiente | 15 días desde inicio |
| Ficha garante | Pendiente → Verificado | — |

### Alertas / Notificaciones

| Tipo | Destinatario | Timing |
|------|-------------|--------|
| Pago próximo | Inquilino | 5 días antes |
| Pago vencido | Admin + Inquilino | Día siguiente |
| Pago vencido (garante) | Garante | 15 días después |
| Pago recibido | Propietario | Inmediato |
| Aviso ajuste | Inquilino + Propietario | 15 días antes |
| Contrato por vencer | Admin + Propietario + Inquilino | 90/60/30 días |
| Seguro pendiente | Inquilino + Admin | Día 10 desde inicio |

**MVP:** Solo email (Resend). **Fase 2:** WhatsApp.

### Mantenimiento

- Inquilino reporta problema con descripción + fotos
- IA clasifica responsabilidad: inquilino / propietario / consorcio
- Administrador confirma y asigna proveedor
- Notificaciones a todas las partes al cambiar estado

---

## Priorización MVP vs Fase 2

| Funcionalidad | Estado |
|---------------|--------|
| Carga de documentos web | MVP ✅ |
| Análisis IA del contrato | MVP ✅ |
| Registro de pagos + comprobantes | MVP ✅ |
| Calculadora automática de incrementos | MVP ✅ |
| Alertas por email | MVP ✅ |
| Solicitudes de mantenimiento (tickets) | MVP ✅ |
| Clasificación IA de responsabilidad | MVP ✅ |
| Paneles para todos los roles | MVP ✅ |
| Carga de documentos por WhatsApp | Fase 2 |
| Alertas por WhatsApp | Fase 2 |
| Chatbot de soporte | Fase 2 |
| Panel para Inmobiliario | A validar |
| SaaS multi-inmobiliaria | Fase 3 |

---

## Decisiones Técnicas Clave

| Decisión | Rationale |
|----------|-----------|
| `periodos_pago` tabla separada | Registro inmutable de lo que se debía — permite auditoría histórica post-ajuste |
| `ia_analisis_raw` + `ia_analisis_resultado` | Raw para reparse si cambia el schema. Evita re-llamar a Claude |
| `calculadora-ajuste` en `packages/shared` | Misma lógica en Edge Function (real) y UI (preview) |
| Resend + React Email | Templates como componentes TSX. Swap de proveedor = cambiar un archivo |
| `organizacion_id` en toda tabla | Migración a SaaS multi-tenant sin schema changes |
| Supabase Realtime para admin | Nuevo comprobante subido → toast inmediato, sin polling |
| Edge Functions para IA | Timeouts largos (20-30s), service role para batch jobs |

## Archivos Críticos

| Archivo | Por qué |
|---------|---------|
| `supabase/functions/process-contract/index.ts` | Integración IA principal — lo primero que Red Suma testea |
| `packages/database/migrations/` | Fundación de todo — orden y correctitud críticos |
| `packages/shared/lib/calculadora-ajuste.ts` | Lógica con consecuencias legales — testear en aislamiento |
| `apps/web/src/lib/supabase/server.ts` | Patrón de sesión con cookies para Server Components |
| `supabase/functions/send-notifications/index.ts` | Deduplicación incorrecta → emails duplicados → pérdida de confianza |

## Sprint Plan

| Sprint | Contenido | Criterio de done |
|--------|-----------|-----------------|
| **S0** Foundation | Monorepo, Supabase, Auth, login, migraciones 001-005, CI | `pnpm dev` levanta. Login funciona. Rutas protegidas. |
| **S1** Onboarding + IA | Migraciones 006-010, wizard contrato, análisis IA, upload docs | Admin sube PDF → IA extrae datos → admin confirma |
| **S2** Pagos + Calculadora | Migraciones 011-012, calculadora ajuste, upload comprobantes | Inquilino sube comprobante → admin verifica → propietario ve pago |
| **S3** Mantenimiento | Migraciones 013-014, tickets, clasificación IA | Inquilino reporta → IA sugiere responsable → admin gestiona |
| **S4** Notificaciones + Dashboards | Resend templates, cron jobs, dashboards por rol, Realtime | Emails en tiempo correcto. Cada rol ve su dashboard. |
| **S5** Hardening + Launch | Auditoría RLS, error boundaries, invitaciones, Sentry, import Red Suma | Red Suma opera con contratos reales |

## Notas de Desarrollo

- Correr la terminal **como Administrador** en Windows para evitar errores de permisos con Turbopack
- El `package-lock.json` en `apps/web/` NO debe existir (el proyecto usa pnpm)
- Si se mueve la carpeta (ej. de OneDrive a local), re-correr `pnpm install`
- Los timestamps `actualizado_en` se actualizan automáticamente por triggers SQL
- El perfil de usuario se crea automáticamente por trigger al hacer signup en Supabase Auth
- Los campos `ia_analisis_raw` y `ia_analisis_resultado` en `contratos` son JSONB para flexibilidad
- La service role key es necesaria para operaciones administrativas y cronjobs (bypass de RLS)
