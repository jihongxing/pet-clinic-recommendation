import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClinicsModule } from '../clinics/clinics.module';
import {
  AbnormalBehaviorEntity,
  ClinicEntity,
  ClinicReviewEntity,
  ClinicTagStatEntity,
  ExtraTagOptionEntity,
  OrderEntity,
  TagEntity,
  TagLifecycleLogEntity,
  UserEntity,
  UserTagLogEntity,
} from '../../database/entities';
import { TagsController } from './tags.controller';
import { ClinicTagStatService } from './services/clinic-tag-stat.service';
import { ReviewSubmissionService } from './services/review-submission.service';
import { AbnormalBehaviorService } from './services/abnormal-behavior.service';
import { TagLifecycleCronService } from './services/tag-lifecycle-cron.service';
import { TagsService } from './tags.service';

@Module({
  imports: [
    ClinicsModule,
    TypeOrmModule.forFeature([
      ClinicEntity,
      ClinicReviewEntity,
      ClinicTagStatEntity,
      TagLifecycleLogEntity,
      UserEntity,
      UserTagLogEntity,
      AbnormalBehaviorEntity,
      ExtraTagOptionEntity,
      TagEntity,
      OrderEntity,
    ]),
  ],
  controllers: [TagsController],
  providers: [
    TagsService,
    ReviewSubmissionService,
    AbnormalBehaviorService,
    ClinicTagStatService,
    TagLifecycleCronService,
  ],
  exports: [ReviewSubmissionService],
})
export class TagsModule {}
