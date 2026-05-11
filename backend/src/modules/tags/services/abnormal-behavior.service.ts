import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  AbnormalBehaviorEntity,
  ReviewStatus,
} from '../../../database/entities';

export interface ReviewAbnormalCheckPayload {
  userId: string;
  clinicId: number;
  deviceId?: string | null;
  ipAddress?: string | null;
}

const DAILY_REVIEW_THRESHOLD = 5;
const HOURLY_IP_REVIEW_THRESHOLD = 20;
const DEVICE_MULTI_ACCOUNT_THRESHOLD = 3;

@Injectable()
export class AbnormalBehaviorService {
  private readonly logger = new Logger(AbnormalBehaviorService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AbnormalBehaviorEntity)
    private readonly abnormalBehaviorRepository: Repository<AbnormalBehaviorEntity>,
  ) {}

  async recordReviewAbnormalities(payload: ReviewAbnormalCheckPayload) {
    try {
      const [dailyReviewCount, hourlyIpReviewCount, deviceLinkedUserCount] =
        await Promise.all([
          this.loadDailyReviewCount(payload.userId),
          this.loadHourlyIpReviewCount(payload.ipAddress ?? null),
          this.loadDeviceLinkedUserCount(payload.deviceId ?? null),
        ]);

      const logs: AbnormalBehaviorEntity[] = [];

      if (dailyReviewCount > DAILY_REVIEW_THRESHOLD) {
        logs.push(
          this.abnormalBehaviorRepository.create({
            userId: payload.userId,
            clinicId: payload.clinicId,
            deviceId: payload.deviceId?.trim() || null,
            ipAddress: payload.ipAddress?.trim() || null,
            behaviorType: 'user_daily_review_limit_exceeded',
            details: {
              count: dailyReviewCount,
              threshold: DAILY_REVIEW_THRESHOLD,
              window: '24h',
            },
          }),
        );
      }

      if (
        payload.ipAddress?.trim() &&
        hourlyIpReviewCount > HOURLY_IP_REVIEW_THRESHOLD
      ) {
        logs.push(
          this.abnormalBehaviorRepository.create({
            userId: payload.userId,
            clinicId: payload.clinicId,
            deviceId: payload.deviceId?.trim() || null,
            ipAddress: payload.ipAddress.trim(),
            behaviorType: 'ip_hourly_review_limit_exceeded',
            details: {
              count: hourlyIpReviewCount,
              threshold: HOURLY_IP_REVIEW_THRESHOLD,
              window: '1h',
            },
          }),
        );
      }

      if (
        payload.deviceId?.trim() &&
        deviceLinkedUserCount >= DEVICE_MULTI_ACCOUNT_THRESHOLD
      ) {
        logs.push(
          this.abnormalBehaviorRepository.create({
            userId: payload.userId,
            clinicId: payload.clinicId,
            deviceId: payload.deviceId.trim(),
            ipAddress: payload.ipAddress?.trim() || null,
            behaviorType: 'device_multi_account',
            details: {
              distinctUsers: deviceLinkedUserCount,
              threshold: DEVICE_MULTI_ACCOUNT_THRESHOLD,
              window: '30d',
            },
          }),
        );
      }

      if (logs.length === 0) {
        return [];
      }

      return this.abnormalBehaviorRepository.save(logs);
    } catch (error) {
      this.logger.warn(
        `Failed to record abnormal behaviors for userId=${payload.userId}, clinicId=${payload.clinicId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );

      return [];
    }
  }

  private async loadDailyReviewCount(userId: string) {
    const rows = await this.dataSource.query<{ count: number | string }[]>(
      `
        SELECT COUNT(*)::int AS count
        FROM clinic_review
        WHERE user_id = $1
          AND status = $2
          AND submitted_at >= NOW() - INTERVAL '24 hours';
      `,
      [userId, ReviewStatus.Submitted],
    );

    return Number(rows[0]?.count ?? 0);
  }

  private async loadHourlyIpReviewCount(ipAddress: string | null) {
    if (!ipAddress) {
      return 0;
    }

    const rows = await this.dataSource.query<{ count: number | string }[]>(
      `
        SELECT COUNT(DISTINCT review_id)::int AS count
        FROM user_tag_log
        WHERE ip_address = $1
          AND created_at >= NOW() - INTERVAL '1 hour';
      `,
      [ipAddress],
    );

    return Number(rows[0]?.count ?? 0);
  }

  private async loadDeviceLinkedUserCount(deviceId: string | null) {
    if (!deviceId) {
      return 0;
    }

    const rows = await this.dataSource.query<{ count: number | string }[]>(
      `
        SELECT COUNT(DISTINCT user_id)::int AS count
        FROM user_tag_log
        WHERE device_id = $1
          AND created_at >= NOW() - INTERVAL '30 days';
      `,
      [deviceId],
    );

    return Number(rows[0]?.count ?? 0);
  }
}
