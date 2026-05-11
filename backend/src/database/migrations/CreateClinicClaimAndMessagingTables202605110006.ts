import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClinicClaimAndMessagingTables2026051100006 implements MigrationInterface {
  name = 'CreateClinicClaimAndMessagingTables2026051100006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');`,
    );
    await queryRunner.query(
      `CREATE TYPE message_task_type AS ENUM ('order_followup');`,
    );
    await queryRunner.query(
      `CREATE TYPE message_task_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_account (
        id BIGSERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_clinic_account_username UNIQUE (username),
        CONSTRAINT uk_clinic_account_clinic UNIQUE (clinic_id),
        CONSTRAINT fk_clinic_account_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_clinic_account_status ON clinic_account(status);`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_claim_request (
        id BIGSERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        applicant_name VARCHAR(100) NOT NULL,
        applicant_phone VARCHAR(30) NOT NULL,
        proof_material TEXT,
        status claim_status NOT NULL DEFAULT 'pending',
        reviewed_by BIGINT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_clinic_claim_request_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_clinic_claim_request_clinic_status ON clinic_claim_request(clinic_id, status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_claim_request_created_at ON clinic_claim_request(created_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE message_task (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        clinic_id INTEGER NOT NULL,
        order_id BIGINT NOT NULL,
        task_type message_task_type NOT NULL,
        planned_at TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        status message_task_status NOT NULL DEFAULT 'pending',
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_message_task_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_message_task_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_message_task_order FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_message_task_order ON message_task(order_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_message_task_user ON message_task(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_message_task_status_planned_at ON message_task(status, planned_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_message_task_status_planned_at;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_message_task_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_message_task_order;`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_task;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_claim_request_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_claim_request_clinic_status;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_claim_request;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_account_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_account;`);

    await queryRunner.query(`DROP TYPE IF EXISTS message_task_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS message_task_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS claim_status;`);
  }
}
