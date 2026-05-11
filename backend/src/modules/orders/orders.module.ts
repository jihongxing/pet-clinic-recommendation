import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ClinicEntity,
  ClinicReviewEntity,
  OrderEntity,
  OrderConfirmationEntity,
} from '../../database/entities';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderConfirmationEntity,
      ClinicEntity,
      ClinicReviewEntity,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
