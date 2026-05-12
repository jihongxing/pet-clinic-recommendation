import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ClinicAccountEntity,
  ClinicClaimRequestEntity,
  ClinicEntity,
  ClinicTagResponseEntity,
  TagEntity,
} from '../../database/entities';
import { ClinicClaimRequestsController } from './clinic-claim-requests.controller';
import { ClinicsController } from './clinics.controller';
import { ClinicCacheService } from './services/clinic-cache.service';
import { ClinicScoreCronService } from './services/clinic-score-cron.service';
import { ClinicScoreRefreshService } from './services/clinic-score-refresh.service';
import { ScoreCalculatorService } from './services/score-calculator.service';
import { ClinicsService } from './clinics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicEntity,
      ClinicAccountEntity,
      ClinicClaimRequestEntity,
      ClinicTagResponseEntity,
      TagEntity,
    ]),
  ],
  controllers: [ClinicsController, ClinicClaimRequestsController],
  providers: [
    ClinicsService,
    ClinicCacheService,
    ScoreCalculatorService,
    ClinicScoreRefreshService,
    ClinicScoreCronService,
  ],
  exports: [
    ClinicCacheService,
    ScoreCalculatorService,
    ClinicScoreRefreshService,
  ],
})
export class ClinicsModule {}
