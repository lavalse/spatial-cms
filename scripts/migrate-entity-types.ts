import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating entity types to model definitions...");

  // Get all distinct entity types
  const types = await prisma.entity.findMany({
    select: { type: true },
    distinct: ["type"],
  });

  for (const { type } of types) {
    // Check if ModelDefinition already exists
    let model = await prisma.modelDefinition.findUnique({
      where: { key: type },
    });

    if (!model) {
      model = await prisma.modelDefinition.create({
        data: {
          key: type,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          geometryType: "MIXED",
        },
      });
      console.log(`  Created ModelDefinition: ${model.key} (${model.id})`);
    } else {
      console.log(`  ModelDefinition already exists: ${model.key} (${model.id})`);
    }

    // Update entities with this type to set modelDefinitionId
    const result = await prisma.entity.updateMany({
      where: { type, modelDefinitionId: null },
      data: { modelDefinitionId: model.id },
    });
    console.log(`  Updated ${result.count} entities of type "${type}"`);
  }

  console.log("\nMigration complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
