import dataSource from '../data-source';
import { CapabilityDefinitionEntity } from '../entities';

async function main() {
  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(CapabilityDefinitionEntity);
    const totalCount = await repository.count();
    const typeStats = await repository
      .createQueryBuilder('capability')
      .select('capability.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('capability.type')
      .orderBy('capability.type', 'ASC')
      .getRawMany<{ type: string; count: string }>();

    console.log(`Capability seed verification summary: total=${totalCount}`);
    for (const row of typeStats) {
      console.log(`- ${row.type}: ${row.count}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Failed to verify capability seed data.');
  console.error(error);
  process.exit(1);
});
