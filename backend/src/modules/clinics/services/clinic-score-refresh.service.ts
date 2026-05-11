import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ScoreCalculatorService } from './score-calculator.service';

interface ActiveClinicRow {
  id: number | string;
}

export interface ClinicScoreRefreshSummary {
  totalClinics: number;
  updatedClinics: number;
  failedClinics: number;
  failedClinicIds: number[];
}

@Injectable()
export class ClinicScoreRefreshService {
  private readonly logger = new Logger(ClinicScoreRefreshService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly scoreCalculatorService: ScoreCalculatorService,
  ) {}

  async refreshAllClinicScores(): Promise<ClinicScoreRefreshSummary> {
    const clinicRows = await this.dataSource.query<ActiveClinicRow[]>(
      `
        SELECT id
        FROM clinic
        WHERE status = 1
        ORDER BY id ASC;
      `,
    );

    const failedClinicIds: number[] = [];
    let updatedClinics = 0;

    for (const row of clinicRows) {
      const clinicId = Number(row.id);

      try {
        await this.scoreCalculatorService.persistClinicScore(clinicId);
        updatedClinics += 1;
      } catch (error) {
        failedClinicIds.push(clinicId);
        this.logger.error(
          `Failed to refresh clinic score for clinicId=${clinicId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      totalClinics: clinicRows.length,
      updatedClinics,
      failedClinics: failedClinicIds.length,
      failedClinicIds,
    };
  }
}
