import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtraReviewTags2026051100005 implements MigrationInterface {
  name = 'CreateExtraReviewTags2026051100005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE extra_tag_option (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        weight NUMERIC(3, 2) DEFAULT 0.3,
        sort_order INTEGER DEFAULT 0,
        status SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_extra_tag_option_name UNIQUE (name)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE review_extra_tag_log (
        review_id BIGINT NOT NULL,
        extra_tag_option_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (review_id, extra_tag_option_id),
        CONSTRAINT fk_review_extra_tag_log_review FOREIGN KEY (review_id) REFERENCES clinic_review(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_extra_tag_log_option FOREIGN KEY (extra_tag_option_id) REFERENCES extra_tag_option(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_review_extra_tag_log_option ON review_extra_tag_log(extra_tag_option_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_review_extra_tag_log_option;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS review_extra_tag_log;`);
    await queryRunner.query(`DROP TABLE IF EXISTS extra_tag_option;`);
  }
}
