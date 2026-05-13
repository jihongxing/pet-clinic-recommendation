import { CapabilityType } from '../entities';

export interface CapabilitySeedItem {
  code: string;
  name: string;
  type: CapabilityType;
  sortOrder: number;
  isActive: number;
}

function createItems(
  type: CapabilityType,
  items: Array<{ code: string; name: string }>,
): CapabilitySeedItem[] {
  return items.map((item, index) => ({
    code: item.code,
    name: item.name,
    type,
    sortOrder: index + 1,
    isActive: 1,
  }));
}

export const CAPABILITY_SEED_DATA: CapabilitySeedItem[] = [
  ...createItems(CapabilityType.Service, [
    { code: 'srv_outpatient', name: '常规门诊' },
    { code: 'srv_vaccine', name: '疫苗接种' },
    { code: 'srv_surgery', name: '外科手术' },
    { code: 'srv_emergency', name: '急诊接诊' },
    { code: 'srv_inpatient', name: '住院照护' },
    { code: 'srv_dental', name: '口腔诊疗' },
    { code: 'srv_grooming', name: '基础美容护理' },
  ]),
  ...createItems(CapabilityType.Specialty, [
    { code: 'sp_cat', name: '猫专科' },
    { code: 'sp_dermatology', name: '皮肤专科' },
    { code: 'sp_orthopedics', name: '骨科专长' },
    { code: 'sp_cardiology', name: '心肺专长' },
    { code: 'sp_exotic', name: '异宠诊疗' },
    { code: 'sp_geriatrics', name: '老年宠专项' },
    { code: 'sp_rehab', name: '术后康复' },
  ]),
  ...createItems(CapabilityType.Equipment, [
    { code: 'eq_ultrasound', name: 'B超' },
    { code: 'eq_xray', name: 'X光机' },
    { code: 'eq_blood', name: '血常规设备' },
    { code: 'eq_biochemistry', name: '生化分析仪' },
    { code: 'eq_ecg', name: '心电监护' },
    { code: 'eq_endoscopy', name: '内窥镜' },
  ]),
  ...createItems(CapabilityType.Facility, [
    { code: 'fc_inpatient', name: '可住院' },
    { code: 'fc_isolation', name: '隔离病房' },
    { code: 'fc_parking', name: '方便停车' },
    { code: 'fc_night', name: '夜间接诊' },
    { code: 'fc_ct', name: '独立手术室' },
  ]),
  ...createItems(CapabilityType.SpeciesSupported, [
    { code: 'species_cat', name: '接诊猫' },
    { code: 'species_dog', name: '接诊狗' },
    { code: 'species_small_pet', name: '接诊小宠' },
    { code: 'species_exotic', name: '接诊异宠' },
  ]),
];

export const CAPABILITY_SEED_CODES = CAPABILITY_SEED_DATA.map(
  (item) => item.code,
);
