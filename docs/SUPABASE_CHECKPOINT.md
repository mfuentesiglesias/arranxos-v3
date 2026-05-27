# Supabase Checkpoint

## Estado actual

Arranxos mantiene dos modos de datos:

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

### Sigue mock o parcial

- Stripe / pagos reales
- mapas / geospatial real
- emails reales
- realtime completo de chat
- cron/ejecución automática real de auto-release (1A solo deja preparada la RPC backend; scheduler aún no activo)
- listado global completo de chats admin más allá de moderación por flags
- automatismos de bloqueo por score o strikes
- ranking derivado del score
- visibilidad, límites o bloqueos automáticos por score
- dashboard admin con KPIs reales más completo

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
| Preparación cron auto-release 1A | Completado | `auto_release_due_jobs_cron()` lista para backend futuro; sin scheduler activo todavía. |
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
| `auto_release_due_jobs_cron` | `sql/20_auto_release_cron_rpc.sql` | Variante backend-only preparada para cron futuro; sin activación todavía. |
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

1. Activar scheduler real para `auto_release_due_jobs_cron()` solo si se decide el Build 1B.
2. Endurecer campos sensibles y, si hace falta, mover lecturas delicadas a vistas/RPCs más acotadas.
3. Evaluar chats globales admin o detalles seguros más allá de moderación por flags.
4. Definir consecuencias configurables del score solo si siguen siendo admin-reviewed.
5. Conectar Stripe / pagos reales cuando la capa lógica actual esté estable.
6. Completar KPIs reales del dashboard admin donde todavía hay mezcla mock/parcial.
