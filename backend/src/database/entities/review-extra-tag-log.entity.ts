import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { ClinicReviewEntity } from './clinic-review.entity';
import { ExtraTagOptionEntity } from './extra-tag-option.entity';

@Entity({ name: 'review_extra_tag_log' })
@Index('idx_review_extra_tag_log_option', ['extraTagOptionId'])
export class ReviewExtraTagLogEntity {
  @PrimaryColumn({ name: 'review_id', type: 'bigint' })
  reviewId!: string;

  @PrimaryColumn({ name: 'extra_tag_option_id', type: 'integer' })
  extraTagOptionId!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => ClinicReviewEntity, (review) => review.reviewExtraTagLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review!: ClinicReviewEntity;

  @ManyToOne(
    () => ExtraTagOptionEntity,
    (extraTagOption) => extraTagOption.reviewExtraTagLogs,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'extra_tag_option_id' })
  extraTagOption!: ExtraTagOptionEntity;
}
