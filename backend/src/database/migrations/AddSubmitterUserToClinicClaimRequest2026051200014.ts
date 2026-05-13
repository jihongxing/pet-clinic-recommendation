import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmitterUserToClinicClaimRequest2026051200014 implements MigrationInterface {
  name = 'AddSubmitterUserToClinicClaimRequest2026051200014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clinic_claim_request
      ADD COLUMN submitter_user_id BIGINT;
    `);
    await queryRunner.query(`
      ALTER TABLE clinic_claim_request
      ADD CONSTRAINT fk_clinic_claim_request_submitter_user
      FOREIGN KEY (submitter_user_id) REFERENCES "user"(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX idx_clinic_claim_request_submitter_user
      ON clinic_claim_request(submitter_user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_clinic_claim_request_submitter_user;
    `);
    await queryRunner.query(`
      ALTER TABLE clinic_claim_request
      DROP CONSTRAINT IF EXISTS fk_clinic_claim_request_submitter_user;
    `);
    await queryRunner.query(`
      ALTER TABLE clinic_claim_request
      DROP COLUMN IF EXISTS submitter_user_id;
    `);
  }
}
