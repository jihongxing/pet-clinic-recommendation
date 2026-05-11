import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';

@Entity({ name: 'clinic_account' })
@Unique('uk_clinic_account_username', ['username'])
@Unique('uk_clinic_account_clinic', ['clinicId'])
@Index('idx_clinic_account_status', ['status'])
export class ClinicAccountEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ type: 'varchar', length: 100 })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'smallint', default: 1 })
  status!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToOne(() => ClinicEntity, (clinic) => clinic.clinicAccount, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;
}
