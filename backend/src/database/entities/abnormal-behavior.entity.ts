import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';
import { AbnormalStatus } from './database.enums';
import { UserEntity } from './user.entity';

@Entity({ name: 'abnormal_behavior' })
@Index('idx_abnormal_behavior_user', ['userId'])
@Index('idx_abnormal_behavior_status', ['status'])
@Index('idx_abnormal_behavior_created_at', ['createdAt'])
export class AbnormalBehaviorEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'clinic_id', type: 'integer', nullable: true })
  clinicId!: number | null;

  @Column({ name: 'behavior_type', type: 'varchar', length: 50 })
  behaviorType!: string;

  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: AbnormalStatus,
    enumName: 'abnormal_status',
    default: AbnormalStatus.Pending,
  })
  status!: AbnormalStatus;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.abnormalBehaviors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.abnormalBehaviors, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity | null;
}
