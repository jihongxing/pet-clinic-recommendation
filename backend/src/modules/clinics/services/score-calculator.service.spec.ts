import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { TagType } from '../../../database/entities';
import { ScoreCalculatorService } from './score-calculator.service';

describe('ScoreCalculatorService', () => {
  let service: ScoreCalculatorService;
  let dataSource: {
    query: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreCalculatorService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<ScoreCalculatorService>(ScoreCalculatorService);
  });

  it('calculates score breakdown from effective tags, social proof and risk signals', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          tagId: 1,
          category: 'trust',
          type: TagType.Positive,
          count: 6,
          uniqueUsers: 6,
          tagWeight: 1,
        },
        {
          tagId: 2,
          category: 'trust',
          type: TagType.Negative,
          count: 2,
          uniqueUsers: 2,
          tagWeight: 1,
        },
        {
          tagId: 3,
          category: 'value',
          type: TagType.Positive,
          count: 5,
          uniqueUsers: 4,
          tagWeight: 1,
        },
        {
          tagId: 4,
          category: 'experience',
          type: TagType.Positive,
          count: 3,
          uniqueUsers: 3,
          tagWeight: 1,
        },
      ])
      .mockResolvedValueOnce([{ uniqueUsers: 4 }])
      .mockResolvedValueOnce([{ totalUsers: 4, repeatUsers: 1 }])
      .mockResolvedValueOnce([
        { referrerUserId: '11', referralCount: 2 },
        { referrerUserId: '18', referralCount: 1 },
      ])
      .mockResolvedValueOnce([{ totalUsers: 10, activeUsers: 4 }])
      .mockResolvedValueOnce([
        {
          tagId: 9,
          uniqueUsers: 2,
          lastTaggedAt: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          tagWeight: 1,
        },
        {
          tagId: 10,
          uniqueUsers: 1,
          lastTaggedAt: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          tagWeight: 1,
        },
      ]);

    await expect(service.calculateClinicScore(12)).resolves.toEqual({
      clinicId: 12,
      trustScore: 50,
      valueScore: 25,
      experienceScore: 18.75,
      socialScore: 24.25,
      riskPenalty: 10,
      confidenceFactor: 0.8,
      finalScore: 32.16,
      reputationScore: 34.19,
      priceScore: 30.19,
    });
  });

  it('persists computed score fields back to clinic', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          tagId: 3,
          category: 'value',
          type: TagType.Positive,
          count: 10,
          uniqueUsers: 6,
          tagWeight: 1,
        },
      ])
      .mockResolvedValueOnce([{ uniqueUsers: 6 }])
      .mockResolvedValueOnce([{ totalUsers: 0, repeatUsers: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ totalUsers: 0, activeUsers: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const score = await service.persistClinicScore(6);

    expect(score).toMatchObject({
      clinicId: 6,
      trustScore: 0,
      valueScore: 100,
      experienceScore: 0,
      socialScore: 0,
      riskPenalty: 0,
      confidenceFactor: 0.5,
      finalScore: 42.5,
      reputationScore: 40,
      priceScore: 50,
    });
    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE clinic'),
      [0, 100, 0, 0, 0, 40, 50, 0.5, 6],
    );
  });

  it('falls back to base score when clinic lacks effective review evidence', async () => {
    dataSource.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ totalUsers: 0, repeatUsers: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ totalUsers: 0, activeUsers: 0 }])
      .mockResolvedValueOnce([]);

    await expect(service.calculateClinicScore(18)).resolves.toEqual({
      clinicId: 18,
      trustScore: 0,
      valueScore: 0,
      experienceScore: 0,
      socialScore: 0,
      riskPenalty: 0,
      confidenceFactor: 0,
      finalScore: 60,
      reputationScore: 60,
      priceScore: 60,
    });
  });
});
