import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { ClinicScoreRefreshService } from './clinic-score-refresh.service';
import { ScoreCalculatorService } from './score-calculator.service';

describe('ClinicScoreRefreshService', () => {
  let service: ClinicScoreRefreshService;
  let dataSource: {
    query: jest.Mock;
  };
  let scoreCalculatorService: {
    persistClinicScore: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };
    scoreCalculatorService = {
      persistClinicScore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicScoreRefreshService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ScoreCalculatorService,
          useValue: scoreCalculatorService,
        },
      ],
    }).compile();

    service = module.get<ClinicScoreRefreshService>(ClinicScoreRefreshService);
  });

  it('refreshes scores for all active clinics', async () => {
    dataSource.query.mockResolvedValue([{ id: 1 }, { id: 3 }, { id: 7 }]);
    scoreCalculatorService.persistClinicScore.mockResolvedValue(undefined);

    await expect(service.refreshAllClinicScores()).resolves.toEqual({
      totalClinics: 3,
      updatedClinics: 3,
      failedClinics: 0,
      failedClinicIds: [],
    });

    expect(scoreCalculatorService.persistClinicScore).toHaveBeenNthCalledWith(
      1,
      1,
    );
    expect(scoreCalculatorService.persistClinicScore).toHaveBeenNthCalledWith(
      2,
      3,
    );
    expect(scoreCalculatorService.persistClinicScore).toHaveBeenNthCalledWith(
      3,
      7,
    );
  });

  it('continues refreshing remaining clinics when one refresh fails', async () => {
    dataSource.query.mockResolvedValue([{ id: 2 }, { id: 5 }]);
    scoreCalculatorService.persistClinicScore
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    await expect(service.refreshAllClinicScores()).resolves.toEqual({
      totalClinics: 2,
      updatedClinics: 1,
      failedClinics: 1,
      failedClinicIds: [2],
    });

    expect(scoreCalculatorService.persistClinicScore).toHaveBeenCalledTimes(2);
    expect(scoreCalculatorService.persistClinicScore).toHaveBeenLastCalledWith(
      5,
    );
  });
});
