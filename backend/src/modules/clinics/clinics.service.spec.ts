import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  ClinicAccountEntity,
  ClinicClaimRequestEntity,
  ClinicEntity,
  ClaimStatus,
  ClinicTagResponseEntity,
  ResponseStatus,
  TagEntity,
} from '../../database/entities';
import { AuthActorType } from '../auth/interfaces/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';
import { ClinicsService } from './clinics.service';
import { ClinicCapabilityProfileService } from './services/clinic-capability-profile.service';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let dataSource: { query: jest.Mock; transaction?: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock };
  let clinicRepository: { findOne: jest.Mock; save: jest.Mock };
  let clinicAccountRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let clinicClaimRequestRepository: {
    create: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let clinicTagResponseRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let tagRepository: { findOne: jest.Mock };
  let clinicCapabilityProfileService: {
    getClinicCapabilities: jest.Mock;
    getClinicCapabilitiesMap: jest.Mock;
    getCapabilityDefinitions: jest.Mock;
    listCapabilityDefinitionsForAdmin: jest.Mock;
    createCapabilityDefinition: jest.Mock;
    updateCapabilityDefinition: jest.Mock;
    deleteCapabilityDefinition: jest.Mock;
    replaceClinicCapabilities: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    clinicRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    clinicAccountRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    clinicClaimRequestRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    clinicTagResponseRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
    tagRepository = {
      findOne: jest.fn(),
    };
    clinicCapabilityProfileService = {
      getClinicCapabilities: jest.fn().mockResolvedValue({
        services: [],
        specialties: [],
        equipment: [],
        facilities: [],
        speciesSupported: [],
        highlights: [],
      }),
      getClinicCapabilitiesMap: jest.fn().mockResolvedValue(new Map()),
      getCapabilityDefinitions: jest.fn(),
      listCapabilityDefinitionsForAdmin: jest.fn(),
      createCapabilityDefinition: jest.fn(),
      updateCapabilityDefinition: jest.fn(),
      deleteCapabilityDefinition: jest.fn(),
      replaceClinicCapabilities: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: ClinicCapabilityProfileService,
          useValue: clinicCapabilityProfileService,
        },
        {
          provide: getRepositoryToken(ClinicEntity),
          useValue: clinicRepository,
        },
        {
          provide: getRepositoryToken(ClinicAccountEntity),
          useValue: clinicAccountRepository,
        },
        {
          provide: getRepositoryToken(ClinicClaimRequestEntity),
          useValue: clinicClaimRequestRepository,
        },
        {
          provide: getRepositoryToken(ClinicTagResponseEntity),
          useValue: clinicTagResponseRepository,
        },
        {
          provide: getRepositoryToken(TagEntity),
          useValue: tagRepository,
        },
      ],
    }).compile();

    service = module.get<ClinicsService>(ClinicsService);
    dataSource.transaction = jest.fn(
      async (
        callback: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === ClinicEntity) {
              return clinicRepository;
            }

            if (entity === ClinicClaimRequestEntity) {
              return clinicClaimRequestRepository;
            }

            if (entity === ClinicAccountEntity) {
              return clinicAccountRepository;
            }

            throw new Error('Unexpected repository');
          },
        }),
    );
  });

  it('returns clinics by fuzzy name or address search', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          lat: 39.9075,
          lng: 116.4574,
          distance: 1234,
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          reputationScore: 85.5,
          priceScore: 78.3,
          confidenceFactor: 0.85,
          isClaimed: 0,
        },
      ]);

    await expect(
      service.searchClinics({
        keyword: '爱宠',
        city: '北京',
        lat: 39.9075,
        lng: 116.4574,
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      list: [
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          lat: 39.9075,
          lng: 116.4574,
          distance: 1234,
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          reputationScore: 85.5,
          priceScore: 78.3,
          confidenceFactor: 0.85,
          isClaimed: false,
          capabilityHighlights: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('returns empty search result when keyword matches nothing', async () => {
    dataSource.query.mockResolvedValueOnce([{ total: 0 }]);

    await expect(
      service.searchClinics({
        keyword: '不存在的诊所',
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      list: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('returns clinic detail with grouped tag statistics', async () => {
    redisService.get.mockResolvedValue(null);
    redisService.set.mockResolvedValue('OK');
    dataSource.query
      .mockResolvedValueOnce([
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          lat: 39.9075,
          lng: 116.4574,
          distance: 1234,
          phone: '010-12345678',
          wechat: 'aichong_hospital',
          businessHours: '09:00-21:00',
          city: '北京',
          district: '朝阳区',
          summary: null,
          coverPhotoUrl: null,
          galleryPhotosJson: [],
          capabilityProfileStatus: 'verified',
          trustScore: 85.5,
          valueScore: 78.3,
          experienceScore: 82.1,
          socialScore: 75,
          riskPenalty: 0,
          reputationScore: 85.5,
          priceScore: 78.3,
          confidenceFactor: 0.85,
          isClaimed: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          name: '不乱开药',
          category: 'trust',
          count: 23,
          uniqueUsers: 20,
          status: 'stable',
          displayWeight: 1.2,
        },
        {
          id: 5,
          name: '价格透明',
          category: 'value',
          count: 18,
          uniqueUsers: 15,
          status: 'verified',
          displayWeight: 1,
        },
      ]);

    await expect(
      service.getClinicDetail(1, {
        lat: 39.9075,
        lng: 116.4574,
      }),
    ).resolves.toEqual({
      id: 1,
      name: '爱宠动物医院',
      address: '北京市朝阳区建国路88号',
      lat: 39.9075,
      lng: 116.4574,
      distance: 1234,
      phone: '010-12345678',
      wechat: 'aichong_hospital',
      businessHours: '09:00-21:00',
      city: '北京',
      district: '朝阳区',
      summary: null,
      coverPhotoUrl: null,
      galleryPhotos: [],
      capabilityProfileStatus: 'verified',
      scores: {
        trust: 85.5,
        value: 78.3,
        experience: 82.1,
        social: 75,
        riskPenalty: 0,
        reputation: 85.5,
        price: 78.3,
        confidenceFactor: 0.85,
      },
      tags: {
        trust: [
          {
            id: 1,
            name: '不乱开药',
            count: 23,
            uniqueUsers: 20,
            status: 'stable',
            displayWeight: 1.2,
          },
        ],
        value: [
          {
            id: 5,
            name: '价格透明',
            count: 18,
            uniqueUsers: 15,
            status: 'verified',
            displayWeight: 1,
          },
        ],
      },
      capabilities: {
        services: [],
        specialties: [],
        equipment: [],
        facilities: [],
        speciesSupported: [],
        highlights: [],
      },
      isClaimed: false,
    });

    expect(redisService.get).toHaveBeenCalledWith(
      'clinics:detail:1:39.907500:116.457400',
    );
    expect(redisService.set).toHaveBeenCalledWith(
      'clinics:detail:1:39.907500:116.457400',
      expect.any(String),
      300,
    );
  });

  it('creates a pending clinic claim request for an unclaimed clinic', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
      isClaimed: 0,
    } as ClinicEntity);
    clinicClaimRequestRepository.findOne.mockResolvedValue(null);
    clinicClaimRequestRepository.create.mockImplementation(
      (payload) => payload as ClinicClaimRequestEntity,
    );
    clinicClaimRequestRepository.save.mockResolvedValue({
      id: '2001',
      status: ClaimStatus.Pending,
    } as ClinicClaimRequestEntity);

    await expect(
      service.createClinicClaimRequest(1, '21', {
        applicantName: '张三',
        applicantPhone: '13800000000',
        proofMaterial: '营业执照编号 ABC-123',
      }),
    ).resolves.toEqual({
      id: 2001,
      status: ClaimStatus.Pending,
    });

    expect(clinicClaimRequestRepository.create).toHaveBeenCalledWith({
      clinicId: 1,
      submitterUserId: '21',
      applicantName: '张三',
      applicantPhone: '13800000000',
      proofMaterial: '营业执照编号 ABC-123',
      status: ClaimStatus.Pending,
    });
  });

  it('rejects claim request when clinic already has pending request', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
      isClaimed: 0,
    } as ClinicEntity);
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2001',
      status: ClaimStatus.Pending,
    } as ClinicClaimRequestEntity);

    await expect(
      service.createClinicClaimRequest(1, '21', {
        applicantName: '张三',
        applicantPhone: '13800000000',
      }),
    ).rejects.toThrow('该诊所已有认领申请正在审核中');
  });

  it('returns current user clinic claim requests', async () => {
    clinicClaimRequestRepository.find.mockResolvedValue([
      {
        id: '2001',
        clinicId: 1,
        applicantName: '张三',
        applicantPhone: '13800000000',
        proofMaterial: '营业执照',
        status: ClaimStatus.Pending,
        reviewNote: null,
        reviewedAt: null,
        createdAt: new Date('2026-05-12T12:00:00.000Z'),
        clinic: {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          city: '北京',
          district: '朝阳区',
        } as ClinicEntity,
      } as ClinicClaimRequestEntity,
    ]);

    await expect(service.getMyClinicClaimRequests('21')).resolves.toEqual({
      list: [
        {
          id: 2001,
          clinicId: 1,
          clinicName: '爱宠动物医院',
          clinicAddress: '北京市朝阳区建国路88号',
          clinicCity: '北京',
          clinicDistrict: '朝阳区',
          applicantName: '张三',
          applicantPhone: '13800000000',
          proofMaterial: '营业执照',
          status: ClaimStatus.Pending,
          reviewNote: null,
          reviewedAt: null,
          createdAt: new Date('2026-05-12T12:00:00.000Z'),
        },
      ],
      total: 1,
    });
  });

  it('returns admin claim requests with status filter and submitter info', async () => {
    clinicClaimRequestRepository.findAndCount.mockResolvedValue([
      [
        {
          id: '2003',
          clinicId: 12,
          applicantName: '李四',
          applicantPhone: '13900000000',
          proofMaterial: '营业执照与工牌',
          status: ClaimStatus.Pending,
          reviewNote: null,
          reviewedAt: null,
          reviewedBy: null,
          createdAt: new Date('2026-05-12T13:00:00.000Z'),
          clinic: {
            id: 12,
            name: '望京爱宠动物医院',
            address: '北京市朝阳区望京路 2 号',
            city: '北京',
            district: '朝阳区',
          } as ClinicEntity,
          submitterUser: {
            id: '21',
            nickname: '阿福家长',
            city: '北京',
          },
        } as ClinicClaimRequestEntity,
      ],
      1,
    ]);

    const result = await service.getAdminClaimRequests({
      status: ClaimStatus.Pending,
      page: 1,
      pageSize: 20,
    });

    expect(clinicClaimRequestRepository.findAndCount).toHaveBeenCalledWith({
      where: {
        status: ClaimStatus.Pending,
      },
      relations: {
        clinic: true,
        submitterUser: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({
      list: [
        {
          id: 2003,
          clinicId: 12,
          clinicName: '望京爱宠动物医院',
          clinicAddress: '北京市朝阳区望京路 2 号',
          clinicCity: '北京',
          clinicDistrict: '朝阳区',
          applicantName: '李四',
          applicantPhone: '13900000000',
          proofMaterial: '营业执照与工牌',
          status: ClaimStatus.Pending,
          reviewNote: null,
          reviewedAt: null,
          createdAt: new Date('2026-05-12T13:00:00.000Z'),
          submitter: {
            userId: 21,
            nickname: '阿福家长',
            city: '北京',
          },
          reviewedBy: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('returns claim request detail for owner user', async () => {
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2001',
      clinicId: 1,
      submitterUserId: '21',
      applicantName: '张三',
      applicantPhone: '13800000000',
      proofMaterial: '营业执照',
      status: ClaimStatus.Rejected,
      reviewNote: '证照信息不完整',
      reviewedAt: new Date('2026-05-13T12:00:00.000Z'),
      createdAt: new Date('2026-05-12T12:00:00.000Z'),
      clinic: {
        id: 1,
        name: '爱宠动物医院',
        address: '北京市朝阳区建国路88号',
        city: '北京',
        district: '朝阳区',
      } as ClinicEntity,
    } as ClinicClaimRequestEntity);

    await expect(
      service.getClinicClaimRequestDetail(2001, {
        sub: '21',
        actorType: AuthActorType.User,
        actorId: '21',
        userId: '21',
      }),
    ).resolves.toMatchObject({
      id: 2001,
      clinicId: 1,
      submitterUserId: 21,
      status: ClaimStatus.Rejected,
      reviewNote: '证照信息不完整',
    });
  });

  it('rejects claim request detail when user is not owner', async () => {
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2001',
      clinicId: 1,
      submitterUserId: '21',
      applicantName: '张三',
      applicantPhone: '13800000000',
      proofMaterial: '营业执照',
      status: ClaimStatus.Pending,
      reviewNote: null,
      reviewedAt: null,
      createdAt: new Date('2026-05-12T12:00:00.000Z'),
      clinic: {
        id: 1,
        name: '爱宠动物医院',
        address: '北京市朝阳区建国路88号',
        city: '北京',
        district: '朝阳区',
      } as ClinicEntity,
    } as ClinicClaimRequestEntity);

    await expect(
      service.getClinicClaimRequestDetail(2001, {
        sub: '99',
        actorType: AuthActorType.User,
        actorId: '99',
        userId: '99',
      }),
    ).rejects.toThrow('无权查看该认领申请');
  });

  it('rejects claim request detail when actor type is clinic', async () => {
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2001',
      clinicId: 1,
      submitterUserId: '21',
      applicantName: '张三',
      applicantPhone: '13800000000',
      proofMaterial: '营业执照',
      status: ClaimStatus.Pending,
      reviewNote: null,
      reviewedAt: null,
      createdAt: new Date('2026-05-12T12:00:00.000Z'),
      clinic: {
        id: 1,
        name: '爱宠动物医院',
        address: '北京市朝阳区建国路88号',
        city: '北京',
        district: '朝阳区',
      } as ClinicEntity,
    } as ClinicClaimRequestEntity);

    await expect(
      service.getClinicClaimRequestDetail(2001, {
        sub: '301',
        actorType: AuthActorType.Clinic,
        actorId: '301',
        clinicAccountId: '301',
        clinicId: 1,
        username: 'clinic_admin_1',
      }),
    ).rejects.toThrow('当前令牌不支持查看认领申请');
  });

  it('approves a clinic claim request and creates clinic account', async () => {
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2001',
      clinicId: 12,
      status: ClaimStatus.Pending,
      reviewNote: null,
    } as ClinicClaimRequestEntity);
    clinicRepository.findOne.mockResolvedValue({
      id: 12,
      status: 1,
      isClaimed: 0,
      expireAt: null,
    } as ClinicEntity);
    clinicAccountRepository.findOne.mockResolvedValue(null);
    clinicAccountRepository.create.mockImplementation(
      (payload) => payload as ClinicAccountEntity,
    );
    clinicAccountRepository.save.mockResolvedValue({
      id: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
      passwordHash: 'hashed-password',
      status: 1,
      createdAt: new Date('2026-05-13T08:00:00.000Z'),
    } as ClinicAccountEntity);
    clinicRepository.save.mockImplementation(
      async (entity) => entity as ClinicEntity,
    );
    clinicClaimRequestRepository.save.mockImplementation(
      async (entity) => entity as ClinicClaimRequestEntity,
    );

    const result = await service.reviewClinicClaimRequest('901', 2001, {
      action: ClaimStatus.Approved,
      note: '证照和联系人信息一致',
    });

    expect(clinicAccountRepository.create).toHaveBeenCalledWith({
      clinicId: 12,
      username: 'clinic_admin_12',
      passwordHash: expect.any(String),
      status: 1,
    });
    expect(clinicRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        isClaimed: 1,
        expireAt: null,
      }),
    );
    expect(result).toMatchObject({
      id: 2001,
      status: ClaimStatus.Approved,
      reviewedBy: 901,
      clinicAccount: {
        clinicAccountId: 301,
        username: 'clinic_admin_12',
        temporaryPassword: 'Clinic@12888',
      },
    });
    expect(result.reviewNote).toContain('后台登录账号：clinic_admin_12');
  });

  it('enables an existing clinic account when approving claim request', async () => {
    const passwordHash = '$2a$10$existing.hash.value';
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2002',
      clinicId: 18,
      status: ClaimStatus.Pending,
      reviewNote: null,
    } as ClinicClaimRequestEntity);
    clinicRepository.findOne.mockResolvedValue({
      id: 18,
      status: 1,
      isClaimed: 0,
      expireAt: null,
    } as ClinicEntity);
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '302',
      clinicId: 18,
      username: 'clinic_admin_18',
      passwordHash,
      status: 0,
      createdAt: new Date('2026-05-12T08:00:00.000Z'),
    } as ClinicAccountEntity);
    clinicAccountRepository.save.mockImplementation(
      async (entity) => entity as ClinicAccountEntity,
    );
    clinicRepository.save.mockImplementation(
      async (entity) => entity as ClinicEntity,
    );
    clinicClaimRequestRepository.save.mockImplementation(
      async (entity) => entity as ClinicClaimRequestEntity,
    );

    const result = await service.reviewClinicClaimRequest('901', 2002, {
      action: ClaimStatus.Approved,
      note: '恢复原账号',
    });

    expect(clinicAccountRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '302',
        status: 1,
      }),
    );
    expect(result.clinicAccount).toMatchObject({
      clinicAccountId: 302,
      username: 'clinic_admin_18',
      temporaryPassword: null,
    });
    expect(result.reviewNote).toContain('密码沿用原账号密码');
  });

  it('rejects a clinic claim request without creating clinic account', async () => {
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2004',
      clinicId: 22,
      status: ClaimStatus.Pending,
      reviewNote: null,
    } as ClinicClaimRequestEntity);
    clinicClaimRequestRepository.save.mockImplementation(
      async (entity) => entity as ClinicClaimRequestEntity,
    );

    const result = await service.reviewClinicClaimRequest('901', 2004, {
      action: ClaimStatus.Rejected,
      note: '证照照片模糊，无法核验',
    });

    expect(clinicRepository.findOne).not.toHaveBeenCalled();
    expect(clinicAccountRepository.findOne).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 2004,
      status: ClaimStatus.Rejected,
      reviewedAt: expect.any(Date),
      reviewNote: '证照照片模糊，无法核验',
      reviewedBy: 901,
      clinicAccount: null,
    });
  });

  it('rejects claim review when request is already in terminal status', async () => {
    clinicClaimRequestRepository.findOne.mockResolvedValue({
      id: '2005',
      clinicId: 22,
      status: ClaimStatus.Approved,
      reviewNote: '已审核',
    } as ClinicClaimRequestEntity);

    await expect(
      service.reviewClinicClaimRequest('901', 2005, {
        action: ClaimStatus.Rejected,
        note: '重复审核',
      }),
    ).rejects.toThrow('当前认领申请状态不允许继续审核');
  });

  it('throws when clinic detail target does not exist', async () => {
    redisService.get.mockResolvedValue(null);
    dataSource.query.mockResolvedValueOnce([]);

    await expect(service.getClinicDetail(404, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns clinic detail directly from redis cache when available', async () => {
    redisService.get.mockResolvedValue(
      JSON.stringify({
        id: 1,
        name: '爱宠动物医院',
        address: '北京市朝阳区建国路88号',
        lat: 39.9075,
        lng: 116.4574,
        distance: 1234,
        phone: '010-12345678',
        wechat: 'aichong_hospital',
        businessHours: '09:00-21:00',
        city: '北京',
        district: '朝阳区',
        summary: null,
        coverPhotoUrl: null,
        galleryPhotos: [],
        capabilityProfileStatus: 'verified',
        scores: {
          trust: 85.5,
          value: 78.3,
          experience: 82.1,
          social: 75,
          riskPenalty: 0,
          reputation: 85.5,
          price: 78.3,
          confidenceFactor: 0.85,
        },
        tags: {},
        capabilities: {
          services: [],
          specialties: [],
          equipment: [],
          facilities: [],
          speciesSupported: [],
          highlights: [],
        },
        isClaimed: false,
      }),
    );

    await expect(
      service.getClinicDetail(1, {
        lat: 39.9075,
        lng: 116.4574,
      }),
    ).resolves.toEqual({
      id: 1,
      name: '爱宠动物医院',
      address: '北京市朝阳区建国路88号',
      lat: 39.9075,
      lng: 116.4574,
      distance: 1234,
      phone: '010-12345678',
      wechat: 'aichong_hospital',
      businessHours: '09:00-21:00',
      city: '北京',
      district: '朝阳区',
      summary: null,
      coverPhotoUrl: null,
      galleryPhotos: [],
      capabilityProfileStatus: 'verified',
      scores: {
        trust: 85.5,
        value: 78.3,
        experience: 82.1,
        social: 75,
        riskPenalty: 0,
        reputation: 85.5,
        price: 78.3,
        confidenceFactor: 0.85,
      },
      tags: {},
      capabilities: {
        services: [],
        specialties: [],
        equipment: [],
        facilities: [],
        speciesSupported: [],
        highlights: [],
      },
      isClaimed: false,
    });

    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('returns paginated nearby clinics with tag summaries', async () => {
    redisService.get.mockResolvedValue(null);
    redisService.set.mockResolvedValue('OK');
    dataSource.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          lat: 39.9075,
          lng: 116.4574,
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          reputationScore: 85.5,
          priceScore: 78.3,
          confidenceFactor: 0.85,
          isClaimed: 0,
          distance: 1234,
          totalUsers: 32,
        },
      ])
      .mockResolvedValueOnce([
        {
          clinicId: 1,
          id: 1,
          name: '不乱开药',
          category: 'trust',
          count: 23,
          totalTagCount: 56,
        },
        {
          clinicId: 1,
          id: 5,
          name: '价格透明',
          category: 'value',
          count: 18,
          totalTagCount: 56,
        },
      ]);

    await expect(
      service.getNearbyClinics({
        lat: 39.9075,
        lng: 116.4574,
        radius: 3000,
        sortType: 'reputation',
        city: '北京',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      list: [
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          distance: 1234,
          lat: 39.9075,
          lng: 116.4574,
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          reputationScore: 85.5,
          priceScore: 78.3,
          confidenceFactor: 0.85,
          topTags: [
            {
              id: 1,
              name: '不乱开药',
              count: 23,
              category: 'trust',
            },
            {
              id: 5,
              name: '价格透明',
              count: 18,
              category: 'value',
            },
          ],
          totalTagCount: 56,
          totalUsers: 32,
          isClaimed: false,
          capabilityHighlights: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    expect(redisService.get).toHaveBeenCalledWith(
      'clinics:nearby:%E5%8C%97%E4%BA%AC:39.907500:116.457400:3000:reputation:1:20:all:all-services:all-specialties:all-equipment:all-facilities',
    );
    expect(redisService.set).toHaveBeenCalledWith(
      'clinics:nearby:%E5%8C%97%E4%BA%AC:39.907500:116.457400:3000:reputation:1:20:all:all-services:all-specialties:all-equipment:all-facilities',
      expect.any(String),
      300,
    );
  });

  it('returns empty result when no clinic matches filters', async () => {
    redisService.get.mockResolvedValue(null);
    redisService.set.mockResolvedValue('OK');
    dataSource.query.mockResolvedValueOnce([{ total: 0 }]);

    await expect(
      service.getNearbyClinics({
        lat: 39.9075,
        lng: 116.4574,
        radius: 3000,
        sortType: 'price',
        city: '北京',
        page: 2,
        pageSize: 10,
        tagIds: [1, 2, 3],
      }),
    ).resolves.toEqual({
      list: [],
      total: 0,
      page: 2,
      pageSize: 10,
    });
  });

  it('returns nearby clinics directly from redis cache when available', async () => {
    redisService.get.mockResolvedValue(
      JSON.stringify({
        list: [
          {
            id: 1,
            name: '爱宠动物医院',
            address: '北京市朝阳区建国路88号',
            distance: 1234,
            lat: 39.9075,
            lng: 116.4574,
            phone: '010-12345678',
            businessHours: '09:00-21:00',
            reputationScore: 85.5,
            priceScore: 78.3,
            confidenceFactor: 0.85,
            topTags: [],
            totalTagCount: 0,
            totalUsers: 0,
            isClaimed: false,
            capabilityHighlights: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );

    await expect(
      service.getNearbyClinics({
        lat: 39.9075,
        lng: 116.4574,
        radius: 3000,
        sortType: 'reputation',
        city: '北京',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      list: [
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          distance: 1234,
          lat: 39.9075,
          lng: 116.4574,
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          reputationScore: 85.5,
          priceScore: 78.3,
          confidenceFactor: 0.85,
          topTags: [],
          totalTagCount: 0,
          totalUsers: 0,
          isClaimed: false,
          capabilityHighlights: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('returns approved clinic responses with tag names', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
    } as ClinicEntity);
    clinicTagResponseRepository.find.mockResolvedValue([
      {
        id: 71,
        clinicId: 1,
        tagId: 8,
        responseText: '我们已补充收费说明与项目公示。',
        status: ResponseStatus.Approved,
        createdAt: new Date('2026-05-11T10:00:00.000Z'),
        approvedAt: new Date('2026-05-11T12:00:00.000Z'),
        tag: {
          id: 8,
          name: '乱收费',
        },
      } as ClinicTagResponseEntity,
    ]);

    await expect(service.getClinicResponses(1)).resolves.toEqual({
      responses: [
        {
          id: 71,
          tagId: 8,
          tagName: '乱收费',
          responseText: '我们已补充收费说明与项目公示。',
          status: ResponseStatus.Approved,
          createdAt: new Date('2026-05-11T10:00:00.000Z'),
          approvedAt: new Date('2026-05-11T12:00:00.000Z'),
        },
      ],
    });

    expect(clinicTagResponseRepository.find).toHaveBeenCalledWith({
      where: {
        clinicId: 1,
        status: ResponseStatus.Approved,
      },
      relations: {
        tag: true,
      },
      order: {
        approvedAt: 'DESC',
        createdAt: 'DESC',
        id: 'DESC',
      },
    });
  });

  it('returns an empty response list when clinic has no approved responses', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
    } as ClinicEntity);
    clinicTagResponseRepository.find.mockResolvedValue([]);

    await expect(service.getClinicResponses(1)).resolves.toEqual({
      responses: [],
    });
  });

  it('throws when querying responses for a missing clinic', async () => {
    clinicRepository.findOne.mockResolvedValue(null);

    await expect(service.getClinicResponses(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a pending clinic response for a claimed clinic', async () => {
    const createdAt = new Date('2026-05-12T10:00:00.000Z');

    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
      isClaimed: 1,
      expireAt: new Date('2026-06-12T10:00:00.000Z'),
    } as ClinicEntity);
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '301',
      clinicId: 1,
      status: 1,
    } as ClinicAccountEntity);
    tagRepository.findOne.mockResolvedValue({
      id: 8,
      status: 1,
    } as TagEntity);
    clinicTagResponseRepository.findOne.mockResolvedValue(null);
    clinicTagResponseRepository.create.mockReturnValue({
      clinicId: 1,
      tagId: 8,
    } as ClinicTagResponseEntity);
    clinicTagResponseRepository.save.mockResolvedValue({
      id: 51,
      clinicId: 1,
      tagId: 8,
      responseText: '收费标准已在前台公示。',
      status: ResponseStatus.Pending,
      createdAt,
      approvedAt: null,
      approvedBy: null,
    } as ClinicTagResponseEntity);

    await expect(
      service.submitClinicResponse(
        1,
        {
          sub: '301',
          actorType: AuthActorType.Clinic,
          actorId: '301',
          clinicAccountId: '301',
          clinicId: 1,
          username: 'clinic_admin_1',
        },
        {
          tagId: 8,
          responseText: '  收费标准已在前台公示。  ',
        },
      ),
    ).resolves.toEqual({
      responseId: 51,
      status: ResponseStatus.Pending,
      createdAt,
    });

    expect(clinicTagResponseRepository.create).toHaveBeenCalledWith({
      clinicId: 1,
      tagId: 8,
    });
    expect(clinicTagResponseRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 1,
        tagId: 8,
        responseText: '收费标准已在前台公示。',
        status: ResponseStatus.Pending,
        approvedAt: null,
        approvedBy: null,
      }),
    );
  });

  it('updates an existing clinic response and resets approval status', async () => {
    const createdAt = new Date('2026-05-10T10:00:00.000Z');

    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
      isClaimed: 1,
      expireAt: null,
    } as ClinicEntity);
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '301',
      clinicId: 1,
      status: 1,
    } as ClinicAccountEntity);
    tagRepository.findOne.mockResolvedValue({
      id: 6,
      status: 1,
    } as TagEntity);
    clinicTagResponseRepository.findOne.mockResolvedValue({
      id: 88,
      clinicId: 1,
      tagId: 6,
      responseText: '旧回应',
      status: ResponseStatus.Approved,
      createdAt,
      approvedAt: new Date('2026-05-10T12:00:00.000Z'),
      approvedBy: '9001',
    } as ClinicTagResponseEntity);
    clinicTagResponseRepository.save.mockResolvedValue({
      id: 88,
      clinicId: 1,
      tagId: 6,
      responseText: '我们已优化分诊与告知流程。',
      status: ResponseStatus.Pending,
      createdAt,
      approvedAt: null,
      approvedBy: null,
    } as ClinicTagResponseEntity);

    await expect(
      service.submitClinicResponse(
        1,
        {
          sub: '301',
          actorType: AuthActorType.Clinic,
          actorId: '301',
          clinicAccountId: '301',
          clinicId: 1,
          username: 'clinic_admin_1',
        },
        {
          tagId: 6,
          responseText: '我们已优化分诊与告知流程。',
        },
      ),
    ).resolves.toEqual({
      responseId: 88,
      status: ResponseStatus.Pending,
      createdAt,
    });

    expect(clinicTagResponseRepository.create).not.toHaveBeenCalled();
    expect(clinicTagResponseRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 88,
        responseText: '我们已优化分诊与告知流程。',
        status: ResponseStatus.Pending,
        approvedAt: null,
        approvedBy: null,
      }),
    );
  });

  it('throws when the clinic actor tries to operate on another clinic', async () => {
    await expect(
      service.submitClinicResponse(
        2,
        {
          sub: '301',
          actorType: AuthActorType.Clinic,
          actorId: '301',
          clinicAccountId: '301',
          clinicId: 1,
          username: 'clinic_admin_1',
        },
        {
          tagId: 8,
          responseText: '收费标准已在前台公示。',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 20002,
        message: '当前诊所账号无权操作该诊所',
      },
    });
  });

  it('throws when the clinic has not been claimed', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
      isClaimed: 0,
      expireAt: null,
    } as ClinicEntity);
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '301',
      clinicId: 1,
      status: 1,
    } as ClinicAccountEntity);

    await expect(
      service.submitClinicResponse(
        1,
        {
          sub: '301',
          actorType: AuthActorType.Clinic,
          actorId: '301',
          clinicAccountId: '301',
          clinicId: 1,
          username: 'clinic_admin_1',
        },
        {
          tagId: 8,
          responseText: '收费标准已在前台公示。',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 40006,
        message: '请先认领诊所后再提交回应',
      },
    });
  });

  it('throws when response text exceeds the limit', async () => {
    await expect(
      service.submitClinicResponse(
        1,
        {
          sub: '301',
          actorType: AuthActorType.Clinic,
          actorId: '301',
          clinicAccountId: '301',
          clinicId: 1,
          username: 'clinic_admin_1',
        },
        {
          tagId: 8,
          responseText: '超'.repeat(201),
        },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 40007,
        message: '回应内容不能超过 200 字',
      },
    });
  });
});
