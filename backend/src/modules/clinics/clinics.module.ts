import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  CapabilityDefinitionEntity,
  ClinicAccountEntity,
  ClinicCapabilityEntity,
  ClinicClaimRequestEntity,
  ClinicEntity,
  ClinicTagResponseEntity,
  TagEntity,
} from '../../database/entities';
import { AdminClinicCapabilitiesController } from './admin-clinic-capabilities.controller';
import { ClinicClaimRequestsController } from './clinic-claim-requests.controller';
import { ClinicsController } from './clinics.controller';
import { ClinicCacheService } from './services/clinic-cache.service';
import { ClinicCapabilityProfileService } from './services/clinic-capability-profile.service';
import { ClinicScoreCronService } from './services/clinic-score-cron.service';
import { ClinicScoreRefreshService } from './services/clinic-score-refresh.service';
import { ScoreCalculatorService } from './services/score-calculator.service';
import { ClinicsService } from './clinics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicEntity,
      CapabilityDefinitionEntity,
      ClinicCapabilityEntity,
      ClinicAccountEntity,
      ClinicClaimRequestEntity,
      ClinicTagResponseEntity,
      TagEntity,
    ]),
  ],
  controllers: [
    ClinicsController,
    ClinicClaimRequestsController,
    AdminClinicCapabilitiesController,
  ],
  providers: [
    ClinicsService,
    ClinicCacheService,
    ClinicCapabilityProfileService,
    ScoreCalculatorService,
    ClinicScoreRefreshService,
    ClinicScoreCronService,
  ],
  exports: [
    ClinicCacheService,
    ClinicCapabilityProfileService,
    ScoreCalculatorService,
    ClinicScoreRefreshService,
  ],
})
export class ClinicsModule {}
