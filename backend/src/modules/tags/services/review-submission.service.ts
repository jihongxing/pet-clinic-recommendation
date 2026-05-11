import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
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

export interface SubmitReviewTransactionPayload {
  userId: string;
  clinicId: number;
  emotion: EmotionType;
  tagIds: number[];
  extraTagIds?: number[];
  source?: ReviewSource;
  orderId?: number | null;
  reviewText?: string | null;
  deviceId?: string | null;
  ipAddress?: string | null;
}

export interface SubmitReviewTransactionResult {
  reviewId: number;
  clinicId: number;
  weight: number;
  userWeight: number;
  tagCount: number;
  extraTagCount: number;
}

const PRIMARY_TAG_LIMIT = 3;
const EXTRA_TAG_LIMIT = 2;
const NEW_USER_WEIGHT_DAYS = 7;
const NEW_USER_REDUCED_WEIGHT = 0.7;

@Injectable()
export class ReviewSubmissionService {
  private readonly logger = new Logger(ReviewSubmissionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ClinicEntity)
    private readonly clinicRepository: Repository<ClinicEntity>,
    @InjectRepository(ClinicReviewEntity)
    private readonly clinicReviewRepository: Repository<ClinicReviewEntity>,
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    @InjectRepository(ExtraTagOptionEntity)
    private readonly extraTagOptionRepository: Repository<ExtraTagOptionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly clinicTagStatService: ClinicTagStatService,
    private readonly clinicCacheService: ClinicCacheService,
    private readonly scoreCalculatorService: ScoreCalculatorService,
    private readonly abnormalBehaviorService: AbnormalBehaviorService,
  ) {}

  async submitReviewTransaction(
    payload: SubmitReviewTransactionPayload,
  ): Promise<SubmitReviewTransactionResult> {
    const tagIds = this.normalizeIds(payload.tagIds);
    const extraTagIds = this.normalizeIds(payload.extraTagIds ?? []);
    const source = payload.source ?? ReviewSource.Normal;
    const weight = source === ReviewSource.Order ? 1 : 0.5;

    this.validateTagSelection(tagIds, extraTagIds);

    const existingReview = await this.clinicReviewRepository.findOne({
      where: {
        userId: payload.userId,
        clinicId: payload.clinicId,
      },
    });

    if (existingReview) {
      throw new ConflictException({
        code: RESPONSE_CODE.ALREADY_REVIEWED,
        message: '您已经为该诊所打过标签',
      });
    }

    const clinic = await this.clinicRepository.findOne({
      where: {
        id: payload.clinicId,
        status: 1,
      },
    });

    if (!clinic) {
      throw new NotFoundException({
        code: RESPONSE_CODE.CLINIC_NOT_FOUND,
        message: '诊所不存在',
      });
    }

    const tags = await this.tagRepository.find({
      where: {
        id: In(tagIds),
        status: 1,
        isUserSelect: 1,
      },
      order: {
        id: 'ASC',
      },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '存在无效的主标签',
      });
    }

    if (tags.some((tag) => tag.layer !== TagLayer.L1)) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '主标签必须为 L1 用户可选标签',
      });
    }

    const extraTagOptions =
      extraTagIds.length > 0
        ? await this.extraTagOptionRepository.find({
            where: {
              id: In(extraTagIds),
              status: 1,
            },
            order: {
              id: 'ASC',
            },
          })
        : [];

    if (extraTagOptions.length !== extraTagIds.length) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '存在无效的补充标签',
      });
    }

    const normalizedOrderId = await this.resolveOrderId(payload, source);
    const userWeight = await this.resolveUserWeight(
      payload.userId,
      payload.clinicId,
      source,
      normalizedOrderId,
    );

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const review = manager.create(ClinicReviewEntity, {
          userId: payload.userId,
          clinicId: payload.clinicId,
          orderId: normalizedOrderId,
          emotion: payload.emotion,
          source,
          reviewText: payload.reviewText?.trim() || null,
        });
        const savedReview = await manager.save(review);

        const tagLogs = tags.map((tag) =>
          manager.create(UserTagLogEntity, {
            reviewId: savedReview.id,
            userId: payload.userId,
            clinicId: payload.clinicId,
            tagId: tag.id,
            source: this.mapReviewSourceToTagSource(source),
            weight,
            userWeight,
            deviceId: payload.deviceId?.trim() || null,
            ipAddress: payload.ipAddress?.trim() || null,
          }),
        );
        await manager.save(tagLogs);

        if (extraTagOptions.length > 0) {
          const reviewExtraTagLogs = extraTagOptions.map((option) =>
            manager.create(ReviewExtraTagLogEntity, {
              reviewId: savedReview.id,
              extraTagOptionId: option.id,
            }),
          );
          await manager.save(reviewExtraTagLogs);
        }

        await this.clinicTagStatService.refreshStats(
          manager,
          payload.clinicId,
          tags.map((tag) => tag.id),
        );

        return {
          reviewId: Number(savedReview.id),
          clinicId: payload.clinicId,
          weight,
          userWeight,
          tagCount: tagLogs.length,
          extraTagCount: extraTagOptions.length,
        };
      });

      await this.refreshClinicRanking(payload.clinicId);
      await this.clinicCacheService.invalidateAfterReview(payload.clinicId);
      await this.abnormalBehaviorService.recordReviewAbnormalities({
        userId: payload.userId,
        clinicId: payload.clinicId,
        deviceId: payload.deviceId ?? null,
        ipAddress: payload.ipAddress ?? null,
      });

      return result;
    } catch (error) {
      if (this.isDuplicateReviewError(error)) {
        throw new ConflictException({
          code: RESPONSE_CODE.ALREADY_REVIEWED,
          message: '您已经为该诊所打过标签',
        });
      }

      throw error;
    }
  }

  private normalizeIds(ids: number[]) {
    return [
      ...new Set(
        ids
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private validateTagSelection(tagIds: number[], extraTagIds: number[]) {
    if (tagIds.length === 0) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_MISSING,
        message: '至少需要选择 1 个主标签',
      });
    }

    if (tagIds.length > PRIMARY_TAG_LIMIT) {
      throw new BadRequestException({
        code: RESPONSE_CODE.TAG_LIMIT_EXCEEDED,
        message: `主标签最多选择 ${PRIMARY_TAG_LIMIT} 个`,
      });
    }

    if (extraTagIds.length > EXTRA_TAG_LIMIT) {
      throw new BadRequestException({
        code: RESPONSE_CODE.TAG_LIMIT_EXCEEDED,
        message: `补充标签最多选择 ${EXTRA_TAG_LIMIT} 个`,
      });
    }
  }

  private async resolveOrderId(
    payload: SubmitReviewTransactionPayload,
    source: ReviewSource,
  ) {
    if (payload.orderId !== null && payload.orderId !== undefined) {
      const order = await this.ensureOrderBelongsToUser(
        String(payload.orderId),
        payload.userId,
        payload.clinicId,
      );

      if (source === ReviewSource.Order) {
        this.ensureOrderEligibleForHighWeight(order);
      }

      return order.id;
    }

    if (source !== ReviewSource.Order) {
      return null;
    }

    const order = await this.orderRepository.findOne({
      where: {
        userId: payload.userId,
        clinicId: payload.clinicId,
        status: OrderStatus.Confirmed,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    if (!order) {
      throw new BadRequestException({
        code: RESPONSE_CODE.ORDER_REQUIRED,
        message: '预约来源评价需要有效的预约记录',
      });
    }

    return order.id;
  }

  private async ensureOrderBelongsToUser(
    orderId: string,
    userId: string,
    clinicId: number,
  ) {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId,
        userId,
        clinicId,
      },
    });

    if (!order || order.status === OrderStatus.Cancelled) {
      throw new BadRequestException({
        code: RESPONSE_CODE.ORDER_REQUIRED,
        message: '无效的预约记录',
      });
    }

    return order;
  }

  private async resolveUserWeight(
    userId: string,
    clinicId: number,
    source: ReviewSource,
    orderId: string | null,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!user || !this.isNewUser(user.createdAt)) {
      return 1;
    }

    const hasOrderEvidence =
      source === ReviewSource.Order ||
      orderId !== null ||
      (await this.hasValidOrderEvidence(userId, clinicId));

    if (hasOrderEvidence) {
      return 1;
    }

    return NEW_USER_REDUCED_WEIGHT;
  }

  private isNewUser(createdAt: Date) {
    const diffInMilliseconds = Date.now() - createdAt.getTime();
    const userAgeInDays = Math.max(
      0,
      Math.floor(diffInMilliseconds / (24 * 60 * 60 * 1000)),
    );

    return userAgeInDays < NEW_USER_WEIGHT_DAYS;
  }

  private async hasValidOrderEvidence(userId: string, clinicId: number) {
    const order = await this.orderRepository.findOne({
      where: {
        userId,
        clinicId,
        status: In([OrderStatus.Clicked, OrderStatus.Confirmed]),
      },
      select: {
        id: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    return Boolean(order);
  }

  private ensureOrderEligibleForHighWeight(order: OrderEntity) {
    if (order.status !== OrderStatus.Confirmed) {
      throw new BadRequestException({
        code: RESPONSE_CODE.ORDER_REQUIRED,
        message: '预约来源评价需要已确认就诊的预约记录',
      });
    }
  }

  private mapReviewSourceToTagSource(source: ReviewSource) {
    return source === ReviewSource.Order ? TagSource.Order : TagSource.Normal;
  }

  private async refreshClinicRanking(clinicId: number) {
    try {
      await this.scoreCalculatorService.persistClinicScore(clinicId);
    } catch (error) {
      this.logger.warn(
        `Failed to refresh clinic ranking score for clinicId=${clinicId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private isDuplicateReviewError(error: unknown) {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = (
      error as QueryFailedError & {
        driverError?: { code?: string; constraint?: string };
      }
    ).driverError;

    return (
      driverError?.code === '23505' &&
      driverError.constraint === 'uk_clinic_review_user_clinic'
    );
  }
}
