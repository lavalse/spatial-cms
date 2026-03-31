# Spatial CMS Viewer — Example Consumer App

A standalone demo application that consumes the Spatial CMS Delivery API.
Demonstrates how external developers would build applications on top of published spatial data.

## What This Is

This is **NOT** part of the CMS. It is an independent application that uses only the read-only Delivery API (`/api/v1/delivery/`). It demonstrates:

- Map visualization (Leaflet + GeoJSON)
- Search and filtering by properties
- Spatial browsing (map viewport query)
- Data analysis (type distribution, height statistics)
- Schema discovery

## How to Run

1. Start the CMS:
   ```bash
   cd /path/to/spatial-cms
   docker compose up -d
   npm run dev
   ```

2. Ensure data is published (run the seed script if needed):
   ```bash
   npx tsx scripts/seed-taito.ts
   ```

3. Open the viewer:
   ```bash
   # Option A: Use any static server
   cd examples/viewer
   npx serve .

   # Option B: Open directly in browser
   open examples/viewer/index.html
   ```

4. If the CMS is on a different host, edit the `CMS_URL` variable in `index.html`.

## API Endpoints Used

This viewer only uses these read-only endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /delivery/datasets` | Discover available datasets |
| `GET /delivery/datasets/:id/schema` | Understand data structure |
| `GET /delivery/datasets/:id/entities?page=&pageSize=` | Load entity data |

No authentication required. No write operations.

## Tech Stack

- Leaflet (map rendering)
- Vanilla HTML + JS (no build tools)
- Spatial CMS Delivery API (data source)
