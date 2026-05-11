import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ClinicReviewEntity,
  EmotionType,
  ExtraTagOptionEntity,
  ReviewSource,
  TagEntity,
  TagLayer,
  TagType,
} from '../../database/entities';
import { RedisService } from '../redis/redis.service';
import { TagsService } from './tags.service';
import { ReviewSubmissionService } from './services/review-submission.service';

describe('TagsService', () => {
  let service: TagsService;
  let repository: jest.Mocked<Repository<TagEntity>>;
  let extraTagOptionRepository: jest.Mocked<Repository<ExtraTagOptionEntity>>;
  let clinicReviewRepository: jest.Mocked<Repository<ClinicReviewEntity>>;
  let reviewSubmissionService: {
    submitReviewTransaction: jest.Mock;
  };
  let redisService: {
    setIfAbsent: jest.Mock;
    deleteIfEquals: jest.Mock;
  };

  beforeEach(async () => {
    reviewSubmissionService = {
      submitReviewTransaction: jest.fn(),
    };
    redisService = {
      setIfAbsent: jest.fn(),
      deleteIfEquals: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
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
          provide: getRepositoryToken(ClinicReviewEntity),
          useValue: {
            findAndCount: jest.fn(),
          },
        },
        {
          provide: ReviewSubmissionService,
          useValue: reviewSubmissionService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    repository = module.get(getRepositoryToken(TagEntity));
    extraTagOptionRepository = module.get(
      getRepositoryToken(ExtraTagOptionEntity),
    );
    clinicReviewRepository = module.get(getRepositoryToken(ClinicReviewEntity));
  });

  it('returns tags grouped by layer and category', async () => {
    repository.find.mockResolvedValue([
      {
        id: 1,
        name: '不乱开药',
        layer: TagLayer.L1,
        category: 'trust',
        type: TagType.Positive,
        weight: 1,
        sortOrder: 1,
        isUserSelect: 1,
        isDisplay: 1,
        status: 1,
      } as TagEntity,
      {
        id: 5,
        name: '价格透明',
        layer: TagLayer.L1,
        category: 'value',
        type: TagType.Positive,
        weight: 1,
        sortOrder: 5,
        isUserSelect: 1,
        isDisplay: 1,
        status: 1,
      } as TagEntity,
      {
        id: 24,
        name: '有价格争议记录',
        layer: TagLayer.L3,
        category: 'risk',
        type: TagType.Negative,
        weight: 1,
        sortOrder: 24,
        isUserSelect: 0,
        isDisplay: 1,
        status: 1,
      } as TagEntity,
    ]);

    await expect(service.getTags({})).resolves.toEqual({
      L1: {
        trust: [
          {
            id: 1,
            name: '不乱开药',
            weight: 1,
            sortOrder: 1,
          },
        ],
        value: [
          {
            id: 5,
            name: '价格透明',
            weight: 1,
            sortOrder: 5,
          },
        ],
      },
      L3: {
        risk: [
          {
            id: 24,
            name: '有价格争议记录',
            weight: 1,
            sortOrder: 24,
          },
        ],
      },
    });
  });

  it('applies layer and user selectable filters', async () => {
    repository.find.mockResolvedValue([]);

    await service.getTags({
      layer: TagLayer.L1,
      userSelectable: true,
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        status: 1,
        isDisplay: 1,
        layer: TagLayer.L1,
        isUserSelect: 1,
      },
      order: {
        layer: 'ASC',
        category: 'ASC',
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });
  });

  it('returns selection config for the requested emotion', async () => {
    repository.find.mockResolvedValue([
      {
        id: 1,
        name: '不乱开药',
        category: 'trust',
        sortOrder: 1,
        status: 1,
      } as TagEntity,
      {
        id: 2,
        name: '不过度检查',
        category: 'trust',
        sortOrder: 2,
        status: 1,
      } as TagEntity,
      {
        id: 3,
        name: '解释清楚病情',
        category: 'trust',
        sortOrder: 3,
        status: 1,
      } as TagEntity,
      {
        id: 5,
        name: '价格透明',
        category: 'value',
        sortOrder: 5,
        status: 1,
      } as TagEntity,
      {
        id: 10,
        name: '对宠物耐心',
        category: 'experience',
        sortOrder: 10,
        status: 1,
      } as TagEntity,
      {
        id: 11,
        name: '环境干净',
        category: 'experience',
        sortOrder: 11,
        status: 1,
      } as TagEntity,
    ]);
    extraTagOptionRepository.find.mockResolvedValue([
      {
        id: 1,
        name: '猫更友好',
        weight: 0.3,
        sortOrder: 1,
        status: 1,
      } as ExtraTagOptionEntity,
      {
        id: 2,
        name: '狗更友好',
        weight: 0.3,
        sortOrder: 2,
        status: 1,
      } as ExtraTagOptionEntity,
    ]);

    await expect(
      service.getTagSelectionConfig(EmotionType.Satisfied),
    ).resolves.toEqual({
      emotion: EmotionType.Satisfied,
      title: '请选择满意的原因（最多3个）',
      tags: [
        {
          id: 1,
          name: '医生很专业',
          mappedTagId: 1,
          mappedTagName: '不乱开药',
          category: 'trust',
        },
        {
          id: 2,
          name: '价格合理',
          mappedTagId: 5,
          mappedTagName: '价格透明',
          category: 'value',
        },
        {
          id: 3,
          name: '解释清楚',
          mappedTagId: 3,
          mappedTagName: '解释清楚病情',
          category: 'trust',
        },
        {
          id: 4,
          name: '不乱推荐检查',
          mappedTagId: 2,
          mappedTagName: '不过度检查',
          category: 'trust',
        },
        {
          id: 5,
          name: '对宠物很耐心',
          mappedTagId: 10,
          mappedTagName: '对宠物耐心',
          category: 'experience',
        },
        {
          id: 6,
          name: '环境干净',
          mappedTagId: 11,
          mappedTagName: '环境干净',
          category: 'experience',
        },
      ],
      extraTags: [
        {
          id: 1,
          name: '猫更友好',
          weight: 0.3,
        },
        {
          id: 2,
          name: '狗更友好',
          weight: 0.3,
        },
      ],
      limits: {
        minSelect: 1,
        maxSelect: 3,
        maxExtra: 2,
      },
    });
  });

  it('returns current user review history with tags and extra tags', async () => {
    clinicReviewRepository.findAndCount.mockResolvedValue([
      [
        {
          id: '9001',
          emotion: EmotionType.Satisfied,
          source: ReviewSource.Order,
          reviewText: '医生解释得很清楚',
          submittedAt: new Date('2026-05-12T08:00:00.000Z'),
          clinic: {
            id: 1,
            name: '安心宠物诊所',
            address: '上海市浦东新区测试路 1 号',
          },
          userTagLogs: [
            {
              tag: {
                id: 1,
                name: '不乱开药',
                category: 'trust',
              },
            },
            {
              tag: {
                id: 5,
                name: '价格透明',
                category: 'value',
              },
            },
          ],
          reviewExtraTagLogs: [
            {
              extraTagOption: {
                id: 2,
                name: '狗更友好',
              },
            },
          ],
        } as ClinicReviewEntity,
      ],
      1,
    ]);

    await expect(
      service.getMyReviews('user-1', {
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      list: [
        {
          id: 9001,
          clinic: {
            id: 1,
            name: '安心宠物诊所',
            address: '上海市浦东新区测试路 1 号',
          },
          emotion: EmotionType.Satisfied,
          source: ReviewSource.Order,
          reviewText: '医生解释得很清楚',
          submittedAt: new Date('2026-05-12T08:00:00.000Z'),
          tags: [
            {
              id: 1,
              name: '不乱开药',
              category: 'trust',
            },
            {
              id: 5,
              name: '价格透明',
              category: 'value',
            },
          ],
          extraTags: [
            {
              id: 2,
              name: '狗更友好',
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('submits review tags and returns simplified response', async () => {
    redisService.setIfAbsent.mockResolvedValue('OK');
    redisService.deleteIfEquals.mockResolvedValue(1);
    reviewSubmissionService.submitReviewTransaction.mockResolvedValue({
      reviewId: 9001,
      clinicId: 1,
      weight: 1,
      userWeight: 1,
      tagCount: 2,
      extraTagCount: 1,
    });

    await expect(
      service.submitTag(
        'user-1',
        {
          clinicId: 1,
          emotion: EmotionType.Satisfied,
          tagIds: [1, 5],
          extraTagIds: [30],
          source: ReviewSource.Order,
          reviewText: '医生解释得很清楚',
        },
        {
          ipAddress: '127.0.0.1',
          deviceId: 'device-1',
        },
      ),
    ).resolves.toEqual({
      success: true,
      weight: 1,
      userWeight: 1,
    });

    expect(
      reviewSubmissionService.submitReviewTransaction,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
      clinicId: 1,
      emotion: EmotionType.Satisfied,
      tagIds: [1, 5],
      extraTagIds: [30],
      source: ReviewSource.Order,
      reviewText: '医生解释得很清楚',
      ipAddress: '127.0.0.1',
      deviceId: 'device-1',
    });
    expect(redisService.setIfAbsent).toHaveBeenCalledWith(
      'review-submit:user-1:1',
      expect.any(String),
      10,
    );
    expect(redisService.deleteIfEquals).toHaveBeenCalledWith(
      'review-submit:user-1:1',
      expect.any(String),
    );
  });

  it('rejects repeated in-flight submissions with a clear error', async () => {
    redisService.setIfAbsent.mockResolvedValue(null);

    await expect(
      service.submitTag('user-1', {
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1],
      }),
    ).rejects.toMatchObject({
      response: {
        code: 40008,
        message: '评价提交中，请勿重复提交',
      },
    });

    expect(
      reviewSubmissionService.submitReviewTransaction,
    ).not.toHaveBeenCalled();
  });

  it('falls back to db flow when redis lock acquisition fails', async () => {
    redisService.setIfAbsent.mockRejectedValue(new Error('redis unavailable'));
    redisService.deleteIfEquals.mockRejectedValue(
      new Error('redis unavailable'),
    );
    reviewSubmissionService.submitReviewTransaction.mockResolvedValue({
      reviewId: 9002,
      clinicId: 2,
      weight: 0.5,
      userWeight: 1,
      tagCount: 1,
      extraTagCount: 0,
    });

    await expect(
      service.submitTag('user-1', {
        clinicId: 2,
        emotion: EmotionType.Neutral,
        tagIds: [2],
      }),
    ).resolves.toEqual({
      success: true,
      weight: 0.5,
      userWeight: 1,
    });
  });

  it('releases the submit lock when downstream review submission fails', async () => {
    redisService.setIfAbsent.mockResolvedValue('OK');
    redisService.deleteIfEquals.mockResolvedValue(1);
    reviewSubmissionService.submitReviewTransaction.mockRejectedValue(
      new Error('db transaction failed'),
    );

    await expect(
      service.submitTag('user-9', {
        clinicId: 9,
        emotion: EmotionType.Unsatisfied,
        tagIds: [1],
      }),
    ).rejects.toThrow('db transaction failed');

    expect(redisService.deleteIfEquals).toHaveBeenCalledWith(
      'review-submit:user-9:9',
      expect.any(String),
    );
  });
});
