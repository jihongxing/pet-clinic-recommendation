import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClinicReviewEntity } from './clinic-review.entity';
import { ClinicEntity } from './clinic.entity';
import { TagSource } from './database.enums';
import { TagEntity } from './tag.entity';
import { UserEntity } from './user.entity';
import { numericTransformer } from './column.transformer';

@Entity({ name: 'user_tag_log' })
@Unique('uk_user_tag_log_review_tag', ['reviewId', 'tagId'])
@Index('idx_user_tag_log_clinic', ['clinicId'])
@Index('idx_user_tag_log_user_clinic', ['userId', 'clinicId'])
@Index('idx_user_tag_log_tag', ['tagId'])
@Index('idx_user_tag_log_created_at', ['createdAt'])
@Index('idx_user_tag_log_source', ['source'])
@Index('idx_user_tag_log_review', ['reviewId'])
export class UserTagLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'review_id', type: 'bigint' })
  reviewId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'tag_id', type: 'integer' })
  tagId!: number;

  @Column({
    type: 'enum',
    enum: TagSource,
    enumName: 'tag_source',
    default: TagSource.Normal,
  })
  source!: TagSource;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 1,
    transformer: numericTransformer,
  })
  weight!: number;

  @Column({
    name: 'user_weight',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 1,
    transformer: numericTransformer,
  })
  userWeight!: number;

  @Column({
    name: 'final_weight',
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
    insert: false,
    update: false,
  })
  finalWeight!: number;

  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => ClinicReviewEntity, (review) => review.userTagLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review!: ClinicReviewEntity;

  @ManyToOne(() => UserEntity, (user) => user.userTagLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.userTagLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.userTagLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: TagEntity;
}
