import { Router, Request } from "express";
import { z } from "zod";
import * as deliveryService from "./delivery.service.js";

export const ogcRouter = Router();

function baseUrl(req: Request) {
  return `${req.protocol}://${req.get("host")}/api/v1/ogc`;
}

// GET /api/v1/ogc/ — Landing page
ogcRouter.get("/", (req, res) => {
  const base = baseUrl(req);
  res.json({
    title: "Spatial CMS — OGC API",
    description:
      "OGC API - Features compliant access to published spatial datasets",
    links: [
      {
        rel: "self",
        href: `${base}/`,
        type: "application/json",
        title: "This document",
      },
      {
        rel: "conformance",
        href: `${base}/conformance`,
        type: "application/json",
        title: "Conformance classes",
      },
      {
        rel: "data",
        href: `${base}/collections`,
        type: "application/json",
        title: "Collections",
      },
    ],
  });
});

// GET /api/v1/ogc/conformance
ogcRouter.get("/conformance", (_req, res) => {
  res.json({
    conformsTo: [
      "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
      "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
    ],
  });
});

// GET /api/v1/ogc/collections
ogcRouter.get("/collections", async (req, res, next) => {
  try {
    const base = baseUrl(req);
    const datasets = await deliveryService.listPublishedDatasets();

    res.json({
      collections: datasets.map((d) => ({
        id: d.id,
        title: d.name,
        description: `${d.snapshot.entityCount} features, v${d.snapshot.version}`,
        links: [
          {
            rel: "self",
            href: `${base}/collections/${d.id}`,
            type: "application/json",
          },
          {
            rel: "items",
            href: `${base}/collections/${d.id}/items`,
            type: "application/geo+json",
          },
        ],
        extent: {
          spatial: { bbox: [[-180, -90, 180, 90]], crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
        },
      })),
      links: [
        { rel: "self", href: `${base}/collections`, type: "application/json" },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ogc/collections/:id
ogcRouter.get("/collections/:id", async (req, res, next) => {
  try {
    const base = baseUrl(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const dataset = await deliveryService.getPublishedDataset(id);
    if (!dataset)
      return res.status(404).json({ error: "Collection not found" });

    res.json({
      id: dataset.id,
      title: dataset.name,
      description: `${dataset.snapshot.entityCount} features, v${dataset.snapshot.version}`,
      links: [
        {
          rel: "self",
          href: `${base}/collections/${id}`,
          type: "application/json",
        },
        {
          rel: "items",
          href: `${base}/collections/${id}/items`,
          type: "application/geo+json",
        },
      ],
      extent: {
        spatial: { bbox: [[-180, -90, 180, 90]], crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ogc/collections/:id/schema
ogcRouter.get("/collections/:id/schema", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const schema = await deliveryService.getPublishedDatasetSchema(id);
    if (!schema)
      return res.status(404).json({ error: "Collection not found" });

    // OGC-style schema: list properties as JSON Schema-like format
    const properties: Record<string, object> = {};
    for (const model of schema.models as Array<{ key: string; fields: Array<{ key: string; label: string; fieldType: string; isRequired: boolean }> }>) {
      for (const f of model.fields) {
        const typeMap: Record<string, string> = { string: "string", number: "number", boolean: "boolean", date: "string", json: "object", enum_: "string", relation: "string" };
        properties[f.key] = {
          title: f.label,
          type: typeMap[f.fieldType] || "string",
          "x-ogc-role": f.isRequired ? "required" : "optional",
        };
      }
    }

    res.json({
      type: "object",
      title: schema.dataset,
      properties: {
        type: { type: "string", enum: ["Feature"] },
        geometry: { type: "object" },
        properties: { type: "object", properties },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ogc/collections/:id/items
ogcRouter.get("/collections/:id/items", async (req, res, next) => {
  try {
    const base = baseUrl(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const query = req.query;

    // OGC params → QueryOptions
    const limit = Math.min(Math.max(parseInt(String(query.limit)) || 10, 1), 1000);
    const offset = Math.max(parseInt(String(query.offset)) || 0, 0);
    const page = Math.floor(offset / limit) + 1;

    const options: Record<string, unknown> = {
      page,
      pageSize: limit,
      format: "geojson",
    };

    // bbox (OGC format: minLon,minLat,maxLon,maxLat — same as ours)
    if (query.bbox) {
      const parts = String(query.bbox).split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        options.bbox = parts;
      }
    }

    const result = await deliveryService.getPublishedEntities(id, options);
    if (!result)
      return res.status(404).json({ error: "Collection not found" });

    // OGC response wrapping
    const fc = result as {
      type: string;
      features: unknown[];
      metadata: { total: number; page: number; pageSize: number; totalPages: number };
    };

    const selfHref = `${base}/collections/${id}/items?limit=${limit}&offset=${offset}`;
    const links = [
      { rel: "self", href: selfHref, type: "application/geo+json" },
    ];
    if (offset + limit < fc.metadata.total) {
      links.push({
        rel: "next",
        href: `${base}/collections/${id}/items?limit=${limit}&offset=${offset + limit}`,
        type: "application/geo+json",
      });
    }
    if (offset > 0) {
      links.push({
        rel: "prev",
        href: `${base}/collections/${id}/items?limit=${limit}&offset=${Math.max(0, offset - limit)}`,
        type: "application/geo+json",
      });
    }

    res.json({
      type: "FeatureCollection",
      numberReturned: fc.features.length,
      numberMatched: fc.metadata.total,
      features: fc.features,
      links,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ogc/collections/:id/items/:featureId
ogcRouter.get(
  "/collections/:id/items/:featureId",
  async (req, res, next) => {
    try {
      const base = baseUrl(req);
      const collectionId = z.string().uuid().parse(req.params.id);
      const featureId = z.string().uuid().parse(req.params.featureId);
      const entity = await deliveryService.getPublishedEntity(
        collectionId,
        featureId,
      );
      if (!entity)
        return res
          .status(404)
          .json({ error: "Feature not found in this collection" });

      res.json({
        type: "Feature",
        id: entity.id,
        properties: {
          ...entity.properties,
          _type: entity.type,
          _version: entity.version,
        },
        geometry: entity.geometry,
        links: [
          {
            rel: "self",
            href: `${base}/collections/${collectionId}/items/${featureId}`,
            type: "application/geo+json",
          },
          {
            rel: "collection",
            href: `${base}/collections/${collectionId}`,
            type: "application/json",
          },
        ],
      });
    } catch (err) {
      next(err);
    }
  },
);
