import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreSchema2026051100001 implements MigrationInterface {
  name = 'CreateCoreSchema2026051100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(
      `CREATE TYPE tag_layer AS ENUM ('L1', 'L2', 'L3', 'L4');`,
    );
    await queryRunner.query(
      `CREATE TYPE tag_type AS ENUM ('positive', 'negative');`,
    );
    await queryRunner.query(
      `CREATE TYPE tag_source AS ENUM ('order', 'normal', 'system');`,
    );
    await queryRunner.query(
      `CREATE TYPE emotion_type AS ENUM ('satisfied', 'neutral', 'unsatisfied');`,
    );
    await queryRunner.query(
      `CREATE TYPE tag_status AS ENUM ('new', 'verified', 'stable', 'expired');`,
    );
    await queryRunner.query(
      `CREATE TYPE order_status AS ENUM ('clicked', 'confirmed');`,
    );
    await queryRunner.query(
      `CREATE TYPE contact_type AS ENUM ('phone', 'wechat');`,
    );
    await queryRunner.query(
      `CREATE TYPE response_status AS ENUM ('pending', 'approved', 'rejected');`,
    );
    await queryRunner.query(
      `CREATE TYPE abnormal_status AS ENUM ('pending', 'confirmed', 'ignored');`,
    );

    await queryRunner.query(`
      CREATE TABLE "user" (
        id BIGSERIAL PRIMARY KEY,
        openid VARCHAR(100) NOT NULL,
        nickname VARCHAR(100),
        avatar VARCHAR(255),
        city VARCHAR(20),
        status SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        CONSTRAINT uk_user_openid UNIQUE (openid)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_user_city ON "user"(city);`);
    await queryRunner.query(
      `CREATE INDEX idx_user_created_at ON "user"(created_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(255) NOT NULL,
        lat NUMERIC(10, 7) NOT NULL,
        lng NUMERIC(10, 7) NOT NULL,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        phone VARCHAR(20),
        wechat VARCHAR(50),
        business_hours VARCHAR(100),
        city VARCHAR(20) NOT NULL,
        district VARCHAR(20),
        trust_score NUMERIC(10, 2) DEFAULT 0,
        value_score NUMERIC(10, 2) DEFAULT 0,
        experience_score NUMERIC(10, 2) DEFAULT 0,
        risk_penalty NUMERIC(10, 2) DEFAULT 0,
        social_score NUMERIC(10, 2) DEFAULT 0,
        reputation_score NUMERIC(10, 2) DEFAULT 0,
        price_score NUMERIC(10, 2) DEFAULT 0,
        confidence_factor NUMERIC(3, 2) DEFAULT 0,
        is_claimed SMALLINT DEFAULT 0,
        expire_at TIMESTAMP,
        status SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_clinic_location ON clinic USING GIST(location);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_city_status ON clinic(city, status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_reputation_score ON clinic(reputation_score);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_price_score ON clinic(price_score);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_lat_lng ON clinic(lat, lng);`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trigger_clinic_updated_at
      BEFORE UPDATE ON clinic
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TABLE tag (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        layer tag_layer NOT NULL,
        category VARCHAR(20) NOT NULL,
        type tag_type DEFAULT 'positive',
        weight NUMERIC(3, 2) DEFAULT 1.0,
        sort_order INTEGER DEFAULT 0,
        is_user_select SMALLINT DEFAULT 1,
        is_display SMALLINT DEFAULT 1,
        status SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_tag_name UNIQUE (name)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_tag_layer_category ON tag(layer, category);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tag_is_user_select ON tag(is_user_select);`,
    );

    await queryRunner.query(`
      CREATE TABLE user_tag_log (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        clinic_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        source tag_source DEFAULT 'normal',
        emotion emotion_type,
        weight NUMERIC(3, 2) DEFAULT 1.0,
        user_weight NUMERIC(3, 2) DEFAULT 1.0,
        final_weight NUMERIC(3, 2) GENERATED ALWAYS AS (weight * user_weight) STORED,
        device_id VARCHAR(100),
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_user_tag_log UNIQUE (user_id, clinic_id, tag_id),
        CONSTRAINT fk_user_tag_log_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_tag_log_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_tag_log_tag FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_user_tag_log_clinic ON user_tag_log(clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_tag_log_user_clinic ON user_tag_log(user_id, clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_tag_log_tag ON user_tag_log(tag_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_tag_log_created_at ON user_tag_log(created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_tag_log_source ON user_tag_log(source);`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_tag_stat (
        clinic_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        count NUMERIC(10, 2) DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        first_tagged_at TIMESTAMP,
        last_tagged_at TIMESTAMP,
        status tag_status DEFAULT 'new',
        display_weight NUMERIC(3, 2) DEFAULT 1.0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (clinic_id, tag_id),
        CONSTRAINT fk_clinic_tag_stat_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_tag_stat_tag FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_clinic_tag_stat_tag ON clinic_tag_stat(tag_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_tag_stat_status ON clinic_tag_stat(status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_tag_stat_count ON clinic_tag_stat(count);`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trigger_clinic_tag_stat_updated_at
      BEFORE UPDATE ON clinic_tag_stat
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TABLE "order" (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        clinic_id INTEGER NOT NULL,
        status order_status DEFAULT 'clicked',
        contact_type contact_type NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP,
        CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_order_user ON "order"(user_id);`);
    await queryRunner.query(
      `CREATE INDEX idx_order_clinic ON "order"(clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_status_created ON "order"(status, created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_created_at ON "order"(created_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE tag_lifecycle_log (
        id BIGSERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        old_status VARCHAR(20),
        new_status VARCHAR(20) NOT NULL,
        trigger_reason VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tag_lifecycle_log_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_tag_lifecycle_log_tag FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_tag_lifecycle_log_clinic_tag ON tag_lifecycle_log(clinic_id, tag_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tag_lifecycle_log_created_at ON tag_lifecycle_log(created_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE user_referral (
        id BIGSERIAL PRIMARY KEY,
        referrer_user_id BIGINT NOT NULL,
        referee_user_id BIGINT NOT NULL,
        clinic_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_user_referral UNIQUE (referrer_user_id, referee_user_id, clinic_id),
        CONSTRAINT fk_user_referral_referrer FOREIGN KEY (referrer_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_referral_referee FOREIGN KEY (referee_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_referral_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_user_referral_referrer ON user_referral(referrer_user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_referral_clinic ON user_referral(clinic_id);`,
    );

    await queryRunner.query(`
      CREATE TABLE clinic_tag_response (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        response_text TEXT NOT NULL,
        status response_status DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP,
        approved_by BIGINT,
        CONSTRAINT uk_clinic_tag_response UNIQUE (clinic_id, tag_id),
        CONSTRAINT fk_clinic_tag_response_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_tag_response_tag FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_clinic_tag_response_clinic ON clinic_tag_response(clinic_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_tag_response_status ON clinic_tag_response(status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_clinic_tag_response_created ON clinic_tag_response(created_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE abnormal_behavior (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        clinic_id INTEGER,
        behavior_type VARCHAR(50) NOT NULL,
        device_id VARCHAR(100),
        ip_address VARCHAR(50),
        details JSONB,
        status abnormal_status DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_abnormal_behavior_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_abnormal_behavior_user ON abnormal_behavior(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_abnormal_behavior_status ON abnormal_behavior(status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_abnormal_behavior_created_at ON abnormal_behavior(created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_abnormal_behavior_details ON abnormal_behavior USING GIN(details);`,
    );

    await queryRunner.query(`
      CREATE TABLE order_confirmation (
        id BIGSERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        clinic_id INTEGER NOT NULL,
        visited BOOLEAN NOT NULL,
        confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_order_confirmation UNIQUE (order_id),
        CONSTRAINT fk_order_confirmation_order FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_confirmation_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_confirmation_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_order_confirmation_order ON order_confirmation(order_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_confirmation_user ON order_confirmation(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_confirmation_clinic ON order_confirmation(clinic_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_order_confirmation_clinic;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_order_confirmation_user;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_order_confirmation_order;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS order_confirmation;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_abnormal_behavior_details;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_abnormal_behavior_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_abnormal_behavior_status;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_abnormal_behavior_user;`);
    await queryRunner.query(`DROP TABLE IF EXISTS abnormal_behavior;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_tag_response_created;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_tag_response_status;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_tag_response_clinic;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_tag_response;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_referral_clinic;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_referral_referrer;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_referral;`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tag_lifecycle_log_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tag_lifecycle_log_clinic_tag;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS tag_lifecycle_log;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_order_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_order_status_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_order_clinic;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_order_user;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order";`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_clinic_tag_stat_updated_at ON clinic_tag_stat;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_tag_stat_count;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_tag_stat_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_tag_stat_tag;`);
    await queryRunner.query(`DROP TABLE IF EXISTS clinic_tag_stat;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_tag_log_source;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_user_tag_log_created_at;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_tag_log_tag;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_user_tag_log_user_clinic;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_tag_log_clinic;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_tag_log;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_tag_is_user_select;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tag_layer_category;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tag;`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_clinic_updated_at ON clinic;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_lat_lng;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_price_score;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_clinic_reputation_score;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_city_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clinic_location;`);
    await queryRunner.query(`DROP TABLE IF EXISTS clinic;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_city;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user";`);

    await queryRunner.query(`DROP TYPE IF EXISTS abnormal_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS response_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS contact_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS tag_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS emotion_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS tag_source;`);
    await queryRunner.query(`DROP TYPE IF EXISTS tag_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS tag_layer;`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_updated_at_column;`,
    );
  }
}
