import { Router } from "express";
import { z } from "zod";
import * as deliveryService from "./delivery.service.js";

export const deliveryRouter = Router();

const uuidParam = z.object({ id: z.string().uuid() });

// GET /api/v1/delivery/datasets — list all published datasets
deliveryRouter.get("/datasets", async (_req, res, next) => {
  try {
    const datasets = await deliveryService.listPublishedDatasets();
    res.json(datasets);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/delivery/datasets/:id — published dataset metadata
deliveryRouter.get("/datasets/:id", async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const dataset = await deliveryService.getPublishedDataset(id);
    if (!dataset)
      return res
        .status(404)
        .json({ error: "Dataset not published or not found" });
    res.json(dataset);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/delivery/datasets/:id/entities — entities in published snapshot
deliveryRouter.get("/datasets/:id/entities", async (req, res, next) => {
  try {
    const { id } = uuidParam.parse(req.params);
    const result = await deliveryService.getPublishedEntities(id);
    if (!result)
      return res
        .status(404)
        .json({ error: "Dataset not published or not found" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
