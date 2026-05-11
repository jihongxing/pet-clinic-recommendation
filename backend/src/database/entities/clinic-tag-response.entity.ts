import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';
import { ResponseStatus } from './database.enums';
import { TagEntity } from './tag.entity';

@Entity({ name: 'clinic_tag_response' })
@Unique('uk_clinic_tag_response', ['clinicId', 'tagId'])
@Index('idx_clinic_tag_response_clinic', ['clinicId'])
@Index('idx_clinic_tag_response_status', ['status'])
@Index('idx_clinic_tag_response_created', ['createdAt'])
export class ClinicTagResponseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'tag_id', type: 'integer' })
  tagId!: number;

  @Column({ name: 'response_text', type: 'text' })
  responseText!: string;

  @Column({
    type: 'enum',
    enum: ResponseStatus,
    enumName: 'response_status',
    default: ResponseStatus.Pending,
  })
  status!: ResponseStatus;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy!: string | null;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.clinicTagResponses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.clinicTagResponses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: TagEntity;
}
