import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ClinicSubmissionReviewLogEntity } from './clinic-submission-review-log.entity';
import {
  ClinicSubmissionStatus,
  ClinicSubmissionType,
} from './database.enums';
import { ClinicEntity } from './clinic.entity';
import { numericTransformer } from './column.transformer';
import { UserEntity } from './user.entity';

@Entity({ name: 'clinic_submission' })
@Index('idx_clinic_submission_submitter', ['submitterUserId'])
@Index('idx_clinic_submission_clinic', ['clinicId'])
@Index('idx_clinic_submission_matched_clinic', ['matchedClinicId'])
@Index('idx_clinic_submission_status_created_at', ['status', 'createdAt'])
@Index('idx_clinic_submission_city_status', ['city', 'status'])
export class ClinicSubmissionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'submitter_user_id', type: 'bigint' })
  submitterUserId!: string;

  @Column({
    name: 'submission_type',
    type: 'enum',
    enum: ClinicSubmissionType,
    enumName: 'clinic_submission_type',
  })
  submissionType!: ClinicSubmissionType;

  @Column({ name: 'clinic_id', type: 'integer', nullable: true })
  clinicId!: number | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  district!: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: numericTransformer,
  })
  lat!: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: numericTransformer,
  })
  lng!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({
    name: 'business_hours',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  businessHours!: string | null;

  @Column({
    name: 'photos_json',
    type: 'jsonb',
    nullable: false,
    default: () => "'[]'::jsonb",
  })
  photosJson!: string[];

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @Column({
    type: 'enum',
    enum: ClinicSubmissionStatus,
    enumName: 'clinic_submission_status',
    default: ClinicSubmissionStatus.PendingReview,
  })
  status!: ClinicSubmissionStatus;

  @Column({ name: 'matched_clinic_id', type: 'integer', nullable: true })
  matchedClinicId!: number | null;

  @Column({ name: 'reviewed_by', type: 'bigint', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'review_note', type: 'varchar', length: 500, nullable: true })
  reviewNote!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submitter_user_id' })
  submitterUser!: UserEntity;

  @ManyToOne(() => ClinicEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity | null;

  @ManyToOne(() => ClinicEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'matched_clinic_id' })
  matchedClinic!: ClinicEntity | null;

  @OneToMany(
    () => ClinicSubmissionReviewLogEntity,
    (reviewLog) => reviewLog.submission,
  )
  reviewLogs!: ClinicSubmissionReviewLogEntity[];
}
