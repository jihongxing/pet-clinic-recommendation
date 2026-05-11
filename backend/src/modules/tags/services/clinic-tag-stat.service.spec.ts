import { EntityManager } from 'typeorm';

import {
  ClinicTagStatEntity,
  ClinicTagStatus,
  TagLifecycleLogEntity,
  UserTagLogEntity,
} from '../../../database/entities';
import { ClinicTagStatService } from './clinic-tag-stat.service';

describe('ClinicTagStatService', () => {
  let service: ClinicTagStatService;
  let dataSource: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn(),
    };
    service = new ClinicTagStatService(dataSource as never);
  });

  it('recomputes stats and writes lifecycle log for newly verified tags', async () => {
    const getRawMany = jest.fn().mockResolvedValue([
      {
        clinicId: 1,
        tagId: 5,
        count: '3.50',
        uniqueUsers: '4',
        firstTaggedAt: '2026-05-01T08:00:00.000Z',
        lastTaggedAt: '2026-05-12T08:00:00.000Z',
      },
    ]);
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany,
    };
    const userTagLogRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const clinicTagStatRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue([]),
    };
    const tagLifecycleLogRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === UserTagLogEntity) {
          return userTagLogRepository;
        }

        if (entity === ClinicTagStatEntity) {
          return clinicTagStatRepository;
        }

        if (entity === TagLifecycleLogEntity) {
          return tagLifecycleLogRepository;
        }

        throw new Error('Unexpected repository request');
      }),
    } as unknown as EntityManager;

    await service.refreshStats(manager, 1, [5]);

    expect(clinicTagStatRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        clinicId: 1,
        tagId: 5,
        count: 3.5,
        uniqueUsers: 4,
        status: ClinicTagStatus.Verified,
        displayWeight: 1,
      }),
    ]);
    expect(tagLifecycleLogRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        clinicId: 1,
        tagId: 5,
        oldStatus: null,
        newStatus: ClinicTagStatus.Verified,
        triggerReason: 'reached_verified_threshold',
      }),
    ]);
  });

  it('marks long-lived tags as stable and stale tags as expired', async () => {
    const now = Date.now();
    const getRawMany = jest.fn().mockResolvedValue([
      {
        clinicId: 1,
        tagId: 7,
        count: '10.00',
        uniqueUsers: '10',
        firstTaggedAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
        lastTaggedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        clinicId: 1,
        tagId: 9,
        count: '2.50',
        uniqueUsers: '2',
        firstTaggedAt: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(),
        lastTaggedAt: new Date(now - 95 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany,
    };
    const userTagLogRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const clinicTagStatRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue([]),
    };
    const tagLifecycleLogRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === UserTagLogEntity) {
          return userTagLogRepository;
        }

        if (entity === ClinicTagStatEntity) {
          return clinicTagStatRepository;
        }

        if (entity === TagLifecycleLogEntity) {
          return tagLifecycleLogRepository;
        }

        throw new Error('Unexpected repository request');
      }),
    } as unknown as EntityManager;

    await service.refreshStats(manager, 1, [7, 9]);

    expect(clinicTagStatRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tagId: 7,
          status: ClinicTagStatus.Stable,
          displayWeight: 1.2,
        }),
        expect.objectContaining({
          tagId: 9,
          status: ClinicTagStatus.Expired,
          displayWeight: 0.5,
        }),
      ]),
    );
    expect(tagLifecycleLogRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tagId: 7,
          newStatus: ClinicTagStatus.Stable,
          triggerReason: 'reached_stable_threshold',
        }),
        expect.objectContaining({
          tagId: 9,
          newStatus: ClinicTagStatus.Expired,
          triggerReason: 'inactive_over_90_days',
        }),
      ]),
    );
  });

  it('refreshes all existing statuses and only logs actual state transitions', async () => {
    const stats = [
      {
        clinicId: 1,
        tagId: 3,
        uniqueUsers: 12,
        firstTaggedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        lastTaggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: ClinicTagStatus.Verified,
        displayWeight: 1,
      },
      {
        clinicId: 1,
        tagId: 8,
        uniqueUsers: 2,
        firstTaggedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        lastTaggedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        status: ClinicTagStatus.Expired,
        displayWeight: 0.3,
      },
    ] as ClinicTagStatEntity[];
    const clinicTagStatRepository = {
      find: jest.fn().mockResolvedValue(stats),
      save: jest.fn().mockResolvedValue([]),
    };
    const tagLifecycleLogRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === ClinicTagStatEntity) {
          return clinicTagStatRepository;
        }

        if (entity === TagLifecycleLogEntity) {
          return tagLifecycleLogRepository;
        }

        throw new Error('Unexpected repository request');
      }),
    } as unknown as EntityManager;

    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    await expect(service.refreshAllStatuses()).resolves.toBe(2);

    expect(clinicTagStatRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tagId: 3,
          status: ClinicTagStatus.Stable,
          displayWeight: 1.2,
        }),
        expect.objectContaining({
          tagId: 8,
          status: ClinicTagStatus.Expired,
          displayWeight: 0.5,
        }),
      ]),
    );
    expect(tagLifecycleLogRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        clinicId: 1,
        tagId: 3,
        oldStatus: ClinicTagStatus.Verified,
        newStatus: ClinicTagStatus.Stable,
        triggerReason: 'reached_stable_threshold',
      }),
    ]);
  });
});
