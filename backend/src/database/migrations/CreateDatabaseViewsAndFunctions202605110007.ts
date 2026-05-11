import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDatabaseViewsAndFunctions2026051100007 implements MigrationInterface {
  name = 'CreateDatabaseViewsAndFunctions2026051100007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_clinic_detail AS
      SELECT
        c.*,
        COUNT(DISTINCT utl.user_id) AS total_users,
        COUNT(DISTINCT o.id) AS total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'confirmed' THEN o.id END) AS confirmed_orders
      FROM clinic AS c
      LEFT JOIN user_tag_log AS utl ON c.id = utl.clinic_id
      LEFT JOIN "order" AS o ON c.id = o.clinic_id
      WHERE c.status = 1
      GROUP BY c.id;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_distance(
        lat1 NUMERIC,
        lng1 NUMERIC,
        lat2 NUMERIC,
        lng2 NUMERIC
      ) RETURNS NUMERIC AS $$
      BEGIN
        RETURN ST_Distance(
          ST_MakePoint(lng1, lat1)::geography,
          ST_MakePoint(lng2, lat2)::geography
        );
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_nearby_clinics(
        user_lat NUMERIC,
        user_lng NUMERIC,
        radius_meters INTEGER DEFAULT 3000,
        sort_type VARCHAR DEFAULT 'reputation',
        result_limit INTEGER DEFAULT 50
      ) RETURNS TABLE (
        id INTEGER,
        name VARCHAR,
        address VARCHAR,
        lat NUMERIC,
        lng NUMERIC,
        distance NUMERIC,
        reputation_score NUMERIC,
        price_score NUMERIC
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          c.id,
          c.name,
          c.address,
          c.lat,
          c.lng,
          ST_Distance(
            c.location,
            ST_MakePoint(user_lng, user_lat)::geography
          ) AS distance,
          c.reputation_score,
          c.price_score
        FROM clinic AS c
        WHERE
          c.status = 1
          AND ST_DWithin(
            c.location,
            ST_MakePoint(user_lng, user_lat)::geography,
            radius_meters
          )
        ORDER BY
          CASE
            WHEN sort_type = 'reputation' THEN c.reputation_score
            WHEN sort_type = 'price' THEN c.price_score
            ELSE c.reputation_score
          END DESC,
          distance ASC
        LIMIT result_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS get_nearby_clinics(NUMERIC, NUMERIC, INTEGER, VARCHAR, INTEGER);`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS calculate_distance(NUMERIC, NUMERIC, NUMERIC, NUMERIC);`,
    );
    await queryRunner.query(`DROP VIEW IF EXISTS v_clinic_detail;`);
  }
}
