export interface ClinicCapabilitySeedItem {
  clinicName: string;
  summary: string;
  coverPhotoUrl: string;
  galleryPhotos: string[];
  services: string[];
  specialties: string[];
  equipment: string[];
  facilities: string[];
  speciesSupported: string[];
}

export const CLINIC_CAPABILITY_SEED_DATA: ClinicCapabilitySeedItem[] = [
  {
    clinicName: '望京爱宠动物医院',
    summary: '望京片区综合能力较强的全科医院，适合猫狗常规诊疗与夜间急诊。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_emergency', 'srv_inpatient'],
    specialties: ['sp_cat', 'sp_dermatology'],
    equipment: ['eq_ultrasound', 'eq_blood', 'eq_biochemistry'],
    facilities: ['fc_inpatient', 'fc_night'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '三里屯毛球宠物诊所',
    summary: '以猫专科与术后康复见长，环境友好，适合精细化诊疗。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_dental'],
    specialties: ['sp_cat', 'sp_rehab'],
    equipment: ['eq_blood', 'eq_ecg'],
    facilities: ['fc_parking'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '双井安心宠物医院',
    summary: '双井周边口碑稳定的综合诊疗点，支持手术、住院与基础影像检查。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_surgery', 'srv_inpatient'],
    specialties: ['sp_orthopedics'],
    equipment: ['eq_xray', 'eq_blood'],
    facilities: ['fc_inpatient', 'fc_ct'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '国贸爪爪宠物诊疗中心',
    summary: '国贸办公区附近的高效率门诊，急诊接诊和心电监护能力较突出。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_emergency'],
    specialties: ['sp_cardiology'],
    equipment: ['eq_ecg', 'eq_ultrasound'],
    facilities: ['fc_night', 'fc_parking'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '常营友伴动物医院',
    summary: '常营社区型医院，基础门诊、疫苗和住院照护覆盖较完整。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_vaccine', 'srv_inpatient'],
    specialties: ['sp_geriatrics'],
    equipment: ['eq_blood', 'eq_biochemistry'],
    facilities: ['fc_inpatient'],
    speciesSupported: ['species_cat', 'species_dog', 'species_small_pet'],
  },
  {
    clinicName: '中关村爱宠动物医院',
    summary: '中关村片区适合复杂病例复诊，皮肤与心肺专项诊疗能力较强。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_surgery'],
    specialties: ['sp_dermatology', 'sp_cardiology'],
    equipment: ['eq_ultrasound', 'eq_biochemistry', 'eq_ecg'],
    facilities: ['fc_ct'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '五道口毛球宠物诊所',
    summary: '五道口年轻客群较多，猫科与口腔诊疗是这家的高频强项。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_dental'],
    specialties: ['sp_cat'],
    equipment: ['eq_blood'],
    facilities: ['fc_parking'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '清河安心宠物医院',
    summary: '清河区域综合型医院，住院、急诊和影像能力比较均衡。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_emergency', 'srv_inpatient'],
    specialties: ['sp_rehab'],
    equipment: ['eq_xray', 'eq_ultrasound'],
    facilities: ['fc_inpatient', 'fc_night'],
    speciesSupported: ['species_cat', 'species_dog'],
  },
  {
    clinicName: '上地爪爪宠物诊疗中心',
    summary: '上地程序员养宠人常去的门诊，检查设备覆盖较好，也支持异宠接诊。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_vaccine'],
    specialties: ['sp_exotic'],
    equipment: ['eq_blood', 'eq_endoscopy'],
    facilities: ['fc_parking'],
    speciesSupported: ['species_cat', 'species_dog', 'species_exotic'],
  },
  {
    clinicName: '西二旗友伴动物医院',
    summary: '西二旗附近少数能接小宠和异宠的综合门诊，配套隔离病房。',
    coverPhotoUrl: '',
    galleryPhotos: [],
    services: ['srv_outpatient', 'srv_inpatient'],
    specialties: ['sp_exotic', 'sp_geriatrics'],
    equipment: ['eq_blood', 'eq_biochemistry'],
    facilities: ['fc_inpatient', 'fc_isolation'],
    speciesSupported: ['species_dog', 'species_small_pet', 'species_exotic'],
  },
];
