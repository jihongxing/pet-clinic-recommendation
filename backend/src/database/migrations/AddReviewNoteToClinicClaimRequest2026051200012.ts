import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewNoteToClinicClaimRequest2026051200012 implements MigrationInterface {
  name = 'AddReviewNoteToClinicClaimRequest2026051200012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clinic_claim_request
      ADD COLUMN review_note VARCHAR(500);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clinic_claim_request
      DROP COLUMN IF EXISTS review_note;
    `);
  }
}
