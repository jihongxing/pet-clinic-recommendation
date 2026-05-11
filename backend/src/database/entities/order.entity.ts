import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ClinicReviewEntity } from './clinic-review.entity';
import { ClinicEntity } from './clinic.entity';
import { ContactType, OrderStatus } from './database.enums';
import { OrderConfirmationEntity } from './order-confirmation.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'order' })
@Index('idx_order_user', ['userId'])
@Index('idx_order_clinic', ['clinicId'])
@Index('idx_order_status_created', ['status', 'createdAt'])
@Index('idx_order_created_at', ['createdAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    default: OrderStatus.Clicked,
  })
  status!: OrderStatus;

  @Column({
    name: 'contact_type',
    type: 'enum',
    enum: ContactType,
    enumName: 'contact_type',
  })
  contactType!: ContactType;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  @ManyToOne(() => UserEntity, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @OneToMany(() => ClinicReviewEntity, (review) => review.order)
  clinicReviews!: ClinicReviewEntity[];

  @OneToOne(
    () => OrderConfirmationEntity,
    (orderConfirmation) => orderConfirmation.order,
  )
  orderConfirmation!: OrderConfirmationEntity | null;
}
