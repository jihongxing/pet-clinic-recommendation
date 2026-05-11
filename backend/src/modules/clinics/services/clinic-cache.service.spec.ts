import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../redis/redis.service';
import { ClinicCacheService } from './clinic-cache.service';

describe('ClinicCacheService', () => {
  let service: ClinicCacheService;
  let redisService: {
    deleteByPattern: jest.Mock;
  };

  beforeEach(async () => {
    redisService = {
      deleteByPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicCacheService,
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    service = module.get<ClinicCacheService>(ClinicCacheService);
  });

  it('invalidates clinic detail and nearby clinic caches after review', async () => {
    redisService.deleteByPattern
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);

    await expect(service.invalidateAfterReview(18)).resolves.toEqual({
      clinicId: 18,
      detailDeleted: 2,
      nearbyDeleted: 5,
    });

    expect(redisService.deleteByPattern).toHaveBeenNthCalledWith(
      1,
      'clinics:detail:18:*',
    );
    expect(redisService.deleteByPattern).toHaveBeenNthCalledWith(
      2,
      'clinics:nearby:*',
    );
  });

  it('swallows redis errors so review submission is not blocked', async () => {
    redisService.deleteByPattern.mockRejectedValue(
      new Error('redis unavailable'),
    );

    await expect(service.invalidateAfterReview(7)).resolves.toEqual({
      clinicId: 7,
      detailDeleted: 0,
      nearbyDeleted: 0,
    });
  });
});
