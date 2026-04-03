import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../db/client.js";

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (process.env.DELIVERY_API_KEY_REQUIRED === "false") {
    return next();
  }

  const rawKey = req.header("X-API-Key");
  if (!rawKey) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  prisma.apiKey
    .findUnique({ where: { keyHash } })
    .then((apiKey) => {
      if (!apiKey || apiKey.revokedAt) {
        res.status(403).json({ error: "Invalid or revoked API key" });
        return;
      }
      next();
    })
    .catch(next);
}
