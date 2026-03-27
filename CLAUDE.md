# Spatial CMS — Development Guide

## What is this?

Spatial data governance control plane (NOT a traditional CMS). Dual-kernel architecture:
- **Definition Kernel** — dynamic model/field/relation schema definitions
- **Governance Kernel** — proposal → approval → versioned entity → dataset snapshot → publish

Core invariant: **ALL data changes go through proposals. No direct entity writes.**

## Tech Stack

- Node.js + TypeScript + Express (backend API)
- PostgreSQL + PostGIS (database, Docker container on port 5434)
- Prisma ORM (geometry via `Unsupported` type + raw SQL)
- Directus (admin UI, Docker container on port 8055)
- Vanilla HTML + JS (frontend, served by Express)

## Quick Start

```bash
docker compose up -d          # PostGIS + Directus
npm run dev                   # Express on port 3001
```

## Project Structure

```
prisma/schema.prisma          # All 12 models, 12 enums
src/
  index.ts                    # Express app, route mounting, error handler
  db/client.ts                # Prisma singleton
  shared/
    geometry.ts               # PostGIS helpers (ST_AsGeoJSON, ST_GeomFromGeoJSON)
    validation.ts             # Zod schemas for API input
    dynamic-validation.ts     # Runtime validation against ModelDefinition fields
  modules/
    entity/                   # Entity read + internal create/update (used by proposal)
    proposal/                 # Create/approve/reject + auto-approval via governance
    dataset/                  # Dataset definitions + snapshot generation (dual-path)
    publication/              # Publish/rollback/hook
    ingestion/                # Bulk import + batch proposal creation
    definition/               # Model/field/relation/binding/governance CRUD
public/index.html             # Single-page admin UI (sidebar nav, hash router)
scripts/
  seed.ts                     # Sample data
  migrate-entity-types.ts     # One-time entity.type → modelDefinitionId migration
```

## Key Patterns

### Prisma + PostGIS
Geometry uses `Unsupported("geometry(Geometry, 4326)")` (nullable). All geometry reads/writes go through `src/shared/geometry.ts` via `$queryRaw`/`$executeRaw`. Entity model has a manually-created GiST index.

### Prisma Migrations with Directus
Directus creates its own tables in the same schema, causing Prisma drift detection. Use this workflow:
1. Write migration SQL manually in `prisma/migrations/<timestamp>_<name>/migration.sql`
2. Apply: `npx prisma db execute --schema prisma/schema.prisma --file <migration.sql>`
3. Mark: `npx prisma migrate resolve --applied <migration_name>`
4. Generate: `npx prisma generate`

### Entity.type vs Entity.modelDefinitionId
Both exist. `type` is a denormalized string (always = `modelDefinition.key`). `modelDefinitionId` is the FK. Legacy entities may have `type` without `modelDefinitionId`. All new entities get both.

### Dataset Snapshot Dual-Path
`generateSnapshot()` checks for `DatasetModelBinding` records first. If found, queries by `modelDefinitionId`. If not, falls back to the legacy `entityTypes` JSON array.

### Proposal Auto-Approval
When `GovernancePolicy.approvalMode = "auto"` exists for a model, `createProposal()` automatically calls `approveProposal()` after validation passes.

## API Endpoints

### Content
- `GET/POST /api/v1/entities` — list (supports `?type=` filter)
- `GET /api/v1/entities/:id` — detail with geometry

### Proposals
- `POST /api/v1/proposals` — create (actions: create/update/delete)
- `GET /api/v1/proposals` — list (supports `?status=` filter)
- `POST /api/v1/proposals/:id/approve` — approve (runs dynamic validation)
- `POST /api/v1/proposals/:id/reject`

### Definitions
- `CRUD /api/v1/definitions/models` — model definitions
- `CRUD /api/v1/definitions/models/:id/fields` — field definitions
- `GET /api/v1/definitions/models/:id/schema` — JSON schema for frontend
- `POST /api/v1/definitions/relations` — relation definitions
- `CRUD /api/v1/definitions/datasets/:id/bindings` — model-dataset bindings
- `CRUD /api/v1/definitions/governance/policies` — governance policies

### Datasets & Publishing
- `CRUD /api/v1/datasets` — dataset definitions
- `POST /api/v1/datasets/:id/snapshot` — generate snapshot
- `POST /api/v1/publications/publish` — publish snapshot
- `POST /api/v1/publications/rollback` — rollback

### Ingestion
- `POST /api/v1/ingestion/import` — bulk import (trusted sources)
- `POST /api/v1/ingestion/proposal-set` — batch proposal creation

## Ports

| Service | Port |
|---------|------|
| Express API + Frontend | 3001 |
| PostgreSQL + PostGIS | 5434 |
| Directus | 8055 |

## Credentials

- **Directus**: admin@example.com / admin
- **PostgreSQL**: spatial_cms / spatial_cms / spatial_cms (user/pass/db)
