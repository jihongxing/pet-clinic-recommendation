import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  ClinicEntity,
  ClinicReviewEntity,
  EmotionType,
  ExtraTagOptionEntity,
  OrderEntity,
  OrderStatus,
  ReviewExtraTagLogEntity,
  ReviewSource,
  TagEntity,
  TagLayer,
  TagSource,
  UserEntity,
  UserTagLogEntity,
} from '../../../database/entities';
import { ClinicCacheService } from '../../clinics/services/clinic-cache.service';
import { ScoreCalculatorService } from '../../clinics/services/score-calculator.service';
import { AbnormalBehaviorService } from './abnormal-behavior.service';
import { ClinicTagStatService } from './clinic-tag-stat.service';
import { ReviewSubmissionService } from './review-submission.service';

describe('ReviewSubmissionService', () => {
  let service: ReviewSubmissionService;
  let clinicRepository: jest.Mocked<Repository<ClinicEntity>>;
  let clinicReviewRepository: jest.Mocked<Repository<ClinicReviewEntity>>;
  let tagRepository: jest.Mocked<Repository<TagEntity>>;
  let extraTagOptionRepository: jest.Mocked<Repository<ExtraTagOptionEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let orderRepository: jest.Mocked<Repository<OrderEntity>>;
  let clinicTagStatService: {
    refreshStats: jest.Mock;
  };
  let clinicCacheService: {
    invalidateAfterReview: jest.Mock;
  };
  let scoreCalculatorService: {
    persistClinicScore: jest.Mock;
  };
  let abnormalBehaviorService: {
    recordReviewAbnormalities: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(),
    };
    clinicTagStatService = {
      refreshStats: jest.fn().mockResolvedValue(undefined),
    };
    clinicCacheService = {
      invalidateAfterReview: jest.fn().mockResolvedValue({
        clinicId: 1,
        detailDeleted: 0,
        nearbyDeleted: 0,
      }),
    };
    scoreCalculatorService = {
      persistClinicScore: jest.fn().mockResolvedValue({
        clinicId: 1,
        trustScore: 0,
        valueScore: 0,
        experienceScore: 0,
        socialScore: 0,
        riskPenalty: 0,
        confidenceFactor: 0,
        finalScore: 60,
        reputationScore: 60,
        priceScore: 60,
      }),
    };
    abnormalBehaviorService = {
      recordReviewAbnormalities: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewSubmissionService,
        {
          provide: AbnormalBehaviorService,
          useValue: abnormalBehaviorService,
        },
        {
          provide: ScoreCalculatorService,
          useValue: scoreCalculatorService,
        },
        {
          provide: ClinicCacheService,
          useValue: clinicCacheService,
        },
        {
          provide: ClinicTagStatService,
          useValue: clinicTagStatService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(ClinicEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClinicReviewEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TagEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ExtraTagOptionEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewSubmissionService>(ReviewSubmissionService);
    clinicRepository = module.get(getRepositoryToken(ClinicEntity));
    clinicReviewRepository = module.get(getRepositoryToken(ClinicReviewEntity));
    tagRepository = module.get(getRepositoryToken(TagEntity));
    extraTagOptionRepository = module.get(
      getRepositoryToken(ExtraTagOptionEntity),
    );
    userRepository = module.get(getRepositoryToken(UserEntity));
    orderRepository = module.get(getRepositoryToken(OrderEntity));
  });

  it('writes clinic review, tag logs and extra tag logs in one transaction', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    clinicReviewRepository.findOne.mockResolvedValue(null);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
      {
        id: 5,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([
      {
        id: 30,
        status: 1,
      } as ExtraTagOptionEntity,
    ]);
    orderRepository.findOne.mockResolvedValue({
      id: '123',
      userId: 'user-1',
      clinicId: 1,
      status: OrderStatus.Confirmed,
    } as OrderEntity);

    const manager = {
      create: jest.fn((_entity, payload) => ({ ...payload })),
      save: jest
        .fn()
        .mockImplementationOnce(async (payload: ClinicReviewEntity) => ({
          ...payload,
          id: '9001',
        }))
        .mockImplementationOnce(async (payload: UserTagLogEntity[]) => payload)
        .mockImplementationOnce(
          async (payload: ReviewExtraTagLogEntity[]) => payload,
        ),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    await expect(
      service.submitReviewTransaction({
        userId: 'user-1',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1, 5],
        extraTagIds: [30],
        source: ReviewSource.Order,
        orderId: 123,
        reviewText: '  医生很耐心，解释很完整。  ',
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
      }),
    ).resolves.toEqual({
      reviewId: 9001,
      clinicId: 1,
      weight: 1,
      userWeight: 1,
      tagCount: 2,
      extraTagCount: 1,
    });

    expect(manager.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'user-1',
        clinicId: 1,
        orderId: '123',
        emotion: EmotionType.Satisfied,
        source: ReviewSource.Order,
        reviewText: '医生很耐心，解释很完整。',
      }),
    );
    expect(manager.save).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          reviewId: '9001',
          tagId: 1,
          source: TagSource.Order,
          weight: 1,
          userWeight: 1,
        }),
        expect.objectContaining({
          reviewId: '9001',
          tagId: 5,
          source: TagSource.Order,
          weight: 1,
          userWeight: 1,
        }),
      ]),
    );
    expect(manager.save).toHaveBeenNthCalledWith(
      3,
      expect.arrayContaining([
        expect.objectContaining({
          reviewId: '9001',
          extraTagOptionId: 30,
        }),
      ]),
    );
    expect(clinicTagStatService.refreshStats).toHaveBeenCalledWith(
      manager,
      1,
      [1, 5],
    );
    expect(scoreCalculatorService.persistClinicScore).toHaveBeenCalledWith(1);
    expect(clinicCacheService.invalidateAfterReview).toHaveBeenCalledWith(1);
    expect(
      abnormalBehaviorService.recordReviewAbnormalities,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
      clinicId: 1,
      deviceId: 'device-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('throws when clinic does not exist', async () => {
    clinicReviewRepository.findOne.mockResolvedValue(null);
    clinicRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    } as UserEntity);

    await expect(
      service.submitReviewTransaction({
        userId: 'user-1',
        clinicId: 999,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when selected main tags are invalid', async () => {
    clinicReviewRepository.findOne.mockResolvedValue(null);
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);

    await expect(
      service.submitReviewTransaction({
        userId: 'user-1',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1, 2],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when too many extra tags are selected', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    } as UserEntity);

    await expect(
      service.submitReviewTransaction({
        userId: 'user-1',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
        extraTagIds: [30, 31, 32],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws conflict when user has already reviewed the clinic', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    clinicReviewRepository.findOne.mockResolvedValue({
      id: '9001',
      userId: 'user-1',
      clinicId: 1,
    } as ClinicReviewEntity);

    await expect(
      service.submitReviewTransaction({
        userId: 'user-1',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
      }),
    ).rejects.toMatchObject({
      response: {
        code: 40001,
        message: '您已经为该诊所打过标签',
      },
    });
  });

  it('uses latest valid order when source is order and orderId is omitted', async () => {
    clinicReviewRepository.findOne.mockResolvedValue(null);
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([]);
    orderRepository.findOne.mockResolvedValue({
      id: '123',
      userId: 'user-1',
      clinicId: 1,
      status: OrderStatus.Confirmed,
    } as OrderEntity);

    const manager = {
      create: jest.fn((_entity, payload) => ({ ...payload })),
      save: jest
        .fn()
        .mockImplementationOnce(async (payload: ClinicReviewEntity) => ({
          ...payload,
          id: '9001',
        }))
        .mockImplementationOnce(async (payload: UserTagLogEntity[]) => payload),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    await service.submitReviewTransaction({
      userId: 'user-1',
      clinicId: 1,
      emotion: EmotionType.Satisfied,
      tagIds: [1],
      source: ReviewSource.Order,
    });

    expect(orderRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          clinicId: 1,
        }),
        order: {
          createdAt: 'DESC',
          id: 'DESC',
        },
      }),
    );
    expect(manager.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderId: '123',
        source: ReviewSource.Order,
      }),
    );
    expect(clinicTagStatService.refreshStats).toHaveBeenCalledWith(
      manager,
      1,
      [1],
    );
    expect(manager.save).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          userWeight: 1,
        }),
      ]),
    );
    expect(scoreCalculatorService.persistClinicScore).toHaveBeenCalledWith(1);
    expect(clinicCacheService.invalidateAfterReview).toHaveBeenCalledWith(1);
    expect(
      abnormalBehaviorService.recordReviewAbnormalities,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
      clinicId: 1,
      deviceId: null,
      ipAddress: null,
    });
  });

  it('still returns success when immediate score refresh fails after review commit', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-2',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    } as UserEntity);
    clinicReviewRepository.findOne.mockResolvedValue(null);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([]);
    scoreCalculatorService.persistClinicScore.mockRejectedValueOnce(
      new Error('score refresh failed'),
    );

    const manager = {
      create: jest.fn((_entity, payload) => ({ ...payload })),
      save: jest
        .fn()
        .mockImplementationOnce(async (payload: ClinicReviewEntity) => ({
          ...payload,
          id: '9002',
        }))
        .mockImplementationOnce(async (payload: UserTagLogEntity[]) => payload),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    await expect(
      service.submitReviewTransaction({
        userId: 'user-2',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
      }),
    ).resolves.toEqual({
      reviewId: 9002,
      clinicId: 1,
      weight: 0.5,
      userWeight: 0.7,
      tagCount: 1,
      extraTagCount: 0,
    });

    expect(scoreCalculatorService.persistClinicScore).toHaveBeenCalledWith(1);
    expect(clinicCacheService.invalidateAfterReview).toHaveBeenCalledWith(1);
    expect(
      abnormalBehaviorService.recordReviewAbnormalities,
    ).toHaveBeenCalledWith({
      userId: 'user-2',
      clinicId: 1,
      deviceId: null,
      ipAddress: null,
    });
  });

  it('throws when source is order but the provided order is not confirmed', async () => {
    clinicReviewRepository.findOne.mockResolvedValue(null);
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-4',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([]);
    orderRepository.findOne.mockResolvedValue({
      id: '124',
      userId: 'user-4',
      clinicId: 1,
      status: OrderStatus.Clicked,
    } as OrderEntity);

    await expect(
      service.submitReviewTransaction({
        userId: 'user-4',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
        source: ReviewSource.Order,
        orderId: 124,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 40003,
        message: '预约来源评价需要已确认就诊的预约记录',
      },
    });
  });

  it('throws when source is order but no confirmed order can be resolved', async () => {
    clinicReviewRepository.findOne.mockResolvedValue(null);
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-5',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([]);
    orderRepository.findOne.mockResolvedValue(null);

    await expect(
      service.submitReviewTransaction({
        userId: 'user-5',
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
        source: ReviewSource.Order,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 40003,
        message: '预约来源评价需要有效的预约记录',
      },
    });
  });

  it('lightly downweights new users without order evidence', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      status: 1,
    } as ClinicEntity);
    userRepository.findOne.mockResolvedValue({
      id: 'user-3',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    } as UserEntity);
    clinicReviewRepository.findOne.mockResolvedValue(null);
    tagRepository.find.mockResolvedValue([
      {
        id: 1,
        layer: TagLayer.L1,
        status: 1,
        isUserSelect: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([]);
    orderRepository.findOne.mockResolvedValue(null);

    const manager = {
      create: jest.fn((_entity, payload) => ({ ...payload })),
      save: jest
        .fn()
        .mockImplementationOnce(async (payload: ClinicReviewEntity) => ({
          ...payload,
          id: '9003',
        }))
        .mockImplementationOnce(async (payload: UserTagLogEntity[]) => payload),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    await service.submitReviewTransaction({
      userId: 'user-3',
      clinicId: 1,
      emotion: EmotionType.Satisfied,
      tagIds: [1],
      source: ReviewSource.Normal,
    });

    expect(manager.save).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          userWeight: 0.7,
          weight: 0.5,
        }),
      ]),
    );
    expect(
      abnormalBehaviorService.recordReviewAbnormalities,
    ).toHaveBeenCalledWith({
      userId: 'user-3',
      clinicId: 1,
      deviceId: null,
      ipAddress: null,
    });
  });
});
