import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  ClinicTagStatEntity,
  ClinicTagStatus,
  TagLifecycleLogEntity,
  UserTagLogEntity,
} from '../../../database/entities';

interface ClinicTagAggregateRow {
  clinicId: number | string;
  tagId: number | string;
  count: number | string;
  uniqueUsers: number | string;
  firstTaggedAt: Date | string | null;
  lastTaggedAt: Date | string | null;
}

interface ClinicTagLifecycleResult {
  status: ClinicTagStatus;
  displayWeight: number;
  triggerReason: string;
}

@Injectable()
export class ClinicTagStatService {
  constructor(private readonly dataSource: DataSource) {}

  async refreshStats(
    manager: EntityManager,
    clinicId: number,
    tagIds: number[],
  ): Promise<void> {
    const affectedTagIds = [
      ...new Set(
        tagIds.map((tagId) => Number(tagId)).filter((tagId) => tagId > 0),
      ),
    ];

    if (affectedTagIds.length === 0) {
      return;
    }

    const userTagLogRepository = manager.getRepository(UserTagLogEntity);
    const clinicTagStatRepository = manager.getRepository(ClinicTagStatEntity);
    const tagLifecycleLogRepository = manager.getRepository(
      TagLifecycleLogEntity,
    );

    const aggregates = await userTagLogRepository
      .createQueryBuilder('log')
      .select('log.clinicId', 'clinicId')
      .addSelect('log.tagId', 'tagId')
      .addSelect('SUM(log.finalWeight)', 'count')
      .addSelect('COUNT(DISTINCT log.userId)', 'uniqueUsers')
      .addSelect('MIN(log.createdAt)', 'firstTaggedAt')
      .addSelect('MAX(log.createdAt)', 'lastTaggedAt')
      .where('log.clinicId = :clinicId', { clinicId })
      .andWhere('log.tagId IN (:...tagIds)', { tagIds: affectedTagIds })
      .groupBy('log.clinicId')
      .addGroupBy('log.tagId')
      .getRawMany<ClinicTagAggregateRow>();

    if (aggregates.length === 0) {
      return;
    }

    const existingStats = await clinicTagStatRepository.find({
      where: {
        clinicId,
        tagId: In(affectedTagIds),
      },
    });
    const existingStatByTagId = new Map(
      existingStats.map((stat) => [stat.tagId, stat]),
    );

    const lifecycleLogs: TagLifecycleLogEntity[] = [];
    const statsToSave = aggregates.map((aggregate) => {
      const tagId = Number(aggregate.tagId);
      const existingStat = existingStatByTagId.get(tagId);
      const firstTaggedAt = this.toDate(aggregate.firstTaggedAt);
      const lastTaggedAt = this.toDate(aggregate.lastTaggedAt);
      const uniqueUsers = Number(aggregate.uniqueUsers);
      const previousStatus = existingStat?.status ?? null;
      const lifecycle = this.resolveLifecycle(
        uniqueUsers,
        firstTaggedAt,
        lastTaggedAt,
        previousStatus,
      );

      const stat =
        existingStat ??
        clinicTagStatRepository.create({
          clinicId,
          tagId,
        });

      stat.count = this.roundToTwo(Number(aggregate.count));
      stat.uniqueUsers = uniqueUsers;
      stat.firstTaggedAt = firstTaggedAt;
      stat.lastTaggedAt = lastTaggedAt;
      stat.status = lifecycle.status;
      stat.displayWeight = lifecycle.displayWeight;

      if (previousStatus !== lifecycle.status) {
        lifecycleLogs.push(
          tagLifecycleLogRepository.create({
            clinicId,
            tagId,
            oldStatus: previousStatus,
            newStatus: lifecycle.status,
            triggerReason: lifecycle.triggerReason,
          }),
        );
      }

      return stat;
    });

    await clinicTagStatRepository.save(statsToSave);

    if (lifecycleLogs.length > 0) {
      await tagLifecycleLogRepository.save(lifecycleLogs);
    }
  }

  async refreshAllStatuses(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const clinicTagStatRepository =
        manager.getRepository(ClinicTagStatEntity);
      const tagLifecycleLogRepository = manager.getRepository(
        TagLifecycleLogEntity,
      );
      const stats = await clinicTagStatRepository.find();

      if (stats.length === 0) {
        return 0;
      }

      const changedStats: ClinicTagStatEntity[] = [];
      const lifecycleLogs: TagLifecycleLogEntity[] = [];

      for (const stat of stats) {
        const lifecycle = this.resolveLifecycle(
          stat.uniqueUsers,
          stat.firstTaggedAt,
          stat.lastTaggedAt,
          stat.status,
        );
        const previousStatus = stat.status;
        const previousDisplayWeight = stat.displayWeight;
        const statusChanged = previousStatus !== lifecycle.status;
        const displayWeightChanged =
          previousDisplayWeight !== lifecycle.displayWeight;

        if (!statusChanged && !displayWeightChanged) {
          continue;
        }

        stat.status = lifecycle.status;
        stat.displayWeight = lifecycle.displayWeight;
        changedStats.push(stat);

        if (statusChanged) {
          lifecycleLogs.push(
            tagLifecycleLogRepository.create({
              clinicId: stat.clinicId,
              tagId: stat.tagId,
              oldStatus: previousStatus,
              newStatus: lifecycle.status,
              triggerReason: lifecycle.triggerReason,
            }),
          );
        }
      }

      if (changedStats.length > 0) {
        await clinicTagStatRepository.save(changedStats);
      }

      if (lifecycleLogs.length > 0) {
        await tagLifecycleLogRepository.save(lifecycleLogs);
      }

      return changedStats.length;
    });
  }

  private resolveLifecycle(
    uniqueUsers: number,
    firstTaggedAt: Date | null,
    lastTaggedAt: Date | null,
    previousStatus: ClinicTagStatus | null,
  ): ClinicTagLifecycleResult {
    if (lastTaggedAt && this.calculateDaysSince(lastTaggedAt) >= 90) {
      return {
        status: ClinicTagStatus.Expired,
        displayWeight: 0.5,
        triggerReason: 'inactive_over_90_days',
      };
    }

    if (
      uniqueUsers >= 10 &&
      firstTaggedAt &&
      this.calculateDaysSince(firstTaggedAt) >= 30
    ) {
      return {
        status: ClinicTagStatus.Stable,
        displayWeight: 1.2,
        triggerReason:
          previousStatus === ClinicTagStatus.Expired
            ? 'reactivated_and_reached_stable_threshold'
            : 'reached_stable_threshold',
      };
    }

    if (uniqueUsers >= 3) {
      return {
        status: ClinicTagStatus.Verified,
        displayWeight: 1,
        triggerReason:
          previousStatus === ClinicTagStatus.Expired
            ? 'reactivated_by_new_reviews'
            : 'reached_verified_threshold',
      };
    }

    return {
      status: ClinicTagStatus.New,
      displayWeight: 0.3,
      triggerReason:
        previousStatus === null
          ? 'initial_aggregation'
          : 'below_verified_threshold',
    };
  }

  private calculateDaysSince(date: Date) {
    const diffInMilliseconds = Date.now() - date.getTime();

    return Math.max(0, Math.floor(diffInMilliseconds / (24 * 60 * 60 * 1000)));
  }

  private roundToTwo(value: number) {
    return Math.round(value * 100) / 100;
  }

  private toDate(value: Date | string | null) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
