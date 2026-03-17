# fedzx.com Backoffice Architecture (Phased)

This repo will evolve an existing static site (https://fedzx.com) into an operable content platform.

## Current Website Reality (as of 2026-03-15)

- Static HTML landing page hosted on Alibaba OSS/CDN.
- Uses Tailwind via CDN (`https://cdn.tailwindcss.com`).
- Local assets: `css/styles.css`, `js/script.js`, `images/*`.
- Navigation is anchor-based sections (`#home`, `#services`, `#analysis`, `#assets`).

Implication: "Page modules" today are literally sections in a single HTML file. The backoffice must model these sections as structured modules so the frontend can be regenerated or rendered dynamically later.

## Goals By Phase

### Phase 1 (Now): Manual Operations

- Admin login.
- CRUD for:
  - Articles
  - Page modules (section-based content blocks)
  - Recommendations (featured items, links, article picks)
- Editorial workflow: `draft -> review -> published`.
- Auditability: who changed what and when.

### Phase 2 (Mid): Semi-Automation

- Import content from RSS / API into "ingestion inbox".
- AI-assisted draft generation (summaries, outlines, SEO fields), but:
  - Human review required before publish.
- Content quality gates: duplication checks, minimum metadata, source attribution.

### Phase 3 (Long): AI Ops

- Scheduled collection (RSS/API/crawlers).
- AI generates, self-checks, and proposes publishing.
- Automatic publishing with conservative guardrails:
  - confidence thresholds
  - rate limits
  - rollback capability
  - full audit trail

## Proposed Technical Architecture

### Components

1. `CMS Web` (Phase 1)
   - One deployable service containing:
     - Admin UI (web)
     - Admin API (server routes)
   - Responsibilities:
     - Auth (admin-only)
     - CRUD + workflow
     - Publish endpoints
     - Export endpoints for the static site (JSON)

2. `DB`
   - Dev: SQLite.
   - Prod: Postgres.
   - ORM: Prisma (easy migration).

3. `Worker` (Phase 2+)
   - Background jobs:
     - RSS/API import
     - AI draft generation
     - link checks / dedupe
   - Queue (optional at first): Redis + BullMQ.

4. `Static Site Integration` (Phase 1+)
   - Two supported integration modes:
     - Mode A (fastest): Static site fetches public JSON at runtime.
     - Mode B (more SEO/clean): Build pipeline pulls content from CMS and regenerates static HTML, then deploys to OSS.

### Data Model (High Level)

- `User` (admin)
- `Article`
  - `status`: draft/review/published
  - `slug`, `title`, `summary`, `body` (Markdown), `coverImage`, `tags`
  - `sourceUrl` (for imports), `aiMeta` (Phase 2+)
- `Page`
  - e.g. `home`
- `PageModule`
  - belongs to `Page`
  - `type` + `config` (JSON)
  - `order`, `status`
- `Recommendation`
  - can reference `Article` or external link
  - `slot` / `position`, `startAt`, `endAt`
- `AuditLog`
  - `actor`, `action`, `entity`, `diff`, timestamp

### Security & Ops Baselines

- Passwords hashed (Argon2/Bcrypt).
- Session via signed cookie (server-only secret).
- RBAC kept simple in Phase 1 (admin only), expandable later.
- Rate limit auth endpoints.
- All publish actions logged.

## What We Will Implement First

- A Next.js-based `CMS Web` app under `apps/cms`.
- Prisma + SQLite by default.
- Admin login + basic CRUD screens.
- Public read-only JSON endpoints for the static site to consume.

