import { MigrationInterface, QueryRunner } from 'typeorm';

import { CAPABILITY_SEED_DATA } from '../seeds/capability-seed.data';
import { CLINIC_CAPABILITY_SEED_DATA } from '../seeds/clinic-capability-seed.data';

export class AddClinicCapabilityModel2026051200015 implements MigrationInterface {
  name = 'AddClinicCapabilityModel2026051200015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE capability_profile_status AS ENUM ('empty', 'pending', 'verified');`,
    );
    await queryRunner.query(
      `CREATE TYPE capability_type AS ENUM ('service', 'specialty', 'equipment', 'facility', 'species_supported');`,
    );
    await queryRunner.query(
      `CREATE TYPE capability_source_type AS ENUM ('user_submission', 'admin_manual');`,
    );
    await queryRunner.query(
      `CREATE TYPE capability_verification_status AS ENUM ('pending', 'verified', 'rejected');`,
    );

    await queryRunner.query(`
      ALTER TABLE clinic
      ADD COLUMN summary VARCHAR(500),
      ADD COLUMN cover_photo_url VARCHAR(500),
      ADD COLUMN gallery_photos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN capability_profile_status capability_profile_status NOT NULL DEFAULT 'empty';
    `);

    await queryRunner.query(`
      CREATE TABLE capability_definition (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(50) NOT NULL,
        type capability_type NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active SMALLINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_capability_definition_code UNIQUE (code)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_capability_definition_type_active_sort ON capability_definition(type, is_active, sort_order);`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_capability (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        capability_id INTEGER NOT NULL,
        source_type capability_source_type NOT NULL,
        verification_status capability_verification_status NOT NULL,
        confidence_score NUMERIC(4, 2) NOT NULL DEFAULT 1,
        note VARCHAR(500),
        evidence_photos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        verified_at TIMESTAMP,
        verified_by BIGINT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_clinic_capability_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_capability_definition FOREIGN KEY (capability_id) REFERENCES capability_definition(id) ON DELETE CASCADE,
        CONSTRAINT uk_clinic_capability_clinic_capability UNIQUE (clinic_id, capability_id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_clinic_capability_clinic_status ON clinic_capability(clinic_id, verification_status, capability_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_capability_capability_status ON clinic_capability(capability_id, verification_status, clinic_id);`,
    );

    await queryRunner.query(`
      ALTER TABLE clinic_submission
      ADD COLUMN services_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN specialties_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN equipment_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN facilities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN species_supported_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN capability_notes VARCHAR(500);
    `);

    const capabilityParameters = CAPABILITY_SEED_DATA.flatMap((item) => [
      item.code,
      item.name,
      item.type,
      item.sortOrder,
      item.isActive,
    ]);
    const capabilityValues = CAPABILITY_SEED_DATA.map((_, index) => {
      const base = index * 5;

      return `($${base + 1}, $${base + 2}, $${base + 3}::capability_type, $${base + 4}, $${base + 5})`;
    }).join(', ');

    await queryRunner.query(
      `
        INSERT INTO capability_definition (code, name, type, sort_order, is_active)
        VALUES ${capabilityValues};
      `,
      capabilityParameters,
    );

    for (const item of CLINIC_CAPABILITY_SEED_DATA) {
      await queryRunner.query(
        `
          UPDATE clinic
          SET
            summary = $2,
            cover_photo_url = $3,
            gallery_photos_json = $4::jsonb,
            capability_profile_status = 'verified'
          WHERE name = $1;
        `,
        [
          item.clinicName,
          item.summary,
          item.coverPhotoUrl,
          JSON.stringify(item.galleryPhotos),
        ],
      );

      const capabilityCodes = [
        ...item.services,
        ...item.specialties,
        ...item.equipment,
        ...item.facilities,
        ...item.speciesSupported,
      ];

      for (const capabilityCode of capabilityCodes) {
        await queryRunner.query(
          `
            INSERT INTO clinic_capability (
              clinic_id,
              capability_id,
              source_type,
              verification_status,
              confidence_score,
              note,
              evidence_photos_json,
              verified_at,
              verified_by
            )
            SELECT
              c.id,
              cd.id,
              'admin_manual'::capability_source_type,
              'verified'::capability_verification_status,
              0.95,
              '初始化演示能力档案',
              '[]'::jsonb,
              CURRENT_TIMESTAMP,
              NULL
            FROM clinic AS c
            INNER JOIN capability_definition AS cd ON cd.code = $2
            WHERE c.name = $1
            ON CONFLICT (clinic_id, capability_id) DO NOTHING;
          `,
          [item.clinicName, capabilityCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM clinic_capability WHERE note = '初始化演示能力档案';`,
    );
    await queryRunner.query(
      `DELETE FROM capability_definition WHERE code = ANY($1::varchar[]);`,
      [CAPABILITY_SEED_DATA.map((item) => item.code)],
    );
    await queryRunner.query(
      `
      UPDATE clinic
      SET
        summary = NULL,
        cover_photo_url = NULL,
        gallery_photos_json = '[]'::jsonb,
        capability_profile_status = 'empty'
      WHERE name = ANY($1::varchar[]);
    `,
      [CLINIC_CAPABILITY_SEED_DATA.map((item) => item.clinicName)],
    );

    await queryRunner.query(`
      ALTER TABLE clinic_submission
      DROP COLUMN capability_notes,
      DROP COLUMN species_supported_json,
      DROP COLUMN facilities_json,
      DROP COLUMN equipment_json,
      DROP COLUMN specialties_json,
      DROP COLUMN services_json;
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_capability_capability_status;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_capability_clinic_status;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_capability;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_capability_definition_type_active_sort;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS capability_definition;`);

    await queryRunner.query(`
      ALTER TABLE clinic
      DROP COLUMN capability_profile_status,
      DROP COLUMN gallery_photos_json,
      DROP COLUMN cover_photo_url,
      DROP COLUMN summary;
    `);

    await queryRunner.query(
      `DROP TYPE IF EXISTS capability_verification_status;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS capability_source_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS capability_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS capability_profile_status;`);
  }
}
