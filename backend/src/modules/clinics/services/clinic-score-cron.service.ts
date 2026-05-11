import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ClinicScoreRefreshService } from './clinic-score-refresh.service';

@Injectable()
export class ClinicScoreCronService {
  private readonly logger = new Logger(ClinicScoreCronService.name);

  constructor(
    private readonly clinicScoreRefreshService: ClinicScoreRefreshService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshScores() {
    const summary =
      await this.clinicScoreRefreshService.refreshAllClinicScores();

    this.logger.log(
      `Clinic score refresh completed, total=${summary.totalClinics}, updated=${summary.updatedClinics}, failed=${summary.failedClinics}`,
    );
  }
}
