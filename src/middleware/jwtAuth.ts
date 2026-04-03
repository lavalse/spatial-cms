import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Cache Keycloak public key (JWKS)
let cachedKeys: Record<string, crypto.KeyObject> = {};
let keysLastFetched = 0;

const KEYCLOAK_URL = () => process.env.KEYCLOAK_URL || "http://localhost:8180";
const KEYCLOAK_REALM = () => process.env.KEYCLOAK_REALM || "spatial-cms";

async function getPublicKey(kid: string): Promise<crypto.KeyObject | null> {
  const now = Date.now();
  // Refresh keys every 5 minutes
  if (now - keysLastFetched > 300000 || !cachedKeys[kid]) {
    try {
      const url = `${KEYCLOAK_URL()}/realms/${KEYCLOAK_REALM()}/protocol/openid-connect/certs`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const jwks = await res.json();
      cachedKeys = {};
      for (const key of jwks.keys) {
        if (key.kty === "RSA" && key.use === "sig") {
          const pubKey = crypto.createPublicKey({
            key: {
              kty: key.kty,
              n: key.n,
              e: key.e,
            },
            format: "jwk",
          });
          cachedKeys[key.kid] = pubKey;
        }
      }
      keysLastFetched = now;
    } catch {
      return null;
    }
  }
  return cachedKeys[kid] || null;
}

function decodeJwtHeader(token: string): { kid?: string; alg?: string } | null {
  try {
    const header = token.split(".")[0];
    return JSON.parse(Buffer.from(header, "base64url").toString());
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  const header = decodeJwtHeader(token);
  if (!header?.kid) return null;

  const publicKey = await getPublicKey(header.kid);
  if (!publicKey) return null;

  // Verify signature
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  const data = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(signatureB64, "base64url");

  const isValid = crypto.verify(
    header.alg === "RS256" ? "SHA256" : "SHA384",
    Buffer.from(data),
    publicKey,
    signature,
  );
  if (!isValid) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Check expiry
  const exp = payload.exp as number;
  if (exp && exp < Date.now() / 1000) return null;

  return payload;
}

/** Extract roles from Keycloak JWT */
function getRoles(payload: Record<string, unknown>): string[] {
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  return realmAccess?.roles || [];
}

/** Map Keycloak role to scope level */
const ROLE_TO_SCOPE: Record<string, string> = {
  admin: "admin",
  reviewer: "manage",
  editor: "manage",
  viewer: "delivery",
};

export function getJwtScope(roles: string[]): string {
  // Return highest scope from roles
  if (roles.includes("admin")) return "admin";
  if (roles.includes("reviewer") || roles.includes("editor")) return "manage";
  if (roles.includes("viewer")) return "delivery";
  return "delivery";
}

export async function extractJwtAuth(
  req: Request,
): Promise<{ scope: string; roles: string[]; user: string } | null> {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.substring(7);
  const payload = await verifyJwt(token);
  if (!payload) return null;

  const roles = getRoles(payload);
  const scope = getJwtScope(roles);
  const user = (payload.preferred_username as string) || "unknown";

  return { scope, roles, user };
}
