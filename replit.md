# API Key Manager

Admin panel for creating and managing API keys that gate access to a number lookup service.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + shadcn/ui + TailwindCSS

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/api-keys.ts` — API keys table schema
- `artifacts/api-server/src/routes/keys.ts` — key management CRUD routes
- `artifacts/api-server/src/routes/lookup.ts` — number lookup proxy (`/api/lookup/:number`)
- `artifacts/api-server/src/routes/auth.ts` — admin login/logout/me routes
- `artifacts/api-server/src/middlewares/requireAuth.ts` — session auth middleware
- `artifacts/key-manager/src/pages/dashboard.tsx` — main admin dashboard
- `artifacts/key-manager/src/pages/login.tsx` — login page
- `render.yaml` — Render.com deployment config

## Architecture decisions

- Admin panel protected by express-session (username: kasak, password: rohan)
- Number lookup (`/api/lookup/:number`) protected by API key (Bearer token or ?api_key=)
- API keys stored as SHA-256 hashes — full key shown only once at creation
- Production: Express serves built frontend static files from `artifacts/key-manager/dist/public`
- Single Render web service serves both API and frontend

## Product

- Admin login with username/password
- Create unlimited API keys (name, owner ID, expiry days)
- Revoke / restore / delete keys
- Copy key prefix or lookup URL to clipboard
- Number lookup: `GET /api/lookup/:number?api_key=<key>` (proxies to upstream, strips credit fields)

## User preferences

- Language: Hinglish (Hindi + English mix)
- Admin credentials: username=kasak, password=rohan
- Lookup attribution: owner=@kihoerack, admin=@YeuIin

## Gotchas

- Run `pnpm --filter @workspace/db run push` after any schema change
- Run codegen after any OpenAPI spec change before touching frontend hooks
- `SESSION_SECRET` env var must be set in production (render.yaml auto-generates it)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
