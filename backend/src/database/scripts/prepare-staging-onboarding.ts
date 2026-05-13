import { existsSync } from 'fs';
import { resolve } from 'path';

import * as dotenv from 'dotenv';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import {
  AdminUserEntity,
  ClaimStatus,
  ClinicAccountEntity,
  ClinicClaimRequestEntity,
  ClinicEntity,
  ClinicSubmissionEntity,
  ClinicSubmissionStatus,
  ClinicSubmissionType,
  UserEntity,
} from '../entities';

type StagingPreparationSummary = {
  adminUsername: string;
  adminPassword: string;
  userOpenid: string;
  userNickname: string;
  recommendationSubmissionId: number;
  recommendationClinicName: string;
  claimClinicId: number;
  claimClinicName: string;
  claimRequestId: number;
};

const envCandidates = [
  resolve(process.cwd(), '.env.staging'),
  resolve(process.cwd(), '../.env.staging'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

function createDataSource() {
  const port = Number(process.env.DB_PORT ?? 5432);

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number.isNaN(port) ? 5432 : port,
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres_password',
    database: process.env.DB_DATABASE ?? 'pet_clinic_recommendation',
    entities: [resolve(__dirname, '../entities/*{.ts,.js}')],
    synchronize: false,
    logging: false,
  });
}

function toPoint(lat: number, lng: number) {
  return {
    type: 'Point' as const,
    coordinates: [lng, lat] as [number, number],
  };
}

function getRequiredEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();

  return value || fallback;
}

async function ensureAdminUser(
  repository: Repository<AdminUserEntity>,
  username: string,
  password: string,
  displayName: string,
) {
  const passwordHash = await hash(password, 10);
  const existing = await repository.findOne({
    where: {
      username,
    },
  });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.displayName = displayName;
    existing.status = 1;
    await repository.save(existing);
    return existing;
  }

  const entity = repository.create({
    username,
    passwordHash,
    displayName,
    status: 1,
    lastLoginAt: null,
  });

  return repository.save(entity);
}

async function ensureUser(
  repository: Repository<UserEntity>,
  openid: string,
  nickname: string,
  city: string,
) {
  const existing = await repository.findOne({
    where: {
      openid,
    },
  });

  if (existing) {
    existing.nickname = nickname;
    existing.city = city;
    existing.status = 1;
    await repository.save(existing);
    return existing;
  }

  const entity = repository.create({
    openid,
    nickname,
    avatar: null,
    city,
    status: 1,
    lastLoginAt: null,
  });

  return repository.save(entity);
}

async function ensurePendingRecommendationSubmission(
  clinicSubmissionRepository: Repository<ClinicSubmissionEntity>,
  submitterUserId: string,
) {
  const clinicName = '【Staging验收】新诊所推荐样例';
  const reason = '用于 staging 验收推荐审核链路，请审核通过并新建诊所。';

  const existing = await clinicSubmissionRepository.findOne({
    where: {
      name: clinicName,
      submitterUserId,
    },
    order: {
      id: 'DESC',
    },
  });

  if (existing) {
    existing.submissionType = ClinicSubmissionType.New;
    existing.clinicId = null;
    existing.address = '北京市朝阳区望京街道阜通东大街 6 号';
    existing.city = '北京';
    existing.district = '朝阳区';
    existing.lat = 39.9882;
    existing.lng = 116.4687;
    existing.phone = '13800001111';
    existing.businessHours = '10:00-20:00';
    existing.photosJson = ['https://example.com/staging/submission-cover.jpg'];
    existing.servicesJson = ['srv_outpatient', 'srv_emergency'];
    existing.specialtiesJson = ['sp_cat'];
    existing.equipmentJson = ['eq_ultrasound'];
    existing.facilitiesJson = ['fc_inpatient'];
    existing.speciesSupportedJson = ['species_cat', 'species_dog'];
    existing.capabilityNotes =
      '用于 staging 验收能力审核链路，主打猫科、急诊和住院。';
    existing.reason = reason;
    existing.status = ClinicSubmissionStatus.PendingReview;
    existing.matchedClinicId = null;
    existing.reviewedBy = null;
    existing.reviewedAt = null;
    existing.reviewNote = null;
    await clinicSubmissionRepository.save(existing);
    return existing;
  }

  const entity = clinicSubmissionRepository.create({
    submitterUserId,
    submissionType: ClinicSubmissionType.New,
    clinicId: null,
    name: clinicName,
    address: '北京市朝阳区望京街道阜通东大街 6 号',
    city: '北京',
    district: '朝阳区',
    lat: 39.9882,
    lng: 116.4687,
    phone: '13800001111',
    businessHours: '10:00-20:00',
    photosJson: ['https://example.com/staging/submission-cover.jpg'],
    servicesJson: ['srv_outpatient', 'srv_emergency'],
    specialtiesJson: ['sp_cat'],
    equipmentJson: ['eq_ultrasound'],
    facilitiesJson: ['fc_inpatient'],
    speciesSupportedJson: ['species_cat', 'species_dog'],
    capabilityNotes: '用于 staging 验收能力审核链路，主打猫科、急诊和住院。',
    reason,
    status: ClinicSubmissionStatus.PendingReview,
    matchedClinicId: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });

  return clinicSubmissionRepository.save(entity);
}

async function ensurePendingClaimScenario(
  clinicRepository: Repository<ClinicEntity>,
  clinicAccountRepository: Repository<ClinicAccountEntity>,
  clinicClaimRequestRepository: Repository<ClinicClaimRequestEntity>,
  submitterUserId: string,
) {
  const clinicName = '【Staging验收】待认领诊所样例';
  const claimReason =
    '用于 staging 验收认领审核链路，请审核通过并生成诊所账号。';

  let clinic = await clinicRepository.findOne({
    where: {
      name: clinicName,
    },
  });

  if (!clinic) {
    clinic = clinicRepository.create({
      name: clinicName,
      address: '北京市朝阳区酒仙桥路 10 号',
      lat: 39.9776,
      lng: 116.5001,
      location: toPoint(39.9776, 116.5001),
      phone: '13800002222',
      wechat: 'staging_claim_demo',
      businessHours: '09:00-21:00',
      city: '北京',
      district: '朝阳区',
      trustScore: 82,
      valueScore: 79,
      experienceScore: 81,
      riskPenalty: 0,
      socialScore: 68,
      reputationScore: 79.9,
      priceScore: 80.5,
      confidenceFactor: 0.76,
      isClaimed: 0,
      expireAt: null,
      status: 1,
    });
  } else {
    clinic.address = '北京市朝阳区酒仙桥路 10 号';
    clinic.lat = 39.9776;
    clinic.lng = 116.5001;
    clinic.location = toPoint(39.9776, 116.5001);
    clinic.phone = '13800002222';
    clinic.wechat = 'staging_claim_demo';
    clinic.businessHours = '09:00-21:00';
    clinic.city = '北京';
    clinic.district = '朝阳区';
    clinic.trustScore = 82;
    clinic.valueScore = 79;
    clinic.experienceScore = 81;
    clinic.riskPenalty = 0;
    clinic.socialScore = 68;
    clinic.reputationScore = 79.9;
    clinic.priceScore = 80.5;
    clinic.confidenceFactor = 0.76;
    clinic.isClaimed = 0;
    clinic.expireAt = null;
    clinic.status = 1;
  }

  clinic = await clinicRepository.save(clinic);

  const clinicAccount = await clinicAccountRepository.findOne({
    where: {
      clinicId: clinic.id,
    },
  });

  if (clinicAccount) {
    await clinicAccountRepository.delete({
      id: clinicAccount.id,
    });
  }

  const existingClaim = await clinicClaimRequestRepository.findOne({
    where: {
      clinicId: clinic.id,
      submitterUserId,
    },
    order: {
      id: 'DESC',
    },
  });

  if (existingClaim) {
    existingClaim.applicantName = '张医生';
    existingClaim.applicantPhone = '13800000000';
    existingClaim.proofMaterial = claimReason;
    existingClaim.status = ClaimStatus.Pending;
    existingClaim.reviewedBy = null;
    existingClaim.reviewedAt = null;
    existingClaim.reviewNote = null;
    const savedClaim = await clinicClaimRequestRepository.save(existingClaim);
    return {
      clinic,
      claimRequest: savedClaim,
    };
  }

  const claimEntity = clinicClaimRequestRepository.create({
    clinicId: clinic.id,
    submitterUserId,
    applicantName: '张医生',
    applicantPhone: '13800000000',
    proofMaterial: claimReason,
    status: ClaimStatus.Pending,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });
  const claimRequest = await clinicClaimRequestRepository.save(claimEntity);

  return {
    clinic,
    claimRequest,
  };
}

function printSummary(summary: StagingPreparationSummary) {
  console.log('');
  console.log('Staging onboarding data is ready.');
  console.table([
    { key: 'admin_username', value: summary.adminUsername },
    { key: 'admin_password', value: summary.adminPassword },
    { key: 'user_openid', value: summary.userOpenid },
    { key: 'user_nickname', value: summary.userNickname },
    {
      key: 'recommendation_submission',
      value: `#${summary.recommendationSubmissionId} ${summary.recommendationClinicName}`,
    },
    {
      key: 'claim_clinic',
      value: `#${summary.claimClinicId} ${summary.claimClinicName}`,
    },
    {
      key: 'claim_request',
      value: `#${summary.claimRequestId}`,
    },
  ]);
  console.log('');
  console.log('Suggested verification flow:');
  console.log('1. Use /api/v1/admin/login with the admin credentials above.');
  console.log(
    '2. Review recommendation submission and approve it as approved_new.',
  );
  console.log(
    '3. Review claim request and approve it to generate clinic account.',
  );
  console.log(
    '4. Log in via /api/v1/clinic/login using username clinic_admin_<clinicId> and password Clinic@<clinicId>888.',
  );
}

async function main() {
  const dataSource = createDataSource();

  await dataSource.initialize();

  try {
    const adminUserRepository = dataSource.getRepository(AdminUserEntity);
    const userRepository = dataSource.getRepository(UserEntity);
    const clinicRepository = dataSource.getRepository(ClinicEntity);
    const clinicAccountRepository =
      dataSource.getRepository(ClinicAccountEntity);
    const clinicSubmissionRepository = dataSource.getRepository(
      ClinicSubmissionEntity,
    );
    const clinicClaimRequestRepository = dataSource.getRepository(
      ClinicClaimRequestEntity,
    );

    const adminUsername = getRequiredEnv(
      'STAGING_REVIEW_ADMIN_USERNAME',
      'review_admin',
    );
    const adminPassword = getRequiredEnv(
      'STAGING_REVIEW_ADMIN_PASSWORD',
      'Admin123456!',
    );
    const adminDisplayName = getRequiredEnv(
      'STAGING_REVIEW_ADMIN_DISPLAY_NAME',
      'Staging审核员',
    );
    const userOpenid = getRequiredEnv(
      'STAGING_ONBOARDING_USER_OPENID',
      'staging-clinic-onboarding-user-001',
    );
    const userNickname = getRequiredEnv(
      'STAGING_ONBOARDING_USER_NICKNAME',
      'Staging链路验收用户',
    );

    await ensureAdminUser(
      adminUserRepository,
      adminUsername,
      adminPassword,
      adminDisplayName,
    );
    const user = await ensureUser(
      userRepository,
      userOpenid,
      userNickname,
      '北京',
    );
    const submission = await ensurePendingRecommendationSubmission(
      clinicSubmissionRepository,
      user.id,
    );
    const claimScenario = await ensurePendingClaimScenario(
      clinicRepository,
      clinicAccountRepository,
      clinicClaimRequestRepository,
      user.id,
    );

    printSummary({
      adminUsername,
      adminPassword,
      userOpenid,
      userNickname,
      recommendationSubmissionId: Number(submission.id),
      recommendationClinicName: submission.name,
      claimClinicId: claimScenario.clinic.id,
      claimClinicName: claimScenario.clinic.name,
      claimRequestId: Number(claimScenario.claimRequest.id),
    });
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error) => {
  console.error('Failed to prepare staging onboarding data.');
  console.error(error);
  process.exitCode = 1;
});
