import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';
import { EmotionType, ReviewSource, ReviewStatus } from './database.enums';
import { OrderEntity } from './order.entity';
import { ReviewExtraTagLogEntity } from './review-extra-tag-log.entity';
import { UserEntity } from './user.entity';
import { UserTagLogEntity } from './user-tag-log.entity';

@Entity({ name: 'clinic_review' })
@Unique('uk_clinic_review_user_clinic', ['userId', 'clinicId'])
@Index('idx_clinic_review_clinic', ['clinicId'])
@Index('idx_clinic_review_order', ['orderId'])
@Index('idx_clinic_review_status', ['status'])
@Index('idx_clinic_review_submitted_at', ['submittedAt'])
export class ClinicReviewEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId!: string | null;

  @Column({ type: 'enum', enum: EmotionType, enumName: 'emotion_type' })
  emotion!: EmotionType;

  @Column({
    type: 'enum',
    enum: ReviewSource,
    enumName: 'review_source',
    default: ReviewSource.Normal,
  })
  source!: ReviewSource;

  @Column({ name: 'review_text', type: 'varchar', length: 500, nullable: true })
  reviewText!: string | null;

  @Column({
    name: 'submitted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt!: Date;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    enumName: 'review_status',
    default: ReviewStatus.Submitted,
  })
  status!: ReviewStatus;

  @ManyToOne(() => UserEntity, (user) => user.clinicReviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.clinicReviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @ManyToOne(() => OrderEntity, (order) => order.clinicReviews, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @OneToMany(() => UserTagLogEntity, (userTagLog) => userTagLog.review)
  userTagLogs!: UserTagLogEntity[];

  @OneToMany(
    () => ReviewExtraTagLogEntity,
    (reviewExtraTagLog) => reviewExtraTagLog.review,
  )
  reviewExtraTagLogs!: ReviewExtraTagLogEntity[];
}
