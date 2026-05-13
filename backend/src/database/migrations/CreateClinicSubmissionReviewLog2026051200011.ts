import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClinicSubmissionReviewLog2026051200011 implements MigrationInterface {
  name = 'CreateClinicSubmissionReviewLog2026051200011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE clinic_submission_review_action AS ENUM ('approved_new', 'merged', 'need_info', 'rejected');`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_submission_review_log (
        id BIGSERIAL PRIMARY KEY,
        submission_id BIGINT NOT NULL,
        reviewer_id BIGINT NOT NULL,
        action clinic_submission_review_action NOT NULL,
        before_status clinic_submission_status NOT NULL,
        after_status clinic_submission_status NOT NULL,
        note VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_clinic_submission_review_log_submission FOREIGN KEY (submission_id) REFERENCES clinic_submission(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_review_log_submission ON clinic_submission_review_log(submission_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_review_log_reviewer ON clinic_submission_review_log(reviewer_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_submission_review_log_created_at ON clinic_submission_review_log(created_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_review_log_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_review_log_reviewer;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_submission_review_log_submission;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS clinic_submission_review_log;`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS clinic_submission_review_action;`,
    );
  }
}
