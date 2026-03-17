fedzx.com CMS (Phase 1)

## Getting Started

1) Configure env

```bash
cp .env.example .env
```

2) Initialize DB + Prisma client

```bash
npm run db:migrate
npm run db:generate
```

3) Bootstrap the first admin (only when DB has no users)

```bash
curl -sS -X POST "http://localhost:3000/api/setup/bootstrap-admin" \
  -H "content-type: application/json" \
  -H "x-bootstrap-token: <BOOTSTRAP_TOKEN>" \
  -d '{"email":"admin@fedzx.com","password":"change-me-very-strong","name":"Admin"}'
```

4) Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000/admin/login`.

## Public JSON Endpoints (For Static Site)

- `GET /api/public/articles`
- `GET /api/public/articles/:slug`
- `GET /api/public/pages/:key` (e.g. `home`)
- `GET /api/public/recommendations?slot=home`
