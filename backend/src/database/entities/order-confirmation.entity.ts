import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClinicEntity } from './clinic.entity';
import { OrderEntity } from './order.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'order_confirmation' })
@Unique('uk_order_confirmation', ['orderId'])
@Index('idx_order_confirmation_order', ['orderId'])
@Index('idx_order_confirmation_user', ['userId'])
@Index('idx_order_confirmation_clinic', ['clinicId'])
export class OrderConfirmationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ type: 'boolean' })
  visited!: boolean;

  @Column({
    name: 'confirmed_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  confirmedAt!: Date;

  @OneToOne(() => OrderEntity, (order) => order.orderConfirmation, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @ManyToOne(() => UserEntity, (user) => user.orderConfirmations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.orderConfirmations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;
}
