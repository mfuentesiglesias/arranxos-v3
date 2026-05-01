# ARRANXOS — Instrucciones del proyecto

## 1. Qué es Arranxos

Arranxos es una PWA/frontend demo que conecta clientes con profesionales para trabajos y servicios.

El objetivo actual es validar el flujo completo como PWA antes de conectar backend real. La app debe funcionar bien en móvil, con experiencia instalable tipo app.

## 2. Stack actual

- Next.js 15
- React 18
- TypeScript strict
- Tailwind
- Zustand/localStorage para estado mock
- Playwright para smoke tests
- Deploy actual en Vercel
- Supabase todavía NO conectado en esta versión demo

## 3. Roles

### Cliente

Puede:

- registrarse libremente
- publicar trabajos
- invitar profesionales
- aceptar solicitudes
- negociar acuerdo
- pagar en flujo futuro
- confirmar trabajo
- abrir disputa
- valorar

### Profesional

Puede registrarse, pero entra como `pending`.

Mientras esté `pending`:

- no puede operar como profesional real
- no puede solicitar trabajos
- no debe saltarse restricciones

Cuando está `approved`:

- puede ver oportunidades
- puede solicitar trabajos
- puede chatear tras aceptación
- puede cobrar tras liberación futura

### Admin

Puede:

- aprobar/bloquear/verificar profesionales
- ver dashboard general
- gestionar usuarios, trabajos, solicitudes, chats, tickets, disputas y valoraciones
- gestionar catálogo
- revisar solicitudes de nuevas categorías/especialidades
- resolver disputas
- configurar reglas globales futuras

## 4. Reglas innegociables del producto

### Chat

El chat solo existe tras aceptación del cliente.

Antes de aceptación:

- no hay chat
- no hay contacto directo
- no se deben mostrar datos de contacto

### Ubicación

Antes de aceptación:

- solo ubicación aproximada
- nunca dirección exacta

Tras aceptación:

- la dirección exacta se revela solo al profesional aceptado

### Profesional pending

Un profesional pending no puede operar como profesional aprobado.

### Publicación de trabajo

Debe ser completa:

- categoría/servicio
- descripción
- ubicación aproximada
- rango orientativo
- mínimos de calidad

### Precio orientativo

El rango orientativo solo es referencia.

No es el precio final.

### Precio final

El precio final se pacta dentro de la app:

- Proponer presupuesto
- Contraoferta
- Aceptar
- Se crea acuerdo

### Pago protegido

En la versión futura con backend/pagos:

- cliente paga tras acuerdo
- dinero queda retenido
- se libera al completar o resolver disputa

### Comisión

Arranxos cobra comisión al profesional.

El cliente paga el importe pactado limpio.

Comisión base inicial: 9%, configurable en admin.

### Auto-liberación

Si el cliente no responde tras trabajo terminado, se auto-libera tras 5 días por defecto.

Debe ser configurable en admin.

### Disputas

Cliente y profesional pueden abrir disputa.

Admin puede resolver.

### Anti-fuga

El chat debe bloquear o marcar:

- teléfonos
- emails
- URLs
- WhatsApp/redes
- intentos de sacar el trabajo fuera

Debe existir sistema de strikes.

### Invitaciones

Límite estándar de invitaciones por trabajo: 10.

Debe ser configurable en admin.

## 5. Catálogo

El catálogo tiene dos capas:

### Catálogo seed

Viene de datos mock iniciales.

No se debe mutar directamente `categoryGroups`.

### Catálogo aprobado por admin

Admin puede aprobar nuevas categorías y especialidades.

Actualmente existe circuito demo/mock:

- profesional solicita nueva especialidad
- la solicitud se guarda en Zustand/localStorage
- admin la ve en `/admin/solicitudes-catalogo`
- admin puede crear nueva categoría
- admin puede aprobar, fusionar o rechazar
- si aprueba, se crea categoría/servicio activo
- profesional puede seleccionarlo
- cliente puede publicarlo

## 6. Tickets de búsqueda de profesionales

Los tickets de búsqueda de profesionales son distintos de las solicitudes de catálogo.

No mezclar:

- `SearchTicket`
- `CatalogRequest`

Casos importantes:

- `j30`: trabajo demo con ticket ya creado
- `j36`: trabajo demo que debe mostrar CTA para crear ticket de búsqueda

No romper `j30` ni `j36` salvo pedido explícito.

## 7. Mapa profesional

Actualmente el mapa profesional es demo/simulado.

Tiene:

- vista lista/mapa
- radio visual
- slider de radio
- pins clicables
- scroll a tarjeta
- etiquetas de coincidencia con especialidades

No es todavía MapLibre/PostGIS real.

## 8. Playwright

Hay smoke tests mínimos.

Comando:

```bash
npm run test:e2e