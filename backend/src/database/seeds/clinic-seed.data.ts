export interface ClinicSeedItem {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  wechat: string;
  businessHours: string;
  city: string;
  district: string;
  trustScore: number;
  valueScore: number;
  experienceScore: number;
  riskPenalty: number;
  socialScore: number;
  reputationScore: number;
  priceScore: number;
  confidenceFactor: number;
  isClaimed: number;
  status: number;
}

interface DistrictClinicSeedConfig {
  district: string;
  slug: string;
  centerLat: number;
  centerLng: number;
  areas: string[];
}

const DISTRICT_CLINIC_SEED_CONFIG: DistrictClinicSeedConfig[] = [
  {
    district: '朝阳区',
    slug: 'chaoyang',
    centerLat: 39.9219,
    centerLng: 116.4436,
    areas: ['望京', '三里屯', '双井', '国贸', '常营'],
  },
  {
    district: '海淀区',
    slug: 'haidian',
    centerLat: 39.9593,
    centerLng: 116.2981,
    areas: ['中关村', '五道口', '清河', '上地', '西二旗'],
  },
  {
    district: '丰台区',
    slug: 'fengtai',
    centerLat: 39.8586,
    centerLng: 116.2868,
    areas: ['方庄', '马家堡', '六里桥', '科技园', '角门'],
  },
  {
    district: '通州区',
    slug: 'tongzhou',
    centerLat: 39.9025,
    centerLng: 116.6586,
    areas: ['北苑', '梨园', '九棵树', '新华大街', '运河商务区'],
  },
  {
    district: '昌平区',
    slug: 'changping',
    centerLat: 40.2208,
    centerLng: 116.2313,
    areas: ['回龙观', '天通苑', '沙河', '龙泽', '北七家'],
  },
  {
    district: '大兴区',
    slug: 'daxing',
    centerLat: 39.7269,
    centerLng: 116.3414,
    areas: ['黄村', '西红门', '旧宫', '亦庄', '瀛海'],
  },
  {
    district: '西城区',
    slug: 'xicheng',
    centerLat: 39.9123,
    centerLng: 116.3658,
    areas: ['金融街', '西单', '德胜门', '广安门', '什刹海'],
  },
  {
    district: '东城区',
    slug: 'dongcheng',
    centerLat: 39.9288,
    centerLng: 116.416,
    areas: ['东直门', '崇文门', '建国门', '安定门', '和平里'],
  },
  {
    district: '石景山区',
    slug: 'shijingshan',
    centerLat: 39.9147,
    centerLng: 116.223,
    areas: ['鲁谷', '古城', '八角', '苹果园', '模式口'],
  },
  {
    district: '顺义区',
    slug: 'shunyi',
    centerLat: 40.1289,
    centerLng: 116.6535,
    areas: ['后沙峪', '马坡', '仁和', '天竺', '空港'],
  },
];

const CLINIC_NAME_SUFFIXES = [
  '爱宠动物医院',
  '毛球宠物诊所',
  '安心宠物医院',
  '爪爪宠物诊疗中心',
  '友伴动物医院',
];

const ADDRESS_SUFFIXES = ['路', '街', '南路', '北路', '大街'];
const LAT_OFFSETS = [0.0104, 0.0048, -0.0061, -0.0112, 0.0023];
const LNG_OFFSETS = [0.0087, -0.0095, 0.0126, -0.0058, -0.0131];
const BUSINESS_HOURS = [
  '09:00-21:00',
  '08:30-20:30',
  '10:00-22:00',
  '24小时急诊',
  '09:00-19:30',
];

function roundTo(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function createClinicSeedItem(
  districtIndex: number,
  areaIndex: number,
  config: DistrictClinicSeedConfig,
): ClinicSeedItem {
  const area = config.areas[areaIndex];
  const trustScore = 78 + ((districtIndex * 3 + areaIndex * 2) % 15);
  const valueScore = 72 + ((districtIndex * 2 + areaIndex * 3) % 14);
  const experienceScore = 74 + ((districtIndex * 4 + areaIndex * 3) % 16);
  const socialScore = 65 + ((districtIndex * 5 + areaIndex * 4) % 18);
  const riskPenalty = roundTo(1.5 + ((districtIndex + areaIndex * 2) % 6), 2);
  const reputationScore = roundTo(
    trustScore * 0.45 +
      valueScore * 0.25 +
      experienceScore * 0.15 +
      socialScore * 0.15 -
      riskPenalty * 1.2,
    2,
  );
  const priceScore = roundTo(valueScore - riskPenalty * 0.45 + 4, 2);
  const confidenceFactor = roundTo(
    0.55 + ((districtIndex * 5 + areaIndex * 3) % 35) / 100,
    2,
  );
  const basePhone = 68000000 + districtIndex * 700 + areaIndex * 53;

  return {
    name: `${area}${CLINIC_NAME_SUFFIXES[areaIndex]}`,
    address: `北京市${config.district}${area}${ADDRESS_SUFFIXES[areaIndex]}${18 + districtIndex * 6 + areaIndex}号`,
    lat: roundTo(config.centerLat + LAT_OFFSETS[areaIndex], 7),
    lng: roundTo(config.centerLng + LNG_OFFSETS[areaIndex], 7),
    phone: `010-${basePhone}`,
    wechat: `petmed_${config.slug}_${areaIndex + 1}`,
    businessHours: BUSINESS_HOURS[areaIndex],
    city: '北京',
    district: config.district,
    trustScore,
    valueScore,
    experienceScore,
    riskPenalty,
    socialScore,
    reputationScore,
    priceScore,
    confidenceFactor,
    isClaimed: 0,
    status: 1,
  };
}

export const CLINIC_SEED_DATA: ClinicSeedItem[] =
  DISTRICT_CLINIC_SEED_CONFIG.flatMap((config, districtIndex) =>
    config.areas.map((_, areaIndex) =>
      createClinicSeedItem(districtIndex, areaIndex, config),
    ),
  );

export const CLINIC_SEED_NAMES = CLINIC_SEED_DATA.map((item) => item.name);
export const CLINIC_SEED_DISTRICTS = DISTRICT_CLINIC_SEED_CONFIG.map(
  (item) => item.district,
);
