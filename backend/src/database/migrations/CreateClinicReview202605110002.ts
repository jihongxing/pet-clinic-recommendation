import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClinicReview2026051100002 implements MigrationInterface {
  name = 'CreateClinicReview2026051100002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE review_source AS ENUM ('order', 'normal');`,
    );
    await queryRunner.query(
      `CREATE TYPE review_status AS ENUM ('submitted', 'hidden');`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_review (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        clinic_id INTEGER NOT NULL,
        order_id BIGINT,
        emotion emotion_type NOT NULL,
        source review_source NOT NULL DEFAULT 'normal',
        review_text VARCHAR(500),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status review_status NOT NULL DEFAULT 'submitted',
        CONSTRAINT uk_clinic_review_user_clinic UNIQUE (user_id, clinic_id),
        CONSTRAINT fk_clinic_review_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_review_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_review_order FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_clinic_review_clinic ON clinic_review(clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_review_order ON clinic_review(order_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_review_status ON clinic_review(status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_review_submitted_at ON clinic_review(submitted_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_review_submitted_at;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_review_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_review_order;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_review_clinic;`);
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_review;`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_source;`);
  }
}
