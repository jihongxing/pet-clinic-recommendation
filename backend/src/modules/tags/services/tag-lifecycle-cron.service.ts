import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ClinicTagStatService } from './clinic-tag-stat.service';

@Injectable()
export class TagLifecycleCronService {
  private readonly logger = new Logger(TagLifecycleCronService.name);

  constructor(private readonly clinicTagStatService: ClinicTagStatService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshAllTagStatuses() {
    const updatedCount = await this.clinicTagStatService.refreshAllStatuses();

    this.logger.log(`Tag lifecycle refresh completed, updated=${updatedCount}`);
  }
}
