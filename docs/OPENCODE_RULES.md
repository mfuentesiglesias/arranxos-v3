# OPENCODE RULES — Arranxos

## 1. Prioridad

Lee este archivo antes de tocar código.

Si el prompt actual contradice este documento, sigue el prompt actual.

El prompt actual define el alcance exacto del paso.

## 2. Supabase / SQL

No tocar Supabase salvo instrucción explícita.

No inventar SQL.

No crear migraciones.

No tocar RLS, RPC, tablas o policies salvo que el prompt lo pida claramente.

Si un cambio toca base de datos, avisar expresamente y explicar qué SQL haría falta.

## 3. Validaciones

Después de cada Build, ejecutar:

```bash
npm run typecheck
npm run build
npm run test:e2e