import dataSource from '../data-source';
import { TagEntity, TagLayer } from '../entities';

async function main() {
  await dataSource.initialize();

  try {
    const tagRepository = dataSource.getRepository(TagEntity);

    const layerStats = await tagRepository
      .createQueryBuilder('tag')
      .select('tag.layer', 'layer')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tag.layer')
      .orderBy('tag.layer', 'ASC')
      .getRawMany<{ layer: TagLayer; count: string }>();

    const visibleTagPreview = await tagRepository.find({
      where: { isDisplay: 1, status: 1 },
      order: { sortOrder: 'ASC' },
      take: 8,
    });

    console.log('Tag seed verification summary:');
    for (const row of layerStats) {
      console.log(`- ${row.layer}: ${row.count}`);
    }

    console.log('Visible tag preview:');
    for (const tag of visibleTagPreview) {
      console.log(`- [${tag.layer}] ${tag.name} (${tag.category})`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Failed to verify tag seed data.');
  console.error(error);
  process.exit(1);
});
