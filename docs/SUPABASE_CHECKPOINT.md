# Supabase Checkpoint

## Estado actual

Arranxos mantiene dos modos de datos:

> **Nota de marca:** La app pasa comercialmente a **Dersux**. El código, repo y documentación técnica pueden mantener nombres internos "Arranxos" durante la transición.

- `mock` por defecto para la demo completa y los smoke tests.
- `supabase` para una parte ya integrada de los flujos reales mediante RLS + RPC.

### Ya está en Supabase

- perfiles y guards básicos de rol usados por los flujos reales
- solicitudes de trabajo y aceptación
- chat real y envío de mensajes por RPC segura
- acuerdos y estados de escrow lógico
- disputas
- reviews reales
- reliability score y su snapshot persistido
- moderación / anti-fuga / strikes reales
- configuración admin necesaria para anti-fuga y score
- listados admin reales de usuarios, trabajos y solicitudes
- resumen admin de economía parcial/lógico
- dashboard admin con KPIs reales básicos
- hardening 1A de reviews y listado admin de moderación
- Admin Real 3B completado para tickets de búsqueda (SQL ejecutado y verificado)
- base segura 4E.1 para invitaciones reales ejecutada y verificada en Supabase
- base 4E.2A para listar candidatos reales seguros ejecutada y verificada en Supabase
- conexión 4E.2B del CTA real de invitar preparada en repo sin SQL nuevo
- acceso visible 4E.2C a invitaciones preparado en repo sin SQL nuevo
- base 4F.1A para invitaciones recibidas de profesional ejecutada y verificada en Supabase
- UI 4F.1B de invitaciones recibidas preparada en repo sin SQL nuevo

### Sigue mock o parcial

- Stripe / pagos reales
- mapas / geospatial real
- emails reales
- realtime completo de chat
- tickets de búsqueda reales (completado; SQL ejecutado y verificado en Supabase)
- publicación real de jobs desde cliente
- persistencia real de especialidades profesionales
- listado global completo de chats admin más allá de moderación por flags
- automatismos de bloqueo por score o strikes
- ranking derivado del score
- visibilidad, límites o bloqueos automáticos por score
- dashboard admin con KPIs reales más completo
- 4F.1C-A responder invitación enviando solicitud: preparado en repo; SQL versionado nuevo pendiente de revisar y ejecutar; sin UI todavía

### Probado live recientemente

- `send_chat_message` con anti-fuga server-side
- creación de `chat_messages` redactados
- creación de `moderation_flags`
- `apply_moderation_strike`
- `resolve_moderation_flag`
- `/admin/chats` leyendo flags reales
- `/admin/chats` aplicando strike real
- `/admin/chats` marcando flags como revisadas sin strike
- idempotencia de strike y de resolución
- flag cliente resuelta sin strike
- flag profesional resuelta sin strike y luego strike aplicada
- permisos no-admin bloqueados

### No asumir todavía

- que el score cambie por sí solo la visibilidad, el ranking o los límites
- que un strike bloquee profesionales automáticamente
- que exista Stripe / pago real / webhook real
- que todo el producto ya use Supabase; el modo mock sigue siendo el fallback por defecto

## Bloques completados

| Bloque | Estado | Notas |
|---|---|---|
| Auth / profiles básicos | Parcial real | Los flujos reales usan perfil y rol actuales; el repo sigue manteniendo acceso demo/mock. |
| Jobs / requests / acceptance | Versionado e integrado | RPCs para crear y aceptar solicitudes ya existen en repo. |
| Agreements / escrow lógico | Versionado e integrado | Hay estados reales de acuerdo y pago protegido lógico; no hay Stripe real. |
| Reviews reales | Completado | `create_review` existe y alimenta fiabilidad. |
| Reliability score | Completado | Score real privado/admin con snapshot persistido. |
| Auto-refresh reliability por reviews | Completado | Refresco tras `create_review`. |
| Auto-refresh reliability por disputes | Completado | Refresco tras `resolve_dispute`. |
| Auto-refresh reliability por confirm completion | Completado | Refresco en cierre/confirmación. |
| Auto-refresh reliability por auto-release | Completado | Refresco dentro de `auto_release_due_jobs`. |
| Auto-refresh reliability por strikes | Completado | Refresco dentro de `apply_moderation_strike`. |
| Moderation / anti-fuga | Completado | `send_chat_message`, `moderation_flags`, strike y resolve ya integrados. |
| `/admin/chats` real | Completado | Lista flags reales y permite acciones manuales de moderación. |
| `/admin` KPIs reales básicos | Completado | KPIs básicos reales en modo Supabase; mock intacto. |
| `/admin/usuarios` real | Completado | Listado básico de perfiles reales sin emails, teléfonos ni `location_label`. |
| `/admin/trabajos` real | Completado | Listado real con `approx_location`; no usa `job_private_locations`. |
| `/admin/solicitudes` real | Completado | Listado real de `job_requests` sin leer `message`. |
| `/admin/economia` parcial real | Completado | Resumen lógico Supabase + auto-release manual real; sin Stripe real. |
| Hardening reviews / chats 1A | Completado | Reviews ya no quedan abiertas a todo `authenticated`; `/admin/chats` evita mostrar contenido original en crudo en la lista. |
| Cron scheduler 1B | Completado | pg_cron activo con `jobname = auto-release-due-jobs`, `schedule = 0 * * * *`, `command = select public.auto_release_due_jobs_cron();`, `active = true`. |
| Admin Real 3A catálogo / solicitudes | Completado | RPCs, APIs, rutas admin, perfil profesional y publicación cliente conectados a datos reales. |
| Admin Real 3B tickets de búsqueda | Completado | SQL ejecutado, RPCs verificadas, `/admin/tickets-busqueda` funcional en vivo con usuario admin real. |
| Admin Real 4A jobs reales cliente | Completado | `listMyJobs()` y `getMyJobById()` en `src/lib/api/clientJobs.ts`; `/cliente/trabajos` y `/cliente/trabajos/[id]` ya cargan trabajos reales en modo Supabase; no implementa publicación real de jobs todavía. |
| Admin Real 4B solicitudes reales en detalle cliente | Completado | Code-only; `getClientJobRequestsWithProfessionalInfo()` y `acceptJobRequest()` ya existían en `src/lib/api/jobRequests.ts`; la RPC `get_client_job_requests_with_professional_public_info` ya estaba desplegada; el detalle cliente muestra solicitudes reales con nombre público, especialidad, zona, estado y mensaje; permite aceptar solicitud real vía `accept_job_request` con feedback de error; el rechazo real (`reject_job_request`) queda pendiente para bloque futuro; invitaciones reales siguen pendientes. |
| Admin Real 4C rechazo real de solicitudes | Completado | SQL ejecutado y verificado en Supabase; RPC `reject_job_request(uuid)` SECURITY DEFINER, `search_path = public, pg_temp`, solo cliente propietario, valida estado pending, no asigna profesional ni abre chat; grant execute a authenticated, revocada de anon/public; API `rejectJobRequest()` en `src/lib/api/jobRequests.ts`; botón "Rechazar" en detalle cliente con feedback de error; `rejected` badge visible. |
| Hardening 4D errores/privacidad mock | Completado | Code-only; limpieza de `realRequestsError` al iniciar y completar aceptar/rechazar solicitudes reales; rama mock de `/admin/usuarios` deja de mostrar email visible; sin SQL y sin cambios de RLS/RPC/grants. |
| Build 4E.1 invitaciones reales base segura | Completado | SQL ejecutado y verificado en Supabase; RPC `create_job_invitation(uuid, uuid)` activa en `public`, con `SECURITY DEFINER`, `search_path = public, pg_temp`, `anon_can_execute = false` y `authenticated_can_execute = true`; `sql/05_grants.sql` ya recoge el grant execute a authenticated; API mínima `createJobInvitation()` en `src/lib/api/jobInvitations.ts`; `/cliente/trabajos/[id]/invitaciones` carga job real con `getMyJobById()` y evita fallback a `jobs[0]` para jobs reales; los candidatos reales siguen pendientes para el siguiente bloque y todavía no se conectó una lista real de profesionales; sin Stripe, sin chat y sin pagos. |
| Build 4E.2A candidatos reales seguros para invitaciones | Completado | SQL ejecutado y verificado en Supabase; RPC `get_client_job_invitable_professionals_with_public_info(uuid)` activa en `public`, con `SECURITY DEFINER`, `search_path = public, pg_temp`, `anon_can_execute = false` y `authenticated_can_execute = true`; `sql/05_grants.sql` ya recoge el grant execute a authenticated; `listInvitableProfessionalsForJob()` ya está añadida en `src/lib/api/jobInvitations.ts`; `/cliente/trabajos/[id]/invitaciones` lista candidatos reales con datos públicos mínimos; el CTA real de invitar sigue pendiente para 4E.2B y `createJobInvitation()` todavía no está conectada al botón; sin Stripe, sin chat y sin pagos. |
| Build 4E.2B CTA real de invitar conectado | Preparado | Code-only; sin SQL nuevo y sin SQL remoto; `/cliente/trabajos/[id]/invitaciones` conecta el botón `Invitar` a `createJobInvitation(jobId, professionalId)` para candidatos sin `invitation_status`, muestra feedback seguro de éxito/error, refresca candidatos y el job real, y pasa el candidato a estado `Ya invitado`; no abre chat, no revela dirección exacta y no toca Stripe, pagos, acuerdos ni chat. |
| Build 4E.2C acceso visible desde detalle | Preparado | Code-only; sin SQL nuevo y sin SQL remoto; el detalle del trabajo elimina el copy obsoleto que decía que las invitaciones aún no estaban conectadas y añade un CTA visible `Invitar a profesionales Dersux` hacia `/cliente/trabajos/[id]/invitaciones`; la opción del menú de 3 puntos se mantiene; invitar sigue sin abrir chat, sin revelar dirección exacta y sin tocar Stripe, pagos, acuerdos ni chat. |
| Build 4F.1A invitaciones recibidas por profesional base segura | Completado | SQL ejecutado y verificado en Supabase; RPC `get_professional_job_invitations_with_public_job_info()` activa en `public`, con `SECURITY DEFINER`, `search_path = public, pg_temp`, `anon_can_execute = false` y `authenticated_can_execute = true`; `sql/05_grants.sql` ya recoge el grant execute a authenticated; `listMyProfessionalInvitations()` ya está añadida en `src/lib/api/jobInvitations.ts`; la UI profesional sigue pendiente para 4F.1B; `Enviar solicitud desde invitación` y aceptar/rechazar invitación siguen pendientes; sin Stripe, sin chat y sin pagos; sin dirección exacta. |
| Build 4F.1B UI profesional invitaciones recibidas | Preparado | Code-only; sin SQL nuevo y sin SQL remoto; `/profesional/trabajos` muestra una sección superior `Invitaciones recibidas` usando `listMyProfessionalInvitations()`, con cards de datos públicos mínimos, estado de invitación, estado de solicitud y enlace `Ver detalle`; no implementa `Enviar solicitud desde invitación`, no implementa aceptar/rechazar invitación, no abre chat, no toca pagos y no revela dirección exacta. |
| Build 4F.1C-A solicitud real desde invitación | Completado | SQL ejecutado y verificado en Supabase; RPC `create_job_request_from_invitation(uuid, text)` activa en `public`, con `SECURITY DEFINER`, `search_path = public, pg_temp`, `anon_can_execute = false` y `authenticated_can_execute = true`; API `createJobRequestFromInvitation()` añadida en `src/lib/api/jobInvitations.ts`; la RPC crea `job_request` `pending` y marca la invitación como `accepted` en una sola operación transaccional; no abre chat, no revela dirección exacta, no toca Stripe/chat/pagos/acuerdos y el cliente sigue siendo quien acepta la solicitud. |
| Build 4F.1C-B UI detalle profesional responde invitación | Preparado | Code-only; sin SQL nuevo y sin SQL remoto; `/profesional/trabajos` pasa `invitationId` al detalle y `/profesional/trabajos/[id]` usa `createJobRequestFromInvitation()` cuando existe `invitationId`, mantiene `createJobRequest()` para trabajos normales, muestra contexto `Invitación recibida` y evita reenvíos si ya existe solicitud; no abre chat, no toca pagos/acuerdos y no revela dirección exacta; el cliente sigue siendo quien acepta la solicitud. |
| Branding 1B guía Dersux/Dersu | Completado | Documentación creada en `docs/BRANDING_DERSUX.md`; sin cambios de UI, sin cambios de lógica, sin SQL y sin cambios técnicos en roles, rutas, tablas o RPCs. |
| Branding 1C copy visible bajo riesgo | Completado | Solo cambios de copy visibles en pantallas cliente/profesional y navegación demo; usa "Profesional Dersux" y "Dersux Pro" donde aporta claridad; sin SQL, sin cambios de lógica y sin cambios técnicos en roles, rutas, tablas o RPCs. |
| QA 5A Playwright Extended Mock | Completado | Suite nueva `tests/e2e/qa-extended.spec.ts`; cubre privacidad mock en `/admin/usuarios`, copy visible Dersux/Dersux Pro y carga de rutas cliente/profesional relacionadas; sin SQL, sin cambios de app y sin cambios Supabase. |
| `/admin/valoraciones` real | Completado | Listado real de reviews. |
| `/admin/configuracion` real | Completado | `admin_config` real vía RPC. |
| `/admin/profesionales` real | Completado | Scores reales y recálculo manual. |

## Estado actual de pantallas admin

| Pantalla | Estado | Fuente |
|---|---|---|
| `/admin` | real básico | KPIs reales agregados |
| `/admin/usuarios` | real | `profiles` + `professionals` |
| `/admin/trabajos` | real | `jobs` + `profiles` + catálogo |
| `/admin/solicitudes` | real | `job_requests` + `jobs` + `profiles` + catálogo |
| `/admin/economia` | parcial real | `agreements` + `jobs` + `auto_release_due_jobs()` |
| `/admin/profesionales` | real | scores y snapshot reales |
| `/admin/chats` | real | `moderation_flags` y acciones RPC |
| `/admin/catalogo` | real | `catalog_categories` + `catalog_services` + `catalog_requests` |
| `/admin/solicitudes-catalogo` | real | `catalog_requests` con acciones RPC de aprobar/rechazar/fusionar |
| `/admin/tickets-busqueda` | real | `search_tickets` + RPCs `create_search_ticket_from_job` / `update_search_ticket_status` |
| `/admin/valoraciones` | real | `reviews` reales |
| `/admin/configuracion` | real | `admin_config` vía RPC |

## RPCs importantes

| RPC | Archivo | Finalidad |
|---|---|---|
| `send_chat_message` | `sql/03_rpc_functions.sql` | Enviar mensaje real, aplicar anti-fuga server-side, guardar contenido redactado y crear `moderation_flags`. |
| `create_review` | `sql/13_reviews_rpc.sql` | Crear review real y refrescar fiabilidad del profesional objetivo. |
| `get_professional_reliability_score` | `sql/16_reliability_score.sql` | Leer score real de un profesional. |
| `recalculate_professional_reliability_score` | `sql/16_reliability_score.sql` | Recalcular score real manualmente desde admin. |
| `list_admin_professional_scores` | `sql/16_reliability_score.sql` | Listado admin de scores reales. |
| `refresh_professional_reliability_snapshot` | `sql/17_reliability_autorefresh.sql` | Helper interno que recalcula y persiste `reliability_snapshot`. |
| `auto_release_due_jobs` | `sql/12_auto_release_rpc.sql` | Auto-release lógico manual admin-only usado desde `/admin/economia`. |
| `auto_release_due_jobs_cron` | `sql/20_auto_release_cron_rpc.sql` | Variante backend-only para ejecución headless vía `service_role`. |
| Cron scheduler 1B | `sql/22_pg_cron_schedule.sql` | Scheduler real ya ejecutado en Supabase; pg_cron invoca cada hora `auto_release_due_jobs_cron()`; rollback con `select cron.unschedule('auto-release-due-jobs')`. |
| `create_catalog_request` | `sql/23_catalog_requests_rpc.sql` | Crear solicitud real de catálogo desde cliente/profesional autenticado. |
| `approve_catalog_request` | `sql/23_catalog_requests_rpc.sql` | Aprobar solicitud real y crear categoría/servicio transaccionalmente. |
| `reject_catalog_request` | `sql/23_catalog_requests_rpc.sql` | Rechazar solicitud real con motivo opcional. |
| `merge_catalog_request` | `sql/23_catalog_requests_rpc.sql` | Fusionar solicitud real con servicio existente. |
| `create_search_ticket_from_job` | `sql/24_search_tickets_rpc.sql` | Crear ticket real de búsqueda desde un job del cliente, derivando zona aproximada server-side. |
| `update_search_ticket_status` | `sql/24_search_tickets_rpc.sql` | Cambiar estado real del ticket de búsqueda desde admin. |
| `create_job_invitation` | `sql/26_create_job_invitation_rpc.sql` | RPC ya ejecutada y verificada en Supabase para invitar un profesional aprobado a un job publicado del cliente; `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`. |
| `get_client_job_invitable_professionals_with_public_info` | `sql/27_job_invitation_candidates_rpc.sql` | RPC ya ejecutada y verificada en Supabase para listar candidatos reales con proyección pública mínima, matching por servicio/categoría y estado de invitación sin exponer teléfono, `location_label`, lat/lng ni score interno; `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`. |
| `get_professional_job_invitations_with_public_job_info` | `sql/28_professional_job_invitations_rpc.sql` | RPC ya ejecutada y verificada en Supabase para listar invitaciones recibidas por un profesional approved con solo datos públicos del job y estado de solicitud relacionado, sin dirección exacta, contacto del cliente, chat ni pagos; `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`. |
| `create_job_request_from_invitation` | `sql/29_create_job_request_from_invitation_rpc.sql` | RPC ya ejecutada y verificada en Supabase para que un profesional approved responda una invitación creando una `job_request` `pending` y marcando la invitación como `accepted` en la misma transacción; `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`. |
| `reviews_select_participants` | `sql/21_hardening_reviews_rls.sql` | Endurece la lectura de reviews para limitarla a admin o participantes del trabajo. |
| `apply_moderation_strike` | `sql/18_moderation_strike_rpc.sql` | Aplicar strike manual admin-only sobre una `moderation_flag`. |
| `resolve_moderation_flag` | `sql/19_moderation_resolve_rpc.sql` | Marcar una `moderation_flag` como revisada sin strike. |
| `open_dispute` | `sql/11_disputes_rpc.sql` | Abrir disputa real. |
| `resolve_dispute` | `sql/11_disputes_rpc.sql` | Resolver disputa y refrescar score si corresponde. |
| `confirm_job_completion` | `sql/10_completion_release_rpc.sql` | Confirmar trabajo completado y cerrar el ciclo lógico del acuerdo. |

### RPCs de soporte ya presentes

- `create_job_request`
- `accept_job_request`
- `create_agreement`
- `accept_agreement`
- `fund_protected_payment`
- `mark_job_completed`
- `get_admin_config`
- `update_admin_config`

## Grants y RLS importantes

- `refresh_professional_reliability_snapshot(uuid)` no tiene grant publico, `anon` ni `authenticated`.
- `moderation_flags` tiene `GRANT SELECT` para `authenticated`, pero RLS sigue siendo admin-only.
- `/admin/chats` ya no necesita leer `chat_messages.content` original para listar flags; usa `redacted_content` o fallback seguro.
- `apply_moderation_strike(uuid)` y `resolve_moderation_flag(uuid)` tienen `GRANT EXECUTE` para `authenticated`, pero bloquean internamente a no-admin.
- `chat_messages` no admite insert directo de usuarios finales por RLS; el write real va por `send_chat_message`.
- `moderation_flags` no se modifica desde frontend con writes directos normales; las operaciones sensibles van por RPC admin-only.
- `professionals.strike_count` no queda expuesto a self-update arbitrario; el cambio real de strikes lo hace el RPC admin.
- Los listados admin nuevos no necesitan `auth.users`, `service_role` ni `job_private_locations`.
- `service_role` sigue sin usarse en frontend; en 1A solo queda previsto como caller backend de `auto_release_due_jobs_cron()`.
- El scheduler pg_cron de 1B ejecuta `auto_release_due_jobs_cron()` cada hora sin depender de JWT de usuario; rollback con `select cron.unschedule('auto-release-due-jobs')`.
- `search_tickets` y sus mutaciones reales ya están ejecutadas en Supabase; las RPCs `create_search_ticket_from_job` y `update_search_ticket_status` están activas con SECURITY DEFINER y grants a authenticated.
- `create_job_invitation(uuid, uuid)` ya está ejecutada y verificada en Supabase; mantiene `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`.
- `get_client_job_invitable_professionals_with_public_info(uuid)` ya está ejecutada y verificada en Supabase; mantiene `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`.
- 4E.2B no añade SQL nuevo; reutiliza las RPCs ya desplegadas `create_job_invitation(uuid, uuid)` y `get_client_job_invitable_professionals_with_public_info(uuid)`.
- 4E.2C no añade SQL nuevo; solo mejora el acceso visible a invitaciones desde el detalle del trabajo.
- `get_professional_job_invitations_with_public_job_info()` ya está ejecutada y verificada en Supabase; mantiene `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`.
- 4F.1B no añade SQL nuevo; reutiliza `get_professional_job_invitations_with_public_job_info()` desde `/profesional/trabajos`.
- `create_job_request_from_invitation(uuid, text)` ya está ejecutada y verificada en Supabase; mantiene `SECURITY DEFINER`, `search_path = public, pg_temp`, sin execute para `anon` y con execute para `authenticated`.
- 4F.1C-B no añade SQL nuevo; reutiliza `create_job_request_from_invitation(uuid, text)` desde `/profesional/trabajos/[id]` cuando la navegación llega con `invitationId`.
- `profiles` puede leerse como admin, pero los listados seguros deben proyectar solo campos mínimos.
- `reviews` ya no queda abierta con `using (true)` para todo `authenticated`; la lectura real se limita a admin o participantes del trabajo.

## Reglas de producto confirmadas

- El chat solo existe tras aceptación del cliente.
- La anti-fuga se aplica server-side en el flujo real.
- Los flags de moderación son reales.
- Los strikes son manuales y decididos por admin.
- El admin también puede marcar flags como revisadas sin strike.
- El score de fiabilidad es de solo lectura; no tiene consecuencias automáticas todavía.
- No hay ranking, visibilidad, límites ni bloqueos automáticos derivados del score o de los strikes.
- No hay Stripe / pagos reales todavía.
- `payment_status` en admin/economía representa flujo lógico interno, no cobro Stripe real.
- Este hardening no activa scheduler ni añade Edge Function / Worker / GitHub Action.
- `catalog_requests` no se toca en 3B; el foco es `search_tickets`.
- La pantalla de invitaciones para jobs reales no mezcla jobs reales con profesionales mock y mantiene datos públicos mínimos.
- 4E.2B permite invitar desde la lista real sin abrir chat ni revelar la dirección exacta del trabajo.
- 4E.2C elimina el copy obsoleto del detalle y añade un CTA visible hacia la pantalla de invitaciones.
- 4F.1A prepara solo la base segura de lectura para invitaciones recibidas; no añade UI todavía y deja pendientes `Enviar solicitud desde invitación` y aceptar/rechazar invitación.
- 4F.1B añade la sección visual de invitaciones recibidas, pero no implementa aún `Enviar solicitud desde invitación` ni aceptar/rechazar invitación.
- 4F.1C-A ya cubre la operación transaccional para responder una invitación enviando solicitud: crea `job_request` `pending`, marca la invitación como `accepted`, no abre chat, no revela dirección exacta, no toca pagos ni acuerdos y el cliente sigue siendo quien acepta la solicitud.
- 4F.1C-B conecta la UI del detalle profesional para responder invitaciones con `createJobRequestFromInvitation()`, sin SQL nuevo, sin chat, sin pagos/acuerdos y sin dirección exacta.
- `/admin/chats` es moderación por flags reales; no es todavía un listado global completo de chats.
- Los listados admin nuevos son de solo lectura; no añaden acciones write en usuarios, trabajos ni solicitudes.

## Privacidad y superficie expuesta

- No se exponen emails reales desde frontend.
- Los listados admin nuevos no leen teléfonos.
- No se consulta `auth.users`.
- No se usa `service_role` en frontend.
- `auto_release_due_jobs_cron()` queda revocada para `public`, `anon` y `authenticated`, y solo preparada para `service_role` backend.
- No se consulta `job_private_locations` en listados admin nuevos.
- La ubicación exacta sigue protegida; `/admin/trabajos` usa `approx_location`.
- `/admin/solicitudes` no lee `job_requests.message` en 1A para evitar exponer texto libre sensible.

## Estado de validaciones

### Live

- Moderación / anti-fuga / strikes reales: OK en pruebas live recientes.

### Local

Comandos estándar:

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Último estado conocido en el checkpoint documental:

- `npm run build`: OK
- `npm run typecheck`: OK tras regenerar `.next`
- `NEXT_PUBLIC_DATA_MODE=mock npm run test:e2e`: OK en el cierre de `/admin/usuarios`

Notas:

- Si `.next` está desincronizado o incompleto, `typecheck`, `build` o `test:e2e` pueden fallar por artefactos locales transitorios no relacionados con el SQL o la moderación.
- La referencia principal para este bloque sigue siendo la prueba live del flujo de moderación y la suite e2e del repo cuando se ejecuta en un cierre funcional.

## Cómo arrancar

### Mock

```bash
npm install
npm run dev
```

Modo por defecto:

```env
NEXT_PUBLIC_DATA_MODE=mock
```

### Supabase

```env
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Después:

```bash
npm run dev
```

## Roadmap recomendado

1. ~~Ejecutar `sql/24_search_tickets_rpc.sql`~~ (completado — Admin Real 3B ya activo).
2. Endurecer campos sensibles y, si hace falta, mover lecturas delicadas a vistas/RPCs más acotadas.
3. Evaluar chats globales admin o detalles seguros más allá de moderación por flags.
4. Definir consecuencias configurables del score solo si siguen siendo admin-reviewed.
5. Conectar Stripe / pagos reales cuando la capa lógica actual esté estable.
6. Completar KPIs reales del dashboard admin donde todavía hay mezcla mock/parcial.
