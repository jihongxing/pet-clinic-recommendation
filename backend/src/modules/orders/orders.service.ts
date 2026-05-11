import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import {
  ClinicEntity,
  ClinicReviewEntity,
  ContactType,
  OrderEntity,
  OrderConfirmationEntity,
  OrderStatus,
} from '../../database/entities';
import { ConfirmVisitDto } from './dto/confirm-visit.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetMyOrdersQueryDto } from './dto/get-my-orders-query.dto';

export interface CreateOrderResponse {
  orderId: number;
  clinicId: number;
  contactType: ContactType;
  contactInfo: string;
  createdAt: Date;
}

export interface MyOrderItem {
  id: number;
  clinic: {
    id: number;
    name: string;
    address: string;
    phone: string | null;
  };
  status: OrderStatus;
  contactType: ContactType;
  createdAt: Date;
  confirmedAt: Date | null;
  canEvaluate: boolean;
  highWeightEligible: boolean;
  hasEvaluated: boolean;
  daysSinceOrder: number;
}

export interface MyOrdersResponse {
  list: MyOrderItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConfirmVisitResponse {
  orderId: number;
  clinicId: number;
  visited: boolean;
  status: OrderStatus;
  confirmedAt: Date;
}

export interface ReviewEligibilityResponse {
  orderId: number;
  clinicId: number;
  canEvaluate: boolean;
  highWeightEligible: boolean;
  hasEvaluated: boolean;
  status: OrderStatus;
  reason:
    | 'eligible'
    | 'order_not_confirmed'
    | 'order_cancelled'
    | 'already_reviewed';
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderConfirmationEntity)
    private readonly orderConfirmationRepository: Repository<OrderConfirmationEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicRepository: Repository<ClinicEntity>,
    @InjectRepository(ClinicReviewEntity)
    private readonly clinicReviewRepository: Repository<ClinicReviewEntity>,
  ) {}

  async createOrder(
    userId: string,
    payload: CreateOrderDto,
  ): Promise<CreateOrderResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: {
        id: payload.clinicId,
        status: 1,
      },
    });

    if (!clinic) {
      throw new NotFoundException({
        code: RESPONSE_CODE.CLINIC_NOT_FOUND,
        message: '诊所不存在',
      });
    }

    const contactInfo = this.resolveContactInfo(clinic, payload.contactType);
    const order = this.orderRepository.create({
      userId,
      clinicId: clinic.id,
      status: OrderStatus.Clicked,
      contactType: payload.contactType,
    });
    const savedOrder = await this.orderRepository.save(order);

    return {
      orderId: Number(savedOrder.id),
      clinicId: clinic.id,
      contactType: savedOrder.contactType,
      contactInfo,
      createdAt: savedOrder.createdAt,
    };
  }

  async confirmVisit(
    userId: string,
    orderId: number,
    payload: ConfirmVisitDto,
  ): Promise<ConfirmVisitResponse> {
    const order = await this.orderRepository.findOne({
      where: {
        id: String(orderId),
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '预约记录不存在',
      });
    }

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '已取消的预约不能再次确认就诊',
      });
    }

    const existingConfirmation = await this.orderConfirmationRepository.findOne(
      {
        where: {
          orderId: order.id,
        },
      },
    );
    const confirmedAt = existingConfirmation?.confirmedAt ?? new Date();
    const nextStatus = payload.visited
      ? OrderStatus.Confirmed
      : OrderStatus.Cancelled;

    const confirmation =
      existingConfirmation ??
      this.orderConfirmationRepository.create({
        orderId: order.id,
        userId,
        clinicId: order.clinicId,
      });

    confirmation.visited = payload.visited;
    confirmation.confirmedAt = confirmedAt;

    order.status = nextStatus;
    order.confirmedAt = confirmedAt;

    await this.orderConfirmationRepository.save(confirmation);
    await this.orderRepository.save(order);

    return {
      orderId: Number(order.id),
      clinicId: order.clinicId,
      visited: confirmation.visited,
      status: order.status,
      confirmedAt,
    };
  }

  async getReviewEligibility(
    userId: string,
    orderId: number,
  ): Promise<ReviewEligibilityResponse> {
    const order = await this.orderRepository.findOne({
      where: {
        id: String(orderId),
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '预约记录不存在',
      });
    }

    const existingReview = await this.clinicReviewRepository.findOne({
      where: {
        userId,
        clinicId: order.clinicId,
      },
      select: {
        id: true,
      },
    });
    const hasEvaluated = Boolean(existingReview);

    if (order.status === OrderStatus.Cancelled) {
      return {
        orderId: Number(order.id),
        clinicId: order.clinicId,
        canEvaluate: false,
        highWeightEligible: false,
        hasEvaluated,
        status: order.status,
        reason: 'order_cancelled',
      };
    }

    if (hasEvaluated) {
      return {
        orderId: Number(order.id),
        clinicId: order.clinicId,
        canEvaluate: false,
        highWeightEligible: false,
        hasEvaluated: true,
        status: order.status,
        reason: 'already_reviewed',
      };
    }

    const highWeightEligible = order.status === OrderStatus.Confirmed;

    return {
      orderId: Number(order.id),
      clinicId: order.clinicId,
      canEvaluate: true,
      highWeightEligible,
      hasEvaluated: false,
      status: order.status,
      reason: highWeightEligible ? 'eligible' : 'order_not_confirmed',
    };
  }

  async getMyOrders(
    userId: string,
    query: GetMyOrdersQueryDto,
  ): Promise<MyOrdersResponse> {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
      },
      relations: {
        clinic: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    if (orders.length === 0) {
      return {
        list: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    const clinicIds = [...new Set(orders.map((order) => order.clinicId))];
    const reviews = await this.clinicReviewRepository.find({
      where: {
        userId,
        clinicId: In(clinicIds),
      },
      select: {
        clinicId: true,
      },
    });
    const reviewedClinicIds = new Set(reviews.map((review) => review.clinicId));

    return {
      list: orders.map((order) => {
        const hasEvaluated = reviewedClinicIds.has(order.clinicId);
        const canEvaluate =
          order.status === OrderStatus.Clicked ||
          order.status === OrderStatus.Confirmed;
        const highWeightEligible =
          order.status === OrderStatus.Confirmed && !hasEvaluated;

        return {
          id: Number(order.id),
          clinic: {
            id: order.clinic.id,
            name: order.clinic.name,
            address: order.clinic.address,
            phone: order.clinic.phone,
          },
          status: order.status,
          contactType: order.contactType,
          createdAt: order.createdAt,
          confirmedAt: order.confirmedAt,
          canEvaluate: canEvaluate && !hasEvaluated,
          highWeightEligible,
          hasEvaluated,
          daysSinceOrder: this.calculateDaysSinceOrder(order.createdAt),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private resolveContactInfo(clinic: ClinicEntity, contactType: ContactType) {
    if (contactType === ContactType.Phone) {
      if (!clinic.phone?.trim()) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: '诊所暂未提供联系电话',
        });
      }

      return clinic.phone;
    }

    if (!clinic.wechat?.trim()) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '诊所暂未提供微信号',
      });
    }

    return clinic.wechat;
  }

  private calculateDaysSinceOrder(createdAt: Date) {
    const diffInMilliseconds = Date.now() - createdAt.getTime();

    return Math.max(0, Math.floor(diffInMilliseconds / (24 * 60 * 60 * 1000)));
  }
}
