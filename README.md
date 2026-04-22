# Arranxos

**Servicios de confianza en Galicia** — marketplace PWA que conecta clientes con profesionales verificados (electricistas, fontaneros, reformas, viticultores, ganadería, digital, eventos, turismo rural…). Pago en custodia, anti-fuga de contactos, strikes configurables y panel admin completo.

Este repo es el **prototipo navegable completo** migrado a Next.js 15 + TypeScript + Tailwind + App Router. Preparado para PWA instalable.

> ⚠️ **Es un prototipo de frontend.** Todos los datos están mockeados (`src/lib/data.ts`). No hay backend real, no hay autenticación real, no hay pagos reales. Lee la sección "¿Qué falta para producción?" al final.

---

## Arrancar en local

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Requiere Node 20+.

---

## Cuentas demo

En `/login` hay tres botones rápidos para entrar como cada rol. También puedes navegar directamente:

| Rol           | URL de inicio                      |
|---------------|------------------------------------|
| Cliente       | `/cliente/inicio`                  |
| Profesional   | `/profesional/inicio`              |
| Admin         | `/admin`                           |
| Pro pendiente | `/profesional/pendiente`           |
| Pro bloqueado | `/profesional/bloqueado`           |

En escritorio verás un marco de móvil (PhoneFrame) con una barra lateral para saltar entre pantallas. En móvil ocupa toda la pantalla.

---

## Estructura

```
src/
├── app/
│   ├── layout.tsx                 # Root + manifest + install prompt
│   ├── page.tsx                   # redirect → /splash
│   ├── splash/                    # Splash auto-redirige a /welcome
│   ├── welcome/                   # Onboarding con CTAs
│   ├── login/                     # Email + 3 atajos demo
│   ├── register/                  # Registro cliente o pro
│   ├── (cliente)/cliente/         # Área cliente (con BottomNav cliente)
│   │   ├── inicio/
│   │   ├── explorar/              # Pros cercanos · lista/mapa
│   │   ├── publicar/              # Flujo 4 pasos
│   │   │   ├── page.tsx           # 1. Categoría
│   │   │   ├── servicio/          # 2. Servicio + cuestionario
│   │   │   ├── detalle/           # 3. Título/desc/fotos + anti-leak
│   │   │   └── revisar/           # 4. Revisar y publicar
│   │   ├── trabajos/              # Listado por estado
│   │   │   └── [id]/              # Detalle + sub-acciones
│   │   │       ├── solicitudes/
│   │   │       ├── invitaciones/
│   │   │       ├── aceptar/
│   │   │       ├── pagar/
│   │   │       ├── confirmar/
│   │   │       ├── disputa/
│   │   │       └── valorar/
│   │   └── perfil/
│   ├── (profesional)/profesional/ # Área pro (con BottomNav pro)
│   │   ├── inicio/
│   │   ├── trabajos/              # Oportunidades · lista/mapa/radio
│   │   │   └── [id]/              # Detalle con ubicación aproximada
│   │   │       ├── solicitar/     # Propuesta + precio + anti-leak
│   │   │       ├── seguimiento/   # Timeline + contador auto-release
│   │   │       └── finalizar/     # Notas + fotos de cierre
│   │   ├── pagos/                 # Pendientes / liberados / comisión
│   │   └── perfil/                # Stats, strikes, reseñas
│   ├── profesional/perfil/        # Perfil público pro (?id=…)
│   ├── profesional/pendiente/     # Cuenta en revisión
│   ├── profesional/bloqueado/     # Cuenta bloqueada (3 strikes)
│   ├── admin/                     # Área admin (con BottomNav admin)
│   │   ├── page.tsx               # Dashboard KPIs
│   │   ├── usuarios/
│   │   ├── profesionales/         # Pending/approved/blocked
│   │   ├── trabajos/
│   │   ├── disputas/              # Resolver a favor cliente/pro/split
│   │   ├── chats/                 # Moderación anti-leak
│   │   ├── valoraciones/
│   │   ├── tickets-busqueda/
│   │   └── configuracion/         # Comisión, auto-release, anti-leak
│   └── chat/[jobId]/              # Chat compartido cliente↔pro
├── components/
│   ├── ui/                        # Primitives (Button, Input, Avatar, Card, Icon, Badge…)
│   ├── layout/                    # StatusBar, TopBar, BottomNav, PhoneFrame, ScreenBody, InstallPrompt
│   ├── jobs/                      # JobCard, JobStatusTimeline
│   ├── pros/                      # ProCard, RatingStars, VerifiedDot, StrikeBadge
│   ├── chat/                      # MessageBubble, AntiLeakAlert
│   ├── map/                       # MapView (SVG mock)
│   └── forms/                     # PhotoUploader, ServiceQuestionnaire
├── lib/
│   ├── types.ts                   # Tipos dominio
│   ├── data.ts                    # Seed 20 pros + 35 trabajos + categorías + config
│   ├── anti-leak.ts               # Regex + scanLeaks/hasLeak/redactLeaks
│   ├── store.ts                   # Zustand session (DEMO persist)
│   └── utils.ts                   # cn, formatEuro, daysBetween, addDays, initials
└── app/globals.css                # Tailwind + utilities
```

---

## Direcciones visuales (estilo Airbnb)

- **Coral** (`#FF5A5F` y matices) para acciones primarias, CTAs, foco.
- **Teal** para confianza, pago protegido, estados OK.
- **Sand** (neutros cálidos) de fondo y bordes.
- **Ink** (grafitos) para texto y acentos densos.
- **Amber/Rose/Sky/Violet** como estados auxiliares (advertencia, disputa, info, confirmación).
- Tipografía **Inter** 400-800, esquinas 16-28 px, sombras suaves, microinteracciones `active:scale`.
- BottomNav con el botón **Publicar** sobresaliendo central (coral flotante).
- PhoneFrame (notch iOS) en desktop; viewport completo en móvil.

Tailwind y la paleta están en `tailwind.config.ts`. Todas las clases de color son las del tema, no hex crudos en componentes.

---

## Qué está mockeado (etiquetas `DEMO`)

| Área | Mock | Dónde se vería en prod |
|---|---|---|
| Base de datos | Arrays en `src/lib/data.ts` con nota "DEMO seed — replace with Supabase queries" | Supabase PostgreSQL |
| Auth | Ninguna; los "login demo" fijan `role` en Zustand | Supabase Auth + RLS |
| Pagos | Pantalla "Pagar con custodia" con delay 1 s | Stripe Connect / Redsys + webhook |
| Mapa | SVG estático con grid + ríos + ellipses (`components/map/map-view.tsx`) | MapLibre GL + PostGIS (`earthdistance`) |
| Anti-leak en vivo | Regex cliente (`lib/anti-leak.ts`), strikes se registran local | Edge function + tabla `moderation_flags` |
| Chat | Mensajes semilla + mensajes locales en memoria | Supabase Realtime + tabla `chat_messages` |
| Cuestionarios | Objeto hardcoded por `categoryId` (`forms/service-questionnaire.tsx`) | Tabla `service_questions` keyed por service |
| Config admin | `defaultAdminConfig` + edición en memoria | Tabla `admin_config` con RLS admin-only |
| Strikes auto-block | Umbral configurable (`strikeAutoBlockThreshold: 3`) NO aplicado automáticamente | Trigger o job que revise la tabla `strikes` |
| Persistencia sesión | Zustand + `persist` en localStorage, clave `arranxos-session` (marcada "DEMO ONLY") | Cookies httpOnly + session Supabase |

Busca `DEMO` en el código para ver todas las marcas explícitas.

---

## PWA

Configuración mínima para instalación:

- `public/manifest.json` con `display: standalone`, iconos SVG 192/512, theme `#FF5A5F`.
- Meta tags en `src/app/layout.tsx` (`manifest`, `appleWebApp`, `themeColor`).
- `components/layout/install-prompt.tsx` escucha `beforeinstallprompt` y muestra un banner instalable.

**No** hay service worker ni caching offline por decisión de producto. Si quieres añadirlos más adelante, `next-pwa` o un `sw.js` manual son opciones.

---

## Deploy

### Vercel (recomendado)

1. Sube el repo a GitHub.
2. En Vercel → **New Project** → importa el repo.
3. Framework preset: **Next.js**. Sin variables de entorno necesarias para la demo.
4. Deploy.

### Otro host Node

```bash
npm run build
npm start
```

El proyecto es una app Next.js estándar. No usa Edge runtime, ni middlewares, ni databases.

### Dominio personalizado

En Vercel → Settings → Domains. Añade `arranxos.gal` (o subdominio) y apunta DNS.

---

## ¿Qué falta para producción?

### Backend (Supabase sugerido)

1. **Esquema** con tablas: `users`, `professionals`, `jobs`, `job_requests`, `chat_messages`, `reviews`, `disputes`, `search_tickets`, `admin_config`, `strikes`, `moderation_flags`, `payouts`.
2. **RLS** (Row Level Security):
   - Un cliente solo lee sus trabajos.
   - Un profesional solo lee trabajos a los que se postuló o fue asignado.
   - Admins leen todo.
   - Dirección exacta solo visible tras estado `agreed`.
3. **Auth** con email magic-link y OAuth (Google, Apple).
4. **Realtime** en `chat_messages` para el chat.
5. **PostGIS** en `jobs.location` y `professionals.zone` para búsqueda por radio.

### Pagos

- **Stripe Connect** (preferido por simplicidad) o **Redsys** (banca española).
- Flujo: `escrow_funded` en hold → webhook de confirmación → actualiza `jobs.status` → pago se libera en `completed` o tras `auto_release_days`.
- Comisión configurable (`admin_config.commission_pct`) descontada en el momento de la liberación.

### Mapa real

Sustituir `components/map/map-view.tsx`:

```tsx
import maplibregl from "maplibre-gl";
// bind a a tiles (MapTiler, Stadia, OSM) y query Supabase con earthdistance
```

### Anti-leak reforzado

- Mover la detección a una Edge Function (Supabase o Vercel) para evitar bypass del cliente.
- Guardar cada intento en `moderation_flags` con cliente, mensaje, tipo. Incrementar `strikes` automáticamente.
- Revisar umbral `strike_auto_block_threshold` en trigger `after insert on strikes`.

### Observabilidad

- **Sentry** para errores.
- **PostHog** o **Plausible** para analítica (respetar RGPD).
- Logs de admin en tabla `audit_log`.

### Cumplimiento (RGPD)

- Aviso de cookies técnicas (persistencia sesión) y analítica.
- Export/borrado de datos por usuario (derecho al olvido).
- Términos de servicio y Política de privacidad (los enlaces en la app apuntan a `#`).

---

## Scripts

```bash
npm run dev       # Desarrollo en http://localhost:3000
npm run build     # Build producción
npm start         # Serve build
npm run lint      # ESLint
```

---

## Licencia

Uso interno Arranxos. Sin licencia pública hasta nuevo aviso.
