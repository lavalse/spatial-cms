import crypto from "crypto";
import prisma from "../../db/client.js";

export async function generateKey(name: string) {
  const rawKey = "scms_" + crypto.randomBytes(16).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 13); // "scms_" + 8 hex

  const apiKey = await prisma.apiKey.create({
    data: { name, keyHash, keyPrefix },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey, // shown only once
    keyPrefix: apiKey.keyPrefix,
    createdAt: apiKey.createdAt,
  };
}

export async function listKeys() {
  return prisma.apiKey.findMany({
    select: { id: true, name: true, keyPrefix: true, revokedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeKey(id: string) {
  return prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export function isRequired(): boolean {
  return process.env.DELIVERY_API_KEY_REQUIRED !== "false";
}
