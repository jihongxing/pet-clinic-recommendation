import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';
import { TagEntity } from './tag.entity';

@Entity({ name: 'tag_lifecycle_log' })
@Index('idx_tag_lifecycle_log_clinic_tag', ['clinicId', 'tagId'])
@Index('idx_tag_lifecycle_log_created_at', ['createdAt'])
export class TagLifecycleLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'tag_id', type: 'integer' })
  tagId!: number;

  @Column({ name: 'old_status', type: 'varchar', length: 20, nullable: true })
  oldStatus!: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 20 })
  newStatus!: string;

  @Column({
    name: 'trigger_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  triggerReason!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.tagLifecycleLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.tagLifecycleLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: TagEntity;
}
