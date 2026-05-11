import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';
import { ClinicTagStatus } from './database.enums';
import { TagEntity } from './tag.entity';
import { numericTransformer } from './column.transformer';

@Entity({ name: 'clinic_tag_stat' })
@Index('idx_clinic_tag_stat_tag', ['tagId'])
@Index('idx_clinic_tag_stat_status', ['status'])
@Index('idx_clinic_tag_stat_count', ['count'])
export class ClinicTagStatEntity {
  @PrimaryColumn({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @PrimaryColumn({ name: 'tag_id', type: 'integer' })
  tagId!: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  count!: number;

  @Column({ name: 'unique_users', type: 'integer', default: 0 })
  uniqueUsers!: number;

  @Column({ name: 'first_tagged_at', type: 'timestamp', nullable: true })
  firstTaggedAt!: Date | null;

  @Column({ name: 'last_tagged_at', type: 'timestamp', nullable: true })
  lastTaggedAt!: Date | null;

  @Column({
    type: 'enum',
    enum: ClinicTagStatus,
    enumName: 'tag_status',
    default: ClinicTagStatus.New,
  })
  status!: ClinicTagStatus;

  @Column({
    name: 'display_weight',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 1,
    transformer: numericTransformer,
  })
  displayWeight!: number;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.clinicTagStats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.clinicTagStats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: TagEntity;
}
