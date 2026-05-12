import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClinicSubmission2026051200010
  implements MigrationInterface
{
  name = 'CreateClinicSubmission2026051200010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE clinic_submission_type AS ENUM ('new', 'supplement', 'correction');`,
    );
    await queryRunner.query(
      `CREATE TYPE clinic_submission_status AS ENUM ('pending_review', 'need_info', 'approved_new', 'merged', 'rejected');`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_submission (
        id BIGSERIAL PRIMARY KEY,
        submitter_user_id BIGINT NOT NULL,
        submission_type clinic_submission_type NOT NULL,
        clinic_id INTEGER,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(255),
        city VARCHAR(20),
        district VARCHAR(20),
        lat NUMERIC(10, 7),
        lng NUMERIC(10, 7),
        phone VARCHAR(20),
        business_hours VARCHAR(100),
        photos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        reason VARCHAR(500) NOT NULL,
        status clinic_submission_status NOT NULL DEFAULT 'pending_review',
        matched_clinic_id INTEGER,
        reviewed_by BIGINT,
        reviewed_at TIMESTAMP,
        review_note VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_clinic_submission_submitter_user FOREIGN KEY (submitter_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_submission_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE SET NULL,
        CONSTRAINT fk_clinic_submission_matched_clinic FOREIGN KEY (matched_clinic_id) REFERENCES clinic(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_submitter ON clinic_submission(submitter_user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_clinic ON clinic_submission(clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_matched_clinic ON clinic_submission(matched_clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_status_created_at ON clinic_submission(status, created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_city_status ON clinic_submission(city, status);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_city_status;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_status_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_matched_clinic;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_clinic;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_submitter;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_submission;`);
    await queryRunner.query(`DROP TYPE IF EXISTS clinic_submission_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS clinic_submission_type;`);
  }
}
