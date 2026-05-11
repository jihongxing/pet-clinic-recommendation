import { MigrationInterface, QueryRunner } from 'typeorm';

import {
  EXTRA_TAG_OPTION_SEED_DATA,
  EXTRA_TAG_OPTION_SEED_NAMES,
  TAG_SEED_DATA,
  TAG_SEED_NAMES,
} from '../seeds/tag-seed.data';

export class SeedInitialReferenceData2026051100008 implements MigrationInterface {
  name = 'SeedInitialReferenceData2026051100008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tagParameters = TAG_SEED_DATA.flatMap((item) => [
      item.name,
      item.layer,
      item.category,
      item.type,
      item.weight,
      item.sortOrder,
      item.isUserSelect,
      item.isDisplay,
      item.status,
    ]);

    const tagValues = TAG_SEED_DATA.map((_, index) => {
      const base = index * 9;

      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    }).join(', ');

    await queryRunner.query(
      `
      INSERT INTO tag (
        name,
        layer,
        category,
        type,
        weight,
        sort_order,
        is_user_select,
        is_display,
        status
      ) VALUES ${tagValues};
      `,
      tagParameters,
    );

    const extraTagParameters = EXTRA_TAG_OPTION_SEED_DATA.flatMap((item) => [
      item.name,
      item.weight,
      item.sortOrder,
      item.status,
    ]);

    const extraTagValues = EXTRA_TAG_OPTION_SEED_DATA.map((_, index) => {
      const base = index * 4;

      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    }).join(', ');

    await queryRunner.query(
      `
      INSERT INTO extra_tag_option (
        name,
        weight,
        sort_order,
        status
      ) VALUES ${extraTagValues};
      `,
      extraTagParameters,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM review_extra_tag_log
      WHERE extra_tag_option_id IN (
        SELECT id FROM extra_tag_option WHERE name = ANY($1::varchar[])
      );
      `,
      [EXTRA_TAG_OPTION_SEED_NAMES],
    );
    await queryRunner.query(
      `DELETE FROM extra_tag_option WHERE name = ANY($1::varchar[]);`,
      [EXTRA_TAG_OPTION_SEED_NAMES],
    );
    await queryRunner.query(
      `DELETE FROM tag WHERE name = ANY($1::varchar[]);`,
      [TAG_SEED_NAMES],
    );
  }
}
