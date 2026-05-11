import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  ClinicAccountEntity,
  ClinicEntity,
  ClinicTagResponseEntity,
  ResponseStatus,
  TagEntity,
} from '../../database/entities';
import { AuthActorType } from '../auth/interfaces/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';
import { ClinicsService } from './clinics.service';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let dataSource: { query: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock };
  let clinicRepository: { findOne: jest.Mock };
  let clinicAccountRepository: { findOne: jest.Mock };
  let clinicTagResponseRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let tagRepository: { findOne: jest.Mock };

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
    };
    clinicAccountRepository = {
      findOne: jest.fn(),
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
          provide: getRepositoryToken(ClinicEntity),
          useValue: clinicRepository,
        },
        {
          provide: getRepositoryToken(ClinicAccountEntity),
          useValue: clinicAccountRepository,
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
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    expect(redisService.get).toHaveBeenCalledWith(
      'clinics:nearby:%E5%8C%97%E4%BA%AC:39.907500:116.457400:3000:reputation:1:20:all',
    );
    expect(redisService.set).toHaveBeenCalledWith(
      'clinics:nearby:%E5%8C%97%E4%BA%AC:39.907500:116.457400:3000:reputation:1:20:all',
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
