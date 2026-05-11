import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AbnormalBehaviorEntity } from './abnormal-behavior.entity';
import { ClinicAccountEntity } from './clinic-account.entity';
import { ClinicClaimRequestEntity } from './clinic-claim-request.entity';
import { ClinicReviewEntity } from './clinic-review.entity';
import { ClinicTagResponseEntity } from './clinic-tag-response.entity';
import { ClinicTagStatEntity } from './clinic-tag-stat.entity';
import { GeoPoint } from './geo.types';
import { OrderEntity } from './order.entity';
import { OrderConfirmationEntity } from './order-confirmation.entity';
import { TagLifecycleLogEntity } from './tag-lifecycle-log.entity';
import { numericTransformer } from './column.transformer';
import { UserTagLogEntity } from './user-tag-log.entity';
import { UserReferralEntity } from './user-referral.entity';

@Entity({ name: 'clinic' })
@Index('idx_clinic_location', ['location'], { spatial: true })
@Index('idx_clinic_city_status', ['city', 'status'])
@Index('idx_clinic_reputation_score', ['reputationScore'])
@Index('idx_clinic_price_score', ['priceScore'])
@Index('idx_clinic_lat_lng', ['lat', 'lng'])
export class ClinicEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    transformer: numericTransformer,
  })
  lat!: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    transformer: numericTransformer,
  })
  lng!: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location!: GeoPoint;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  wechat!: string | null;

  @Column({
    name: 'business_hours',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  businessHours!: string | null;

  @Column({ type: 'varchar', length: 20 })
  city!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  district!: string | null;

  @Column({
    name: 'trust_score',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  trustScore!: number;

  @Column({
    name: 'value_score',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  valueScore!: number;

  @Column({
    name: 'experience_score',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  experienceScore!: number;

  @Column({
    name: 'risk_penalty',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  riskPenalty!: number;

  @Column({
    name: 'social_score',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  socialScore!: number;

  @Column({
    name: 'reputation_score',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  reputationScore!: number;

  @Column({
    name: 'price_score',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  priceScore!: number;

  @Column({
    name: 'confidence_factor',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  confidenceFactor!: number;

  @Column({ name: 'is_claimed', type: 'smallint', default: 0 })
  isClaimed!: number;

  @Column({ name: 'expire_at', type: 'timestamp', nullable: true })
  expireAt!: Date | null;

  @Column({ type: 'smallint', default: 1 })
  status!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @OneToMany(() => ClinicReviewEntity, (review) => review.clinic)
  clinicReviews!: ClinicReviewEntity[];

  @OneToMany(() => UserTagLogEntity, (userTagLog) => userTagLog.clinic)
  userTagLogs!: UserTagLogEntity[];

  @OneToMany(() => ClinicTagStatEntity, (clinicTagStat) => clinicTagStat.clinic)
  clinicTagStats!: ClinicTagStatEntity[];

  @OneToMany(() => OrderEntity, (order) => order.clinic)
  orders!: OrderEntity[];

  @OneToMany(
    () => TagLifecycleLogEntity,
    (tagLifecycleLog) => tagLifecycleLog.clinic,
  )
  tagLifecycleLogs!: TagLifecycleLogEntity[];

  @OneToMany(() => UserReferralEntity, (userReferral) => userReferral.clinic)
  userReferrals!: UserReferralEntity[];

  @OneToMany(
    () => ClinicTagResponseEntity,
    (clinicTagResponse) => clinicTagResponse.clinic,
  )
  clinicTagResponses!: ClinicTagResponseEntity[];

  @OneToOne(() => ClinicAccountEntity, (clinicAccount) => clinicAccount.clinic)
  clinicAccount!: ClinicAccountEntity | null;

  @OneToMany(
    () => ClinicClaimRequestEntity,
    (clinicClaimRequest) => clinicClaimRequest.clinic,
  )
  clinicClaimRequests!: ClinicClaimRequestEntity[];

  @OneToMany(
    () => AbnormalBehaviorEntity,
    (abnormalBehavior) => abnormalBehavior.clinic,
  )
  abnormalBehaviors!: AbnormalBehaviorEntity[];

  @OneToMany(
    () => OrderConfirmationEntity,
    (orderConfirmation) => orderConfirmation.clinic,
  )
  orderConfirmations!: OrderConfirmationEntity[];
}
