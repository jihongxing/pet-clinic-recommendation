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
import { UserEntity } from './user.entity';

@Entity({ name: 'user_referral' })
@Unique('uk_user_referral', ['referrerUserId', 'refereeUserId', 'clinicId'])
@Index('idx_user_referral_referrer', ['referrerUserId'])
@Index('idx_user_referral_clinic', ['clinicId'])
export class UserReferralEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'referrer_user_id', type: 'bigint' })
  referrerUserId!: string;

  @Column({ name: 'referee_user_id', type: 'bigint' })
  refereeUserId!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.referralsMade, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'referrer_user_id' })
  referrerUser!: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.referralsReceived, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'referee_user_id' })
  refereeUser!: UserEntity;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.userReferrals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;
}
