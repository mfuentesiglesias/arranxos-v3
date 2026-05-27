# Arranxos

**Servicios de confianza en Galicia** — marketplace PWA que conecta clientes con profesionales verificados (electricistas, fontaneros, reformas, viticultores, ganadería, digital, eventos, turismo rural…). Pago en custodia futuro, anti-fuga de contactos, strikes configurables y panel admin completo.

Este repo es el **prototipo navegable completo** migrado a Next.js 15 + TypeScript + Tailwind + App Router. Preparado para PWA instalable.

> ⚠️ El repo mantiene **modo mock por defecto** y **modo Supabase parcial** para varios flujos reales. No hay Stripe/pagos reales todavía ni consecuencias automáticas de score/strikes. El estado exacto de la fase actual está en `docs/SUPABASE_CHECKPOINT.md`.

---

## Arrancar en local

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Requiere Node 20+.

### Estado actual

- Modo por defecto: `mock`
- Modo opcional: `supabase`
- Admin en Supabase ya cubre KPIs basicos, usuarios, trabajos, solicitudes, economia parcial, profesionales, moderacion, valoraciones y configuracion.
- No hay Stripe/pagos reales ni consecuencias automaticas del score o de los strikes.
- El auto-release manual admin sigue activo; la RPC backend para cron queda preparada, pero no hay scheduler activado todavia.
- Checkpoint completo: `docs/SUPABASE_CHECKPOINT.md`

### Arrancar en mock

```bash
npm install
npm run dev
```

Opcionalmente en `.env.local`:

```env
NEXT_PUBLIC_DATA_MODE=mock
```

### Arrancar en Supabase

En `.env.local`:

```env
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Luego:

```bash
npm install
npm run dev
```

---

## Cuentas demo

En `/login` hay cuatro accesos demo rápidos. También puedes navegar directamente:

| Rol           | URL de inicio                      |
|---------------|------------------------------------|
| Cliente       | `/cliente/inicio`                  |
| Profesional   | `/profesional/inicio`              |
| Admin         | `/admin`                           |
| Pro pendiente | `/profesional/pendiente`           |
| Pro bloqueado | `/profesional/bloqueado`           |

En escritorio verás un marco de móvil (PhoneFrame) con una barra lateral para saltar entre pantallas. En móvil ocupa toda la pantalla.

### Reset demo

- En `/login` tienes un botón discreto `Reset demo` para limpiar el estado mock persistido.
- El reset borra claves `arranxos-*` de `localStorage` y limpia `sessionStorage`.
- Úsalo cuando quieras volver a probar flujos desde cero en móvil o escritorio.

---

## Estructura

```
src/
├── app/
│   ├── layout.tsx                 # Root + manifest + install prompt
│   ├── page.tsx                   # redirect → /splash
│   ├── splash/                    # Splash y reentrada demo por rol persistido
│   ├── welcome/                   # Onboarding con CTAs
│   ├── login/                     # Email + 4 accesos demo + reset
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

## Qué sigue mock o parcial

| Área | Estado actual | Qué faltaría en prod |
|---|---|---|
| Base de datos | Modo `mock` por defecto con arrays en `src/lib/data.ts`; modo `supabase` parcial para varios flujos reales | Supabase como backend completo o backend propio equivalente |
| Auth | Accesos demo siguen existiendo; los flujos reales ya dependen de perfil/rol real cuando `NEXT_PUBLIC_DATA_MODE=supabase` | Supabase Auth completo con onboarding real |
| Pagos | Hay escrow lógico / protected payment en estados y RPCs, pero no Stripe/pagos reales; el auto-release cron solo queda preparado en SQL | Stripe Connect / Redsys + webhooks |
| Mapa | SVG estático y lógica demo de radio | MapLibre GL + PostGIS (`earthdistance` o similar) |
| Anti-fuga | Mock local en la demo y anti-fuga server-side real en `send_chat_message` cuando se usa Supabase | Reglas más avanzadas, observabilidad y endurecimiento adicional |
| Chat | En mock sigue habiendo seed/local; en Supabase ya existe chat real con `chat_messages` y RPC segura | Realtime completo y endurecimiento operativo |
| Moderación / strikes | En mock sigue el flujo demo; en Supabase ya existen `moderation_flags`, strike real y resolución manual sin strike desde admin | Automatismos configurables si producto decide activarlos |
| Config admin | Mock con `defaultAdminConfig` en demo y RPC real `get_admin_config` / `update_admin_config` en Supabase | Cobertura completa de parámetros operativos y auditoría |
| Reliability score | Score mock en demo y score real con snapshot/refrescos en Supabase | Decidir si tendrá consecuencias automáticas o seguirá solo lectura |
| Admin | En Supabase ya hay listados reales de usuarios, trabajos y solicitudes, además de pantallas reales/parciales para economía, moderación, valoraciones, profesionales y configuración | Completar listados/global views restantes y endurecer campos sensibles |
| Strikes auto-block | Umbral configurable visible, pero NO aplicado automáticamente | Trigger o job solo si producto decide activar bloqueo automático |
| Persistencia sesión | Zustand + `persist` en demo; en Supabase el frontend usa cliente browser con anon key + JWT del usuario | Sesión de producción endurecida y flujo auth final |

Busca `DEMO` en el código para ver todas las marcas explícitas.

---

## PWA

Configuración mínima para instalación:

- `public/manifest.json` con `display: standalone`, `start_url: /`, `scope: /`, theme `#FF5A5F` e iconos PNG 192/512.
- Meta tags en `src/app/layout.tsx` (`manifest`, `appleWebApp`, `themeColor`, `viewportFit=cover`, `apple-touch-icon`).
- `components/layout/install-prompt.tsx` escucha `beforeinstallprompt` y muestra un banner instalable.
- `public/sw.js` y `components/layout/service-worker-register.tsx` añaden el minimo necesario para reforzar la instalacion sin meter offline complejo.

### Probar en movil

1. Abre la demo desplegada por HTTPS en tu movil.
2. Comprueba `/manifest.json` y `/sw.js` si quieres validar la base PWA.
3. Si vienes de otras pruebas, usa `Reset demo` antes de empezar.

### Instalar en Android

1. Abre la demo en Chrome para Android.
2. Si el navegador muestra el banner `Instala Arranxos`, úsalo.
3. Si no aparece, abre el menu del navegador y usa `Instalar aplicacion` o `Anadir a pantalla de inicio`.

### Instalar en iPhone

1. Abre la demo en Safari.
2. Pulsa `Compartir`.
3. Elige `Añadir a pantalla de inicio`.

### Limitacion actual

- La demo no implementa offline completo ni cache agresiva.
- La demo no implementa offline completo ni cache agresiva.
- La base PWA ya incluye iconos PNG reales y `apple-touch-icon`, pero sigue siendo una app web instalable, no una app de App Store.

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

El proyecto es una app Next.js estándar. En modo `mock` puede correr sin backend real; en modo `supabase` usa PostgreSQL/RLS/RPCs mediante cliente browser con anon key + JWT. No usa `service_role` en frontend ni tiene Stripe/pagos reales todavía. La preparación de cron 1A deja una RPC backend-only (`auto_release_due_jobs_cron()`) sin scheduler, Edge Function, Worker ni GitHub Action activados aún.

No hay configuración validada de Cloudflare Pages en este repo ahora mismo. Si se menciona, debe considerarse futuro/pendiente.

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

### Anti-leak y moderación

- Ya existe detección server-side en `send_chat_message` cuando la app usa Supabase.
- Ya se guardan `moderation_flags` reales y el admin puede aplicar strike o marcar la flag como revisada sin strike.
- Pendiente: endurecer reglas/configuración avanzada, ampliar observabilidad del panel admin y decidir si algún automatismo configurable debe existir en el futuro.

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
