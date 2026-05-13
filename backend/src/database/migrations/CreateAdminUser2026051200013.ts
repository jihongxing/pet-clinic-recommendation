import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUser2026051200013 implements MigrationInterface {
  name = 'CreateAdminUser2026051200013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE admin_user (
        id BIGSERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        status SMALLINT NOT NULL DEFAULT 1,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_admin_user_username UNIQUE (username)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_admin_user_status ON admin_user(status);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_admin_user_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_user;`);
  }
}
