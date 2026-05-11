-- ============================================
-- 宠物诊所口碑推荐小程序 - 数据库初始化脚本
-- 数据库: PostgreSQL 15+
-- 版本: v1.2
-- 日期: 2024
-- ============================================

-- 创建数据库（需要以 postgres 用户执行）
-- CREATE DATABASE pet_clinic_recommendation WITH ENCODING 'UTF8' LC_COLLATE='zh_CN.UTF-8' LC_CTYPE='zh_CN.UTF-8';

-- 连接到数据库
\c pet_clinic_recommendation;

-- 启用 PostGIS 扩展（地理位置查询）
CREATE EXTENSION IF NOT EXISTS postgis;

-- 启用 UUID 扩展（可选）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 用户表
-- ============================================
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

-- 创建索引
CREATE INDEX idx_user_city ON "user"(city);
CREATE INDEX idx_user_created_at ON "user"(created_at);

-- 添加注释
COMMENT ON TABLE "user" IS '用户表';
COMMENT ON COLUMN "user".id IS '用户ID';
COMMENT ON COLUMN "user".openid IS '微信openid';
COMMENT ON COLUMN "user".nickname IS '昵称';
COMMENT ON COLUMN "user".avatar IS '头像URL';
COMMENT ON COLUMN "user".city IS '城市';
COMMENT ON COLUMN "user".status IS '状态：1正常 0禁用';
COMMENT ON COLUMN "user".created_at IS '创建时间';
COMMENT ON COLUMN "user".last_login_at IS '最后登录时间';

-- ============================================
-- 2. 诊所表
-- ============================================
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
  
  -- 分数字段（预计算）
  trust_score NUMERIC(10, 2) DEFAULT 0,
  value_score NUMERIC(10, 2) DEFAULT 0,
  experience_score NUMERIC(10, 2) DEFAULT 0,
  risk_penalty NUMERIC(10, 2) DEFAULT 0,
  social_score NUMERIC(10, 2) DEFAULT 0,
  reputation_score NUMERIC(10, 2) DEFAULT 0,
  price_score NUMERIC(10, 2) DEFAULT 0,
  confidence_factor NUMERIC(3, 2) DEFAULT 0,
  
  -- 认领相关
  is_claimed SMALLINT DEFAULT 0,
  expire_at TIMESTAMP,
  
  -- 状态
  status SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建空间索引（GIST）
CREATE INDEX idx_clinic_location ON clinic USING GIST(location);

-- 创建普通索引
CREATE INDEX idx_clinic_city_status ON clinic(city, status);
CREATE INDEX idx_clinic_reputation_score ON clinic(reputation_score);
CREATE INDEX idx_clinic_price_score ON clinic(price_score);
CREATE INDEX idx_clinic_lat_lng ON clinic(lat, lng);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clinic_updated_at
BEFORE UPDATE ON clinic
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE clinic IS '诊所表';
COMMENT ON COLUMN clinic.id IS '诊所ID';
COMMENT ON COLUMN clinic.name IS '诊所名称';
COMMENT ON COLUMN clinic.address IS '详细地址';
COMMENT ON COLUMN clinic.lat IS '纬度';
COMMENT ON COLUMN clinic.lng IS '经度';
COMMENT ON COLUMN clinic.location IS '地理位置（PostGIS）';
COMMENT ON COLUMN clinic.trust_score IS '信任分数（L1-Trust）';
COMMENT ON COLUMN clinic.value_score IS '性价比分数（L1-Value）';
COMMENT ON COLUMN clinic.experience_score IS '体验分数（L1-Experience）';
COMMENT ON COLUMN clinic.risk_penalty IS '风险惩罚分数（L3）';
COMMENT ON COLUMN clinic.social_score IS '社交证明分数（L4）';
COMMENT ON COLUMN clinic.reputation_score IS '综合口碑分数';
COMMENT ON COLUMN clinic.price_score IS '综合性价比分数';
COMMENT ON COLUMN clinic.confidence_factor IS '置信度系数';
COMMENT ON COLUMN clinic.is_claimed IS '是否已认领：1是 0否';
COMMENT ON COLUMN clinic.status IS '状态：1正常 0下架';

-- ============================================
-- 3. 标签表（四层结构）
-- ============================================
-- 创建枚举类型
CREATE TYPE tag_layer AS ENUM ('L1', 'L2', 'L3', 'L4');
CREATE TYPE tag_type AS ENUM ('positive', 'negative');

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

-- 创建索引
CREATE INDEX idx_tag_layer_category ON tag(layer, category);
CREATE INDEX idx_tag_is_user_select ON tag(is_user_select);

-- 添加注释
COMMENT ON TABLE tag IS '标签表';
COMMENT ON COLUMN tag.id IS '标签ID';
COMMENT ON COLUMN tag.name IS '标签名称';
COMMENT ON COLUMN tag.layer IS '标签层级：L1/L2/L3/L4';
COMMENT ON COLUMN tag.category IS '标签分类';
COMMENT ON COLUMN tag.type IS '正向/负向';
COMMENT ON COLUMN tag.weight IS '权重系数';
COMMENT ON COLUMN tag.is_user_select IS '是否允许用户选择';
COMMENT ON COLUMN tag.is_display IS '是否前端展示';
COMMENT ON COLUMN tag.status IS '状态：1启用 0禁用';

-- ============================================
-- 4. 用户标签记录表
-- ============================================
-- 创建枚举类型
CREATE TYPE tag_source AS ENUM ('order', 'normal', 'system');
CREATE TYPE emotion_type AS ENUM ('satisfied', 'neutral', 'unsatisfied');

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
  
  CONSTRAINT uk_user_tag_log UNIQUE (user_id, clinic_id, tag_id)
);

-- 创建索引
CREATE INDEX idx_user_tag_log_clinic ON user_tag_log(clinic_id);
CREATE INDEX idx_user_tag_log_user_clinic ON user_tag_log(user_id, clinic_id);
CREATE INDEX idx_user_tag_log_tag ON user_tag_log(tag_id);
CREATE INDEX idx_user_tag_log_created_at ON user_tag_log(created_at);
CREATE INDEX idx_user_tag_log_source ON user_tag_log(source);

-- 添加外键约束
ALTER TABLE user_tag_log ADD CONSTRAINT fk_user_tag_log_user 
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE user_tag_log ADD CONSTRAINT fk_user_tag_log_clinic 
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;
ALTER TABLE user_tag_log ADD CONSTRAINT fk_user_tag_log_tag 
  FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE user_tag_log IS '用户标签记录表';
COMMENT ON COLUMN user_tag_log.source IS '来源：order预约后/normal普通/system系统推断';
COMMENT ON COLUMN user_tag_log.emotion IS '情绪：satisfied满意/neutral一般/unsatisfied不满意';
COMMENT ON COLUMN user_tag_log.weight IS '来源权重';
COMMENT ON COLUMN user_tag_log.user_weight IS '用户权重';
COMMENT ON COLUMN user_tag_log.final_weight IS '最终权重';

-- ============================================
-- 5. 诊所标签统计表
-- ============================================
-- 创建枚举类型
CREATE TYPE tag_status AS ENUM ('new', 'verified', 'stable', 'expired');

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
  
  PRIMARY KEY (clinic_id, tag_id)
);

-- 创建索引
CREATE INDEX idx_clinic_tag_stat_tag ON clinic_tag_stat(tag_id);
CREATE INDEX idx_clinic_tag_stat_status ON clinic_tag_stat(status);
CREATE INDEX idx_clinic_tag_stat_count ON clinic_tag_stat(count);

-- 创建更新时间触发器
CREATE TRIGGER trigger_clinic_tag_stat_updated_at
BEFORE UPDATE ON clinic_tag_stat
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 添加外键约束
ALTER TABLE clinic_tag_stat ADD CONSTRAINT fk_clinic_tag_stat_clinic 
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;
ALTER TABLE clinic_tag_stat ADD CONSTRAINT fk_clinic_tag_stat_tag 
  FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE clinic_tag_stat IS '诊所标签统计表';
COMMENT ON COLUMN clinic_tag_stat.count IS '加权后的标签数量';
COMMENT ON COLUMN clinic_tag_stat.unique_users IS '去重用户数';
COMMENT ON COLUMN clinic_tag_stat.status IS '标签状态：new/verified/stable/expired';
COMMENT ON COLUMN clinic_tag_stat.display_weight IS '展示权重';

-- ============================================
-- 6. 预约记录表
-- ============================================
-- 创建枚举类型
CREATE TYPE order_status AS ENUM ('clicked', 'confirmed');
CREATE TYPE contact_type AS ENUM ('phone', 'wechat');

CREATE TABLE "order" (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  clinic_id INTEGER NOT NULL,
  status order_status DEFAULT 'clicked',
  contact_type contact_type NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_order_user ON "order"(user_id);
CREATE INDEX idx_order_clinic ON "order"(clinic_id);
CREATE INDEX idx_order_status_created ON "order"(status, created_at);
CREATE INDEX idx_order_created_at ON "order"(created_at);

-- 添加外键约束
ALTER TABLE "order" ADD CONSTRAINT fk_order_user 
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT fk_order_clinic 
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE "order" IS '预约记录表';
COMMENT ON COLUMN "order".status IS '状态：clicked点击/confirmed确认就诊';
COMMENT ON COLUMN "order".contact_type IS '联系方式：phone电话/wechat微信';

-- ============================================
-- 7. 标签生命周期日志表
-- ============================================
CREATE TABLE tag_lifecycle_log (
  id BIGSERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  trigger_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_tag_lifecycle_log_clinic_tag ON tag_lifecycle_log(clinic_id, tag_id);
CREATE INDEX idx_tag_lifecycle_log_created_at ON tag_lifecycle_log(created_at);

-- 添加外键约束
ALTER TABLE tag_lifecycle_log ADD CONSTRAINT fk_tag_lifecycle_log_clinic 
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;
ALTER TABLE tag_lifecycle_log ADD CONSTRAINT fk_tag_lifecycle_log_tag 
  FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE tag_lifecycle_log IS '标签生命周期日志表';
COMMENT ON COLUMN tag_lifecycle_log.old_status IS '旧状态';
COMMENT ON COLUMN tag_lifecycle_log.new_status IS '新状态';
COMMENT ON COLUMN tag_lifecycle_log.trigger_reason IS '触发原因';

-- ============================================
-- 8. 用户推荐记录表（用于SocialProof计算）
-- ============================================
CREATE TABLE user_referral (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT NOT NULL,
  referee_user_id BIGINT NOT NULL,
  clinic_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uk_user_referral UNIQUE (referrer_user_id, referee_user_id, clinic_id)
);

-- 创建索引
CREATE INDEX idx_user_referral_referrer ON user_referral(referrer_user_id);
CREATE INDEX idx_user_referral_clinic ON user_referral(clinic_id);

-- 添加外键约束
ALTER TABLE user_referral ADD CONSTRAINT fk_user_referral_referrer 
  FOREIGN KEY (referrer_user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE user_referral ADD CONSTRAINT fk_user_referral_referee 
  FOREIGN KEY (referee_user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE user_referral ADD CONSTRAINT fk_user_referral_clinic 
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE user_referral IS '用户推荐记录表';
COMMENT ON COLUMN user_referral.referrer_user_id IS '推荐人用户ID';
COMMENT ON COLUMN user_referral.referee_user_id IS '被推荐人用户ID';
COMMENT ON COLUMN user_referral.clinic_id IS '诊所ID';

-- ============================================
-- 9. 诊所标签回应表
-- ============================================
CREATE TYPE response_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE clinic_tag_response (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  response_text TEXT NOT NULL,
  status response_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by BIGINT,

  CONSTRAINT uk_clinic_tag_response UNIQUE (clinic_id, tag_id)
);

-- 创建索引
CREATE INDEX idx_clinic_tag_response_clinic ON clinic_tag_response(clinic_id);
CREATE INDEX idx_clinic_tag_response_status ON clinic_tag_response(status);
CREATE INDEX idx_clinic_tag_response_created ON clinic_tag_response(created_at);

-- 添加外键约束
ALTER TABLE clinic_tag_response ADD CONSTRAINT fk_clinic_tag_response_clinic
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;
ALTER TABLE clinic_tag_response ADD CONSTRAINT fk_clinic_tag_response_tag
  FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE clinic_tag_response IS '诊所标签回应表';
COMMENT ON COLUMN clinic_tag_response.response_text IS '回应内容（最多200字）';
COMMENT ON COLUMN clinic_tag_response.status IS '状态：pending待审核/approved已通过/rejected已拒绝';
COMMENT ON COLUMN clinic_tag_response.approved_by IS '审核人ID';

-- ============================================
-- 10. 异常行为记录表
-- ============================================
-- 创建枚举类型
CREATE TYPE abnormal_status AS ENUM ('pending', 'confirmed', 'ignored');

CREATE TABLE abnormal_behavior (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  clinic_id INTEGER,
  behavior_type VARCHAR(50) NOT NULL,
  device_id VARCHAR(100),
  ip_address VARCHAR(50),
  details JSONB,
  status abnormal_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_abnormal_behavior_user ON abnormal_behavior(user_id);
CREATE INDEX idx_abnormal_behavior_status ON abnormal_behavior(status);
CREATE INDEX idx_abnormal_behavior_created_at ON abnormal_behavior(created_at);
CREATE INDEX idx_abnormal_behavior_details ON abnormal_behavior USING GIN(details);

-- 添加外键约束
ALTER TABLE abnormal_behavior ADD CONSTRAINT fk_abnormal_behavior_user 
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE abnormal_behavior IS '异常行为记录表';
COMMENT ON COLUMN abnormal_behavior.behavior_type IS '行为类型：device_frequency/pattern_similarity/ip_frequency';
COMMENT ON COLUMN abnormal_behavior.details IS '详细信息（JSON）';
COMMENT ON COLUMN abnormal_behavior.status IS '状态：pending/confirmed/ignored';

-- ============================================
-- 11. 预约确认记录表（用于就诊验证）
-- ============================================
CREATE TABLE order_confirmation (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  clinic_id INTEGER NOT NULL,
  visited BOOLEAN NOT NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uk_order_confirmation UNIQUE (order_id)
);

-- 创建索引
CREATE INDEX idx_order_confirmation_order ON order_confirmation(order_id);
CREATE INDEX idx_order_confirmation_user ON order_confirmation(user_id);
CREATE INDEX idx_order_confirmation_clinic ON order_confirmation(clinic_id);

-- 添加外键约束
ALTER TABLE order_confirmation ADD CONSTRAINT fk_order_confirmation_order
  FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE;
ALTER TABLE order_confirmation ADD CONSTRAINT fk_order_confirmation_user
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE order_confirmation ADD CONSTRAINT fk_order_confirmation_clinic
  FOREIGN KEY (clinic_id) REFERENCES clinic(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE order_confirmation IS '预约确认记录表（就诊验证）';
COMMENT ON COLUMN order_confirmation.visited IS '是否已就诊：true已就诊/false未就诊';
COMMENT ON COLUMN order_confirmation.confirmed_at IS '确认时间';

-- ============================================
-- 初始化标签数据
-- ============================================

-- L1 - 用户决策层（12个）
INSERT INTO tag (name, layer, category, type, weight, sort_order, is_user_select, is_display) VALUES
-- 信任类（4个）
('不乱开药', 'L1', 'trust', 'positive', 1.0, 1, 1, 1),
('不过度检查', 'L1', 'trust', 'positive', 1.0, 2, 1, 1),
('解释清楚病情', 'L1', 'trust', 'positive', 1.0, 3, 1, 1),
('没有隐性收费', 'L1', 'trust', 'positive', 1.0, 4, 1, 1),

-- 性价比类（4个）
('价格透明', 'L1', 'value', 'positive', 1.0, 5, 1, 1),
('基础诊疗便宜', 'L1', 'value', 'positive', 1.0, 6, 1, 1),
('不强推高价项目', 'L1', 'value', 'positive', 1.0, 7, 1, 1),
('检查合理收费', 'L1', 'value', 'positive', 1.0, 8, 1, 1),

-- 体验类（4个）
('医生态度好', 'L1', 'experience', 'positive', 1.0, 9, 1, 1),
('对宠物耐心', 'L1', 'experience', 'positive', 1.0, 10, 1, 1),
('环境干净', 'L1', 'experience', 'positive', 1.0, 11, 1, 1),
('响应快', 'L1', 'experience', 'positive', 1.0, 12, 1, 1);

-- L2 - 医疗能力层（11个，V1暂不启用）
INSERT INTO tag (name, layer, category, type, weight, sort_order, is_user_select, is_display, status) VALUES
-- 专科能力（6个）
('猫专科', 'L2', 'capability', 'positive', 1.0, 13, 0, 0, 0),
('狗外科', 'L2', 'capability', 'positive', 1.0, 14, 0, 0, 0),
('皮肤病专长', 'L2', 'capability', 'positive', 1.0, 15, 0, 0, 0),
('骨科能力', 'L2', 'capability', 'positive', 1.0, 16, 0, 0, 0),
('急诊能力', 'L2', 'capability', 'positive', 1.0, 17, 0, 0, 0),
('传染病处理', 'L2', 'capability', 'positive', 1.0, 18, 0, 0, 0),

-- 设备能力（5个）
('有DR/X光', 'L2', 'infrastructure', 'positive', 1.0, 19, 0, 0, 0),
('有B超', 'L2', 'infrastructure', 'positive', 1.0, 20, 0, 0, 0),
('可做手术', 'L2', 'infrastructure', 'positive', 1.0, 21, 0, 0, 0),
('可住院', 'L2', 'infrastructure', 'positive', 1.0, 22, 0, 0, 0),
('有化验室', 'L2', 'infrastructure', 'positive', 1.0, 23, 0, 0, 0);

-- L3 - 风险标签层（5个）
INSERT INTO tag (name, layer, category, type, weight, sort_order, is_user_select, is_display) VALUES
('有价格争议记录', 'L3', 'risk', 'negative', 1.0, 24, 0, 1),
('有过医疗纠纷', 'L3', 'risk', 'negative', 1.0, 25, 0, 1),
('过度推荐手术嫌疑', 'L3', 'risk', 'negative', 1.0, 26, 0, 1),
('用户投诉较多', 'L3', 'risk', 'negative', 1.0, 27, 0, 1),
('多次更换医生', 'L3', 'risk', 'negative', 1.0, 28, 0, 1);

-- L4 - 传播标签层（4个，系统推断）
INSERT INTO tag (name, layer, category, type, weight, sort_order, is_user_select, is_display) VALUES
('被推荐次数高', 'L4', 'social', 'positive', 1.0, 29, 0, 1),
('回头客多', 'L4', 'social', 'positive', 1.0, 30, 0, 1),
('熟人推荐率高', 'L4', 'social', 'positive', 1.0, 31, 0, 1),
('本地口碑好', 'L4', 'social', 'positive', 1.0, 32, 0, 1);

-- ============================================
-- 创建视图：诊所详情视图（含标签统计）
-- ============================================
CREATE OR REPLACE VIEW v_clinic_detail AS
SELECT 
  c.*,
  COUNT(DISTINCT utl.user_id) as total_users,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'confirmed' THEN o.id END) as confirmed_orders
FROM clinic c
LEFT JOIN user_tag_log utl ON c.id = utl.clinic_id
LEFT JOIN "order" o ON c.id = o.clinic_id
WHERE c.status = 1
GROUP BY c.id;

-- ============================================
-- 创建函数：计算两点距离（米）
-- ============================================
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN ST_Distance(
    ST_MakePoint(lng1, lat1)::geography,
    ST_MakePoint(lng2, lat2)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 添加注释
COMMENT ON FUNCTION calculate_distance IS '计算两点之间的距离（米）';

-- ============================================
-- 创建函数：查询附近诊所
-- ============================================
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
    ) as distance,
    c.reputation_score,
    c.price_score
  FROM clinic c
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

-- 添加注释
COMMENT ON FUNCTION get_nearby_clinics IS '查询附近诊所（使用PostGIS）';

-- ============================================
-- 插入测试数据（可选）
-- ============================================

-- 测试用户
INSERT INTO "user" (openid, nickname, city) VALUES
('test_openid_001', '测试用户1', '北京'),
('test_openid_002', '测试用户2', '北京'),
('test_openid_003', '测试用户3', '北京');

-- 测试诊所（北京朝阳区）
INSERT INTO clinic (name, address, lat, lng, location, phone, city, district) VALUES
('爱宠动物医院', '北京市朝阳区建国路88号', 39.9075, 116.4574, ST_SetSRID(ST_MakePoint(116.4574, 39.9075), 4326)::geography, '010-12345678', '北京', '朝阳区'),
('宠爱有家宠物诊所', '北京市朝阳区三里屯路19号', 39.9375, 116.4474, ST_SetSRID(ST_MakePoint(116.4474, 39.9375), 4326)::geography, '010-87654321', '北京', '朝阳区'),
('瑞鹏宠物医院', '北京市朝阳区望京西路48号', 40.0075, 116.4774, ST_SetSRID(ST_MakePoint(116.4774, 40.0075), 4326)::geography, '010-11112222', '北京', '朝阳区');

-- ============================================
-- 完成
-- ============================================
SELECT 'Database initialization completed successfully!' AS message;
