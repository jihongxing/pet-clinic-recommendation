import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, In, Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import {
  ClinicReviewEntity,
  EmotionType,
  ExtraTagOptionEntity,
  ReviewSource,
  TagEntity,
  TagLayer,
} from '../../database/entities';
import { RedisService } from '../redis/redis.service';
import { GetMyReviewsQueryDto } from './dto/get-my-reviews-query.dto';
import { SubmitTagDto } from './dto/submit-tag.dto';
import { GetTagsQueryDto } from './dto/get-tags-query.dto';
import { ReviewSubmissionService } from './services/review-submission.service';

export interface TagListItem {
  id: number;
  name: string;
  weight: number;
  sortOrder: number;
}

export type TagListResponse = Partial<
  Record<TagLayer, Record<string, TagListItem[]>>
>;

interface SelectionOptionTemplate {
  id: number;
  name: string;
  mappedTagName: string;
  category: string;
}

interface SelectionConfigTemplate {
  title: string;
  tags: SelectionOptionTemplate[];
}

export interface TagSelectionOption {
  id: number;
  name: string;
  mappedTagId: number;
  mappedTagName: string;
  category: string;
}

export interface ExtraTagSelectionOption {
  id: number;
  name: string;
  weight: number;
}

export interface TagSelectionConfigResponse {
  emotion: EmotionType;
  title: string;
  tags: TagSelectionOption[];
  extraTags: ExtraTagSelectionOption[];
  limits: {
    minSelect: number;
    maxSelect: number;
    maxExtra: number;
  };
}

export interface SubmitTagResponse {
  success: true;
  weight: number;
  userWeight: number;
}

export interface MyReviewItem {
  id: number;
  clinic: {
    id: number;
    name: string;
    address: string;
  };
  emotion: EmotionType;
  source: ReviewSource;
  reviewText: string | null;
  submittedAt: Date;
  tags: Array<{
    id: number;
    name: string;
    category: string;
  }>;
  extraTags: Array<{
    id: number;
    name: string;
  }>;
}

export interface MyReviewsResponse {
  list: MyReviewItem[];
  total: number;
  page: number;
  pageSize: number;
}

const TAG_SELECTION_LIMITS = {
  minSelect: 1,
  maxSelect: 3,
  maxExtra: 2,
} as const;

const REVIEW_SUBMIT_LOCK_TTL_SECONDS = 10;

const TAG_SELECTION_CONFIG: Record<EmotionType, SelectionConfigTemplate> = {
  [EmotionType.Satisfied]: {
    title: '请选择满意的原因（最多3个）',
    tags: [
      {
        id: 1,
        name: '医生很专业',
        mappedTagName: '不乱开药',
        category: 'trust',
      },
      { id: 2, name: '价格合理', mappedTagName: '价格透明', category: 'value' },
      {
        id: 3,
        name: '解释清楚',
        mappedTagName: '解释清楚病情',
        category: 'trust',
      },
      {
        id: 4,
        name: '不乱推荐检查',
        mappedTagName: '不过度检查',
        category: 'trust',
      },
      {
        id: 5,
        name: '对宠物很耐心',
        mappedTagName: '对宠物耐心',
        category: 'experience',
      },
      {
        id: 6,
        name: '环境干净',
        mappedTagName: '环境干净',
        category: 'experience',
      },
    ],
  },
  [EmotionType.Neutral]: {
    title: '哪些方面还可以改进？（最多3个）',
    tags: [
      {
        id: 1,
        name: '价格略高',
        mappedTagName: '基础诊疗便宜',
        category: 'value',
      },
      {
        id: 2,
        name: '等待时间长',
        mappedTagName: '响应快',
        category: 'experience',
      },
      {
        id: 3,
        name: '沟通一般',
        mappedTagName: '解释清楚病情',
        category: 'trust',
      },
      {
        id: 4,
        name: '检查项目多',
        mappedTagName: '不过度检查',
        category: 'trust',
      },
      {
        id: 5,
        name: '环境一般',
        mappedTagName: '环境干净',
        category: 'experience',
      },
    ],
  },
  [EmotionType.Unsatisfied]: {
    title: '遇到了什么问题？（最多3个）',
    tags: [
      {
        id: 1,
        name: '乱收费',
        mappedTagName: '有价格争议记录',
        category: 'risk',
      },
      {
        id: 2,
        name: '过度检查',
        mappedTagName: '过度推荐手术嫌疑',
        category: 'risk',
      },
      {
        id: 3,
        name: '不专业',
        mappedTagName: '有过医疗纠纷',
        category: 'risk',
      },
      {
        id: 4,
        name: '体验差',
        mappedTagName: '用户投诉较多',
        category: 'risk',
      },
      {
        id: 5,
        name: '态度不好',
        mappedTagName: '用户投诉较多',
        category: 'risk',
      },
      {
        id: 6,
        name: '强推高价项目',
        mappedTagName: '有价格争议记录',
        category: 'risk',
      },
    ],
  },
};

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    @InjectRepository(ExtraTagOptionEntity)
    private readonly extraTagOptionRepository: Repository<ExtraTagOptionEntity>,
    @InjectRepository(ClinicReviewEntity)
    private readonly clinicReviewRepository: Repository<ClinicReviewEntity>,
    private readonly reviewSubmissionService: ReviewSubmissionService,
    private readonly redisService: RedisService,
  ) {}

  async getTags(query: GetTagsQueryDto) {
    const where: FindOptionsWhere<TagEntity> = {
      status: 1,
      isDisplay: 1,
      ...(query.layer ? { layer: query.layer } : {}),
      ...(query.userSelectable ? { isUserSelect: 1 } : {}),
    };

    const tags = await this.tagRepository.find({
      where,
      order: {
        layer: 'ASC',
        category: 'ASC',
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });

    return tags.reduce<TagListResponse>((accumulator, tag) => {
      const layerBucket = accumulator[tag.layer] ?? {};
      const categoryBucket = layerBucket[tag.category] ?? [];

      categoryBucket.push({
        id: tag.id,
        name: tag.name,
        weight: tag.weight,
        sortOrder: tag.sortOrder,
      });

      layerBucket[tag.category] = categoryBucket;
      accumulator[tag.layer] = layerBucket;

      return accumulator;
    }, {});
  }

  async getTagSelectionConfig(
    emotion: EmotionType,
  ): Promise<TagSelectionConfigResponse> {
    const config = TAG_SELECTION_CONFIG[emotion];
    const mappedTagNames = [
      ...new Set(config.tags.map((tag) => tag.mappedTagName)),
    ];
    const [tags, extraTagOptions] = await Promise.all([
      this.tagRepository.find({
        where: {
          name: In(mappedTagNames),
          status: 1,
        },
        order: {
          sortOrder: 'ASC',
          id: 'ASC',
        },
      }),
      this.extraTagOptionRepository.find({
        where: {
          status: 1,
        },
        order: {
          sortOrder: 'ASC',
          id: 'ASC',
        },
      }),
    ]);

    const tagByName = new Map(tags.map((tag) => [tag.name, tag]));

    return {
      emotion,
      title: config.title,
      tags: config.tags.map((option) => {
        const mappedTag = tagByName.get(option.mappedTagName);

        if (!mappedTag) {
          throw new Error(`Missing mapped tag: ${option.mappedTagName}`);
        }

        return {
          id: option.id,
          name: option.name,
          mappedTagId: mappedTag.id,
          mappedTagName: mappedTag.name,
          category: option.category,
        };
      }),
      extraTags: extraTagOptions.map((option) => ({
        id: option.id,
        name: option.name,
        weight: option.weight,
      })),
      limits: TAG_SELECTION_LIMITS,
    };
  }

  async submitTag(
    userId: string,
    payload: SubmitTagDto,
    context?: {
      ipAddress?: string | null;
      deviceId?: string | null;
    },
  ): Promise<SubmitTagResponse> {
    const lockKey = this.buildSubmitLockKey(userId, payload.clinicId);
    const lockValue = randomUUID();
    const lockAcquired = await this.acquireSubmitLock(lockKey, lockValue);

    if (!lockAcquired) {
      throw new ConflictException({
        code: RESPONSE_CODE.REPEAT_SUBMIT,
        message: '评价提交中，请勿重复提交',
      });
    }

    try {
      const result = await this.reviewSubmissionService.submitReviewTransaction(
        {
          userId,
          clinicId: payload.clinicId,
          emotion: payload.emotion,
          tagIds: payload.tagIds,
          extraTagIds: payload.extraTagIds,
          source: payload.source ?? ReviewSource.Normal,
          reviewText: payload.reviewText,
          ipAddress: context?.ipAddress ?? null,
          deviceId: context?.deviceId ?? null,
        },
      );

      return {
        success: true,
        weight: result.weight,
        userWeight: result.userWeight,
      };
    } finally {
      await this.releaseSubmitLock(lockKey, lockValue);
    }
  }

  async getMyReviews(
    userId: string,
    query: GetMyReviewsQueryDto,
  ): Promise<MyReviewsResponse> {
    const [reviews, total] = await this.clinicReviewRepository.findAndCount({
      where: {
        userId,
      },
      relations: {
        clinic: true,
        userTagLogs: {
          tag: true,
        },
        reviewExtraTagLogs: {
          extraTagOption: true,
        },
      },
      order: {
        submittedAt: 'DESC',
        id: 'DESC',
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      list: reviews.map((review) => ({
        id: Number(review.id),
        clinic: {
          id: review.clinic.id,
          name: review.clinic.name,
          address: review.clinic.address,
        },
        emotion: review.emotion,
        source: review.source,
        reviewText: review.reviewText,
        submittedAt: review.submittedAt,
        tags: review.userTagLogs.map((log) => ({
          id: log.tag.id,
          name: log.tag.name,
          category: log.tag.category,
        })),
        extraTags: review.reviewExtraTagLogs.map((log) => ({
          id: log.extraTagOption.id,
          name: log.extraTagOption.name,
        })),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private buildSubmitLockKey(userId: string, clinicId: number) {
    return `review-submit:${userId}:${clinicId}`;
  }

  private async acquireSubmitLock(key: string, value: string) {
    try {
      const result = await this.redisService.setIfAbsent(
        key,
        value,
        REVIEW_SUBMIT_LOCK_TTL_SECONDS,
      );

      return result === 'OK';
    } catch {
      return true;
    }
  }

  private async releaseSubmitLock(key: string, value: string) {
    try {
      await this.redisService.deleteIfEquals(key, value);
    } catch {
      // Ignore Redis release failures; DB uniqueness still protects final consistency.
    }
  }
}
