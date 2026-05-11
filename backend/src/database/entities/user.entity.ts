import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { AbnormalBehaviorEntity } from './abnormal-behavior.entity';
import { ClinicReviewEntity } from './clinic-review.entity';
import { OrderEntity } from './order.entity';
import { OrderConfirmationEntity } from './order-confirmation.entity';
import { UserTagLogEntity } from './user-tag-log.entity';
import { UserReferralEntity } from './user-referral.entity';

@Entity({ name: 'user' })
@Unique('uk_user_openid', ['openid'])
@Index('idx_user_city', ['city'])
@Index('idx_user_created_at', ['createdAt'])
export class UserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  openid!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  city!: string | null;

  @Column({ type: 'smallint', default: 1 })
  status!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @OneToMany(() => ClinicReviewEntity, (review) => review.user)
  clinicReviews!: ClinicReviewEntity[];

  @OneToMany(() => UserTagLogEntity, (userTagLog) => userTagLog.user)
  userTagLogs!: UserTagLogEntity[];

  @OneToMany(() => OrderEntity, (order) => order.user)
  orders!: OrderEntity[];

  @OneToMany(
    () => OrderConfirmationEntity,
    (orderConfirmation) => orderConfirmation.user,
  )
  orderConfirmations!: OrderConfirmationEntity[];

  @OneToMany(
    () => AbnormalBehaviorEntity,
    (abnormalBehavior) => abnormalBehavior.user,
  )
  abnormalBehaviors!: AbnormalBehaviorEntity[];

  @OneToMany(
    () => UserReferralEntity,
    (userReferral) => userReferral.referrerUser,
  )
  referralsMade!: UserReferralEntity[];

  @OneToMany(
    () => UserReferralEntity,
    (userReferral) => userReferral.refereeUser,
  )
  referralsReceived!: UserReferralEntity[];
}
