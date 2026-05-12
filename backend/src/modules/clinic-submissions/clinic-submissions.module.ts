import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AdminUserEntity,
  ClinicEntity,
  ClinicSubmissionReviewLogEntity,
  ClinicSubmissionEntity,
  UserEntity,
} from '../../database/entities';
import { AdminClinicSubmissionsController } from './admin-clinic-submissions.controller';
import { ClinicSubmissionsController } from './clinic-submissions.controller';
import { ClinicSubmissionsService } from './clinic-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUserEntity,
      ClinicSubmissionEntity,
      ClinicSubmissionReviewLogEntity,
      ClinicEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    ClinicSubmissionsController,
    AdminClinicSubmissionsController,
  ],
  providers: [ClinicSubmissionsService],
})
export class ClinicSubmissionsModule {}
