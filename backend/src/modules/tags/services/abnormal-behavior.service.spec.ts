import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AbnormalBehaviorEntity } from '../../../database/entities';
import { AbnormalBehaviorService } from './abnormal-behavior.service';

describe('AbnormalBehaviorService', () => {
  let service: AbnormalBehaviorService;
  let dataSource: { query: jest.Mock };
  let abnormalBehaviorRepository: jest.Mocked<
    Repository<AbnormalBehaviorEntity>
  >;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbnormalBehaviorService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(AbnormalBehaviorEntity),
          useValue: {
            create: jest.fn((payload) => payload),
            save: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<AbnormalBehaviorService>(AbnormalBehaviorService);
    abnormalBehaviorRepository = module.get(
      getRepositoryToken(AbnormalBehaviorEntity),
    );
  });

  it('records abnormal behaviors for daily, ip and device anomalies', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ count: 6 }])
      .mockResolvedValueOnce([{ count: 21 }])
      .mockResolvedValueOnce([{ count: 3 }]);

    await service.recordReviewAbnormalities({
      userId: 'user-1',
      clinicId: 12,
      ipAddress: '127.0.0.1',
      deviceId: 'device-1',
    });

    expect(abnormalBehaviorRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          behaviorType: 'user_daily_review_limit_exceeded',
          details: expect.objectContaining({
            count: 6,
            threshold: 5,
          }),
        }),
        expect.objectContaining({
          behaviorType: 'ip_hourly_review_limit_exceeded',
          details: expect.objectContaining({
            count: 21,
            threshold: 20,
          }),
        }),
        expect.objectContaining({
          behaviorType: 'device_multi_account',
          details: expect.objectContaining({
            distinctUsers: 3,
            threshold: 3,
          }),
        }),
      ]),
    );
  });

  it('does not save anything when no anomaly threshold is hit', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }]);

    await expect(
      service.recordReviewAbnormalities({
        userId: 'user-2',
        clinicId: 9,
        ipAddress: '127.0.0.1',
        deviceId: 'device-2',
      }),
    ).resolves.toEqual([]);

    expect(abnormalBehaviorRepository.save).not.toHaveBeenCalled();
  });
});
