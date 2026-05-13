import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {
  ClinicSubmissionReviewAction,
  ClinicSubmissionStatus,
} from './database.enums';
import { ClinicSubmissionEntity } from './clinic-submission.entity';

@Entity({ name: 'clinic_submission_review_log' })
@Index('idx_clinic_submission_review_log_submission', ['submissionId'])
@Index('idx_clinic_submission_review_log_reviewer', ['reviewerId'])
@Index('idx_clinic_submission_review_log_created_at', ['createdAt'])
export class ClinicSubmissionReviewLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'submission_id', type: 'bigint' })
  submissionId!: string;

  @Column({ name: 'reviewer_id', type: 'bigint' })
  reviewerId!: string;

  @Column({
    type: 'enum',
    enum: ClinicSubmissionReviewAction,
    enumName: 'clinic_submission_review_action',
  })
  action!: ClinicSubmissionReviewAction;

  @Column({
    name: 'before_status',
    type: 'enum',
    enum: ClinicSubmissionStatus,
    enumName: 'clinic_submission_status',
  })
  beforeStatus!: ClinicSubmissionStatus;

  @Column({
    name: 'after_status',
    type: 'enum',
    enum: ClinicSubmissionStatus,
    enumName: 'clinic_submission_status',
  })
  afterStatus!: ClinicSubmissionStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(
    () => ClinicSubmissionEntity,
    (submission) => submission.reviewLogs,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'submission_id' })
  submission!: ClinicSubmissionEntity;
}
