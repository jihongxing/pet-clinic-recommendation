import dataSource from '../data-source';
import { ClinicEntity } from '../entities';

async function main() {
  await dataSource.initialize();

  try {
    const clinicRepository = dataSource.getRepository(ClinicEntity);

    const totalCount = await clinicRepository.count();
    const districtStats = await clinicRepository
      .createQueryBuilder('clinic')
      .select('clinic.district', 'district')
      .addSelect('COUNT(*)', 'count')
      .groupBy('clinic.district')
      .orderBy('clinic.district', 'ASC')
      .getRawMany<{ district: string; count: string }>();

    const clinicPreview = await clinicRepository.find({
      order: { reputationScore: 'DESC', id: 'ASC' },
      take: 5,
    });

    console.log(`Clinic seed verification summary: total=${totalCount}`);
    for (const row of districtStats) {
      console.log(`- ${row.district}: ${row.count}`);
    }

    console.log('Clinic preview:');
    for (const clinic of clinicPreview) {
      console.log(
        `- ${clinic.name} | ${clinic.district} | reputation=${clinic.reputationScore}`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Failed to verify clinic seed data.');
  console.error(error);
  process.exit(1);
});
