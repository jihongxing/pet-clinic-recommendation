import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ClinicCacheService {
  private readonly logger = new Logger(ClinicCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async invalidateAfterReview(clinicId: number) {
    try {
      const [detailDeleted, nearbyDeleted] = await Promise.all([
        this.redisService.deleteByPattern(
          this.buildClinicDetailPattern(clinicId),
        ),
        this.redisService.deleteByPattern(this.buildNearbyClinicPattern()),
      ]);

      return {
        clinicId,
        detailDeleted,
        nearbyDeleted,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate clinic caches for clinicId=${clinicId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );

      return {
        clinicId,
        detailDeleted: 0,
        nearbyDeleted: 0,
      };
    }
  }

  private buildClinicDetailPattern(clinicId: number) {
    return `clinics:detail:${clinicId}:*`;
  }

  private buildNearbyClinicPattern() {
    return 'clinics:nearby:*';
  }
}
