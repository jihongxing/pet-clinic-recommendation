import { MigrationInterface, QueryRunner } from 'typeorm';

import { CLINIC_SEED_DATA, CLINIC_SEED_NAMES } from '../seeds/clinic-seed.data';

export class SeedClinicDevelopmentData2026051100009 implements MigrationInterface {
  name = 'SeedClinicDevelopmentData2026051100009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const clinicParameters = CLINIC_SEED_DATA.flatMap((item) => [
      item.name,
      item.address,
      item.lat,
      item.lng,
      item.phone,
      item.wechat,
      item.businessHours,
      item.city,
      item.district,
      item.trustScore,
      item.valueScore,
      item.experienceScore,
      item.riskPenalty,
      item.socialScore,
      item.reputationScore,
      item.priceScore,
      item.confidenceFactor,
      item.isClaimed,
      item.status,
    ]);

    const clinicValues = CLINIC_SEED_DATA.map((_, index) => {
      const base = index * 19;

      return `($${base + 1}, $${base + 2}, $${base + 3}::numeric, $${base + 4}::numeric, ST_SetSRID(ST_MakePoint($${base + 4}::double precision, $${base + 3}::double precision), 4326)::geography, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}::numeric, $${base + 11}::numeric, $${base + 12}::numeric, $${base + 13}::numeric, $${base + 14}::numeric, $${base + 15}::numeric, $${base + 16}::numeric, $${base + 17}::numeric, $${base + 18}, $${base + 19})`;
    }).join(', ');

    await queryRunner.query(
      `
      INSERT INTO clinic (
        name,
        address,
        lat,
        lng,
        location,
        phone,
        wechat,
        business_hours,
        city,
        district,
        trust_score,
        value_score,
        experience_score,
        risk_penalty,
        social_score,
        reputation_score,
        price_score,
        confidence_factor,
        is_claimed,
        status
      ) VALUES ${clinicValues};
      `,
      clinicParameters,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM clinic WHERE name = ANY($1::varchar[]);`,
      [CLINIC_SEED_NAMES],
    );
  }
}
