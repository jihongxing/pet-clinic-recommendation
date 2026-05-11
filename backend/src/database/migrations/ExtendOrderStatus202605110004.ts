import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendOrderStatus2026051100004 implements MigrationInterface {
  name = 'ExtendOrderStatus2026051100004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN status DROP DEFAULT;`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "order" WHERE status::text = 'cancelled') THEN
          UPDATE "order" SET status = 'clicked' WHERE status::text = 'cancelled';
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE TYPE order_status_old AS ENUM ('clicked', 'confirmed');`,
    );
    await queryRunner.query(`
      ALTER TABLE "order"
      ALTER COLUMN status TYPE order_status_old
      USING status::text::order_status_old;
    `);
    await queryRunner.query(`DROP TYPE order_status;`);
    await queryRunner.query(
      `ALTER TYPE order_status_old RENAME TO order_status;`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN status SET DEFAULT 'clicked'::order_status;`,
    );
  }
}
