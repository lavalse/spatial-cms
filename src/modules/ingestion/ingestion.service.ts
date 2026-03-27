import prisma from "../../db/client.js";
import { setEntityGeometry } from "../../shared/geometry.js";

interface ImportEntity {
  type: string;
  properties: Record<string, unknown>;
  geometry?: { type: string; coordinates: unknown };
}

interface ProposalSetItem {
  entityId?: string;
  proposedChange: {
    action: "create" | "update";
    data: {
      type?: string;
      properties?: Record<string, unknown>;
      geometry?: { type: string; coordinates: unknown };
      status?: "draft" | "active" | "archived";
    };
  };
}

/**
 * Bulk import: directly creates entities + versions.
 * Use for trusted data sources (e.g., initial data load).
 * Each entity gets a corresponding proposal record for auditability.
 */
export async function bulkImport(
  entities: ImportEntity[],
  source: "human" | "machine" | "import_" = "import_",
) {
  const results = [];

  for (const item of entities) {
    // Create entity
    const entity = await prisma.entity.create({
      data: {
        type: item.type,
        properties: item.properties,
        status: "active",
      },
    });

    // Set geometry if provided
    if (item.geometry) {
      await setEntityGeometry(entity.id, item.geometry);
    }

    // Create version
    await prisma.entityVersion.create({
      data: {
        entityId: entity.id,
        versionNumber: 1,
        snapshot: {
          type: item.type,
          properties: item.properties,
          geometry: item.geometry ?? null,
        },
      },
    });

    // Create audit proposal (already approved)
    await prisma.proposal.create({
      data: {
        entityId: entity.id,
        proposedChange: {
          action: "create",
          data: {
            type: item.type,
            properties: item.properties,
            geometry: item.geometry ?? null,
          },
        },
        source,
        status: "approved",
      },
    });

    results.push({ entityId: entity.id, type: item.type });
  }

  return { imported: results.length, entities: results };
}

/**
 * Bulk proposal creation: creates multiple proposals at once.
 * All proposals start as "pending" and require individual approval.
 */
export async function createProposalSet(
  proposals: ProposalSetItem[],
  source: "human" | "machine" | "import_" = "machine",
) {
  const created = await prisma.proposal.createManyAndReturn({
    data: proposals.map((p) => ({
      entityId: p.entityId,
      proposedChange: p.proposedChange as object,
      source,
      status: "pending" as const,
    })),
  });

  return { created: created.length, proposals: created };
}
