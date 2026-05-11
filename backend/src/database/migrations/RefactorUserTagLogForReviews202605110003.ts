import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorUserTagLogForReviews2026051100003 implements MigrationInterface {
  name = 'RefactorUserTagLogForReviews2026051100003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE user_tag_log ADD COLUMN review_id BIGINT;`,
    );

    await queryRunner.query(`
      INSERT INTO clinic_review (
        user_id,
        clinic_id,
        emotion,
        source,
        submitted_at,
        status
      )
      SELECT
        log_group.user_id,
        log_group.clinic_id,
        COALESCE(latest_log.emotion, 'neutral') AS emotion,
        CASE
          WHEN BOOL_OR(log_group.source = 'order') THEN 'order'::review_source
          ELSE 'normal'::review_source
        END AS source,
        MIN(log_group.created_at) AS submitted_at,
        'submitted'::review_status AS status
      FROM user_tag_log AS log_group
      LEFT JOIN LATERAL (
        SELECT emotion
        FROM user_tag_log AS latest_log
        WHERE latest_log.user_id = log_group.user_id
          AND latest_log.clinic_id = log_group.clinic_id
          AND latest_log.emotion IS NOT NULL
        ORDER BY latest_log.created_at DESC NULLS LAST, latest_log.id DESC
        LIMIT 1
      ) AS latest_log ON TRUE
      GROUP BY log_group.user_id, log_group.clinic_id, latest_log.emotion
      ON CONFLICT (user_id, clinic_id) DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE user_tag_log AS utl
      SET review_id = cr.id
      FROM clinic_review AS cr
      WHERE cr.user_id = utl.user_id
        AND cr.clinic_id = utl.clinic_id;
    `);

    await queryRunner.query(
      `ALTER TABLE user_tag_log ALTER COLUMN review_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE user_tag_log ADD CONSTRAINT fk_user_tag_log_review FOREIGN KEY (review_id) REFERENCES clinic_review(id) ON DELETE CASCADE;`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_tag_log_review ON user_tag_log(review_id);`,
    );
    await queryRunner.query(
      `ALTER TABLE user_tag_log DROP CONSTRAINT uk_user_tag_log;`,
    );
    await queryRunner.query(
      `ALTER TABLE user_tag_log ADD CONSTRAINT uk_user_tag_log_review_tag UNIQUE (review_id, tag_id);`,
    );
    await queryRunner.query(`ALTER TABLE user_tag_log DROP COLUMN emotion;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE user_tag_log ADD COLUMN emotion emotion_type;`,
    );
    await queryRunner.query(`
      UPDATE user_tag_log AS utl
      SET emotion = cr.emotion
      FROM clinic_review AS cr
      WHERE cr.id = utl.review_id;
    `);
    await queryRunner.query(
      `ALTER TABLE user_tag_log DROP CONSTRAINT uk_user_tag_log_review_tag;`,
    );
    await queryRunner.query(
      `ALTER TABLE user_tag_log ADD CONSTRAINT uk_user_tag_log UNIQUE (user_id, clinic_id, tag_id);`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_tag_log_review;`);
    await queryRunner.query(
      `ALTER TABLE user_tag_log DROP CONSTRAINT fk_user_tag_log_review;`,
    );
    await queryRunner.query(`ALTER TABLE user_tag_log DROP COLUMN review_id;`);
  }
}
