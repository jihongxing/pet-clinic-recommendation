import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ClinicEntity,
  ClinicReviewEntity,
  ContactType,
  OrderEntity,
  OrderConfirmationEntity,
  OrderStatus,
} from '../../database/entities';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<OrderEntity>>;
  let orderConfirmationRepository: jest.Mocked<
    Repository<OrderConfirmationEntity>
  >;
  let clinicRepository: jest.Mocked<Repository<ClinicEntity>>;
  let clinicReviewRepository: jest.Mocked<Repository<ClinicReviewEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderConfirmationEntity),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClinicEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClinicReviewEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(OrderEntity));
    orderConfirmationRepository = module.get(
      getRepositoryToken(OrderConfirmationEntity),
    );
    clinicRepository = module.get(getRepositoryToken(ClinicEntity));
    clinicReviewRepository = module.get(getRepositoryToken(ClinicReviewEntity));
  });

  it('creates a clicked order for phone contact', async () => {
    const createdAt = new Date('2026-05-12T12:00:00.000Z');

    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      phone: '010-12345678',
      wechat: 'petmed_1',
      status: 1,
    } as ClinicEntity);
    orderRepository.create.mockReturnValue({
      userId: 'user-1',
      clinicId: 1,
      status: OrderStatus.Clicked,
      contactType: ContactType.Phone,
    } as OrderEntity);
    orderRepository.save.mockResolvedValue({
      id: '123',
      clinicId: 1,
      contactType: ContactType.Phone,
      createdAt,
    } as OrderEntity);

    await expect(
      service.createOrder('user-1', {
        clinicId: 1,
        contactType: ContactType.Phone,
      }),
    ).resolves.toEqual({
      orderId: 123,
      clinicId: 1,
      contactType: ContactType.Phone,
      contactInfo: '010-12345678',
      createdAt,
    });

    expect(orderRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      clinicId: 1,
      status: OrderStatus.Clicked,
      contactType: ContactType.Phone,
    });
  });

  it('creates a clicked order for wechat contact', async () => {
    const createdAt = new Date('2026-05-12T12:10:00.000Z');

    clinicRepository.findOne.mockResolvedValue({
      id: 2,
      phone: '010-22222222',
      wechat: 'petmed_wechat',
      status: 1,
    } as ClinicEntity);
    orderRepository.create.mockReturnValue({
      userId: 'user-2',
      clinicId: 2,
      status: OrderStatus.Clicked,
      contactType: ContactType.Wechat,
    } as OrderEntity);
    orderRepository.save.mockResolvedValue({
      id: '124',
      clinicId: 2,
      contactType: ContactType.Wechat,
      createdAt,
    } as OrderEntity);

    await expect(
      service.createOrder('user-2', {
        clinicId: 2,
        contactType: ContactType.Wechat,
      }),
    ).resolves.toEqual({
      orderId: 124,
      clinicId: 2,
      contactType: ContactType.Wechat,
      contactInfo: 'petmed_wechat',
      createdAt,
    });
  });

  it('throws when the clinic does not exist', async () => {
    clinicRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createOrder('user-1', {
        clinicId: 404,
        contactType: ContactType.Phone,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when requested phone contact is unavailable', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      phone: null,
      wechat: 'petmed_wechat',
      status: 1,
    } as ClinicEntity);

    await expect(
      service.createOrder('user-1', {
        clinicId: 1,
        contactType: ContactType.Phone,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when requested wechat contact is unavailable', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 1,
      phone: '010-12345678',
      wechat: null,
      status: 1,
    } as ClinicEntity);

    await expect(
      service.createOrder('user-1', {
        clinicId: 1,
        contactType: ContactType.Wechat,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms a visited order and syncs order status', async () => {
    const confirmedAt = new Date('2026-05-12T15:00:00.000Z');
    jest.useFakeTimers().setSystemTime(confirmedAt);

    orderRepository.findOne.mockResolvedValue({
      id: '123',
      userId: 'user-1',
      clinicId: 1,
      status: OrderStatus.Clicked,
      confirmedAt: null,
    } as OrderEntity);
    orderConfirmationRepository.findOne.mockResolvedValue(null);
    orderConfirmationRepository.create.mockReturnValue({
      orderId: '123',
      userId: 'user-1',
      clinicId: 1,
      visited: true,
      confirmedAt,
    } as OrderConfirmationEntity);
    orderConfirmationRepository.save.mockResolvedValue({
      orderId: '123',
      userId: 'user-1',
      clinicId: 1,
      visited: true,
      confirmedAt,
    } as OrderConfirmationEntity);
    orderRepository.save.mockResolvedValue({
      id: '123',
      clinicId: 1,
      status: OrderStatus.Confirmed,
      confirmedAt,
    } as OrderEntity);

    await expect(
      service.confirmVisit('user-1', 123, { visited: true }),
    ).resolves.toEqual({
      orderId: 123,
      clinicId: 1,
      visited: true,
      status: OrderStatus.Confirmed,
      confirmedAt,
    });

    expect(orderConfirmationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: '123',
        visited: true,
        confirmedAt,
      }),
    );
    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '123',
        status: OrderStatus.Confirmed,
        confirmedAt,
      }),
    );

    jest.useRealTimers();
  });

  it('marks order as cancelled when user confirms not visited', async () => {
    const confirmedAt = new Date('2026-05-12T16:00:00.000Z');
    jest.useFakeTimers().setSystemTime(confirmedAt);

    orderRepository.findOne.mockResolvedValue({
      id: '124',
      userId: 'user-2',
      clinicId: 2,
      status: OrderStatus.Clicked,
      confirmedAt: null,
    } as OrderEntity);
    orderConfirmationRepository.findOne.mockResolvedValue(null);
    orderConfirmationRepository.create.mockReturnValue({
      orderId: '124',
      userId: 'user-2',
      clinicId: 2,
      visited: false,
      confirmedAt,
    } as OrderConfirmationEntity);
    orderConfirmationRepository.save.mockResolvedValue({
      orderId: '124',
      userId: 'user-2',
      clinicId: 2,
      visited: false,
      confirmedAt,
    } as OrderConfirmationEntity);
    orderRepository.save.mockResolvedValue({
      id: '124',
      clinicId: 2,
      status: OrderStatus.Cancelled,
      confirmedAt,
    } as OrderEntity);

    await expect(
      service.confirmVisit('user-2', 124, { visited: false }),
    ).resolves.toEqual({
      orderId: 124,
      clinicId: 2,
      visited: false,
      status: OrderStatus.Cancelled,
      confirmedAt,
    });

    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '124',
        status: OrderStatus.Cancelled,
        confirmedAt,
      }),
    );

    jest.useRealTimers();
  });

  it('throws when confirming a missing order', async () => {
    orderRepository.findOne.mockResolvedValue(null);

    await expect(
      service.confirmVisit('user-1', 999, { visited: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when confirming a cancelled order', async () => {
    orderRepository.findOne.mockResolvedValue({
      id: '125',
      userId: 'user-3',
      clinicId: 3,
      status: OrderStatus.Cancelled,
      confirmedAt: new Date('2026-05-12T16:00:00.000Z'),
    } as OrderEntity);

    await expect(
      service.confirmVisit('user-3', 125, { visited: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paginated orders with evaluation flags', async () => {
    const now = new Date('2026-05-12T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    orderRepository.findAndCount.mockResolvedValue([
      [
        {
          id: '101',
          clinicId: 1,
          clinic: {
            id: 1,
            name: '爱宠动物医院',
            address: '北京市朝阳区建国路88号',
            phone: '010-12345678',
          },
          status: OrderStatus.Clicked,
          contactType: ContactType.Phone,
          createdAt: new Date('2026-05-10T10:00:00.000Z'),
          confirmedAt: null,
        } as OrderEntity,
        {
          id: '102',
          clinicId: 2,
          clinic: {
            id: 2,
            name: '安心宠物医院',
            address: '北京市海淀区中关村大街66号',
            phone: '010-87654321',
          },
          status: OrderStatus.Cancelled,
          contactType: ContactType.Wechat,
          createdAt: new Date('2026-05-11T12:00:00.000Z'),
          confirmedAt: null,
        } as OrderEntity,
      ],
      2,
    ]);
    clinicReviewRepository.find.mockResolvedValue([
      {
        clinicId: 2,
      } as ClinicReviewEntity,
    ]);

    await expect(
      service.getMyOrders('user-1', {
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      list: [
        {
          id: 101,
          clinic: {
            id: 1,
            name: '爱宠动物医院',
            address: '北京市朝阳区建国路88号',
            phone: '010-12345678',
          },
          status: OrderStatus.Clicked,
          contactType: ContactType.Phone,
          createdAt: new Date('2026-05-10T10:00:00.000Z'),
          confirmedAt: null,
          canEvaluate: true,
          highWeightEligible: false,
          hasEvaluated: false,
          daysSinceOrder: 2,
        },
        {
          id: 102,
          clinic: {
            id: 2,
            name: '安心宠物医院',
            address: '北京市海淀区中关村大街66号',
            phone: '010-87654321',
          },
          status: OrderStatus.Cancelled,
          contactType: ContactType.Wechat,
          createdAt: new Date('2026-05-11T12:00:00.000Z'),
          confirmedAt: null,
          canEvaluate: false,
          highWeightEligible: false,
          hasEvaluated: true,
          daysSinceOrder: 1,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });

    expect(orderRepository.findAndCount).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      relations: {
        clinic: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: 0,
      take: 20,
    });

    jest.useRealTimers();
  });

  it('returns eligible review status for a confirmed order without review', async () => {
    orderRepository.findOne.mockResolvedValue({
      id: '201',
      userId: 'user-1',
      clinicId: 8,
      status: OrderStatus.Confirmed,
    } as OrderEntity);
    clinicReviewRepository.findOne.mockResolvedValue(null);

    await expect(service.getReviewEligibility('user-1', 201)).resolves.toEqual({
      orderId: 201,
      clinicId: 8,
      canEvaluate: true,
      highWeightEligible: true,
      hasEvaluated: false,
      status: OrderStatus.Confirmed,
      reason: 'eligible',
    });
  });

  it('returns normal review status for an unconfirmed order without review', async () => {
    orderRepository.findOne.mockResolvedValue({
      id: '202',
      userId: 'user-1',
      clinicId: 9,
      status: OrderStatus.Clicked,
    } as OrderEntity);
    clinicReviewRepository.findOne.mockResolvedValue(null);

    await expect(service.getReviewEligibility('user-1', 202)).resolves.toEqual({
      orderId: 202,
      clinicId: 9,
      canEvaluate: true,
      highWeightEligible: false,
      hasEvaluated: false,
      status: OrderStatus.Clicked,
      reason: 'order_not_confirmed',
    });
  });

  it('returns ineligible status when the clinic has already been reviewed', async () => {
    orderRepository.findOne.mockResolvedValue({
      id: '203',
      userId: 'user-1',
      clinicId: 10,
      status: OrderStatus.Confirmed,
    } as OrderEntity);
    clinicReviewRepository.findOne.mockResolvedValue({
      id: '3001',
    } as ClinicReviewEntity);

    await expect(service.getReviewEligibility('user-1', 203)).resolves.toEqual({
      orderId: 203,
      clinicId: 10,
      canEvaluate: false,
      highWeightEligible: false,
      hasEvaluated: true,
      status: OrderStatus.Confirmed,
      reason: 'already_reviewed',
    });
  });

  it('returns an empty page when the user has no orders', async () => {
    orderRepository.findAndCount.mockResolvedValue([[], 0]);

    await expect(
      service.getMyOrders('user-1', {
        status: OrderStatus.Clicked,
        page: 2,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      list: [],
      total: 0,
      page: 2,
      pageSize: 10,
    });

    expect(clinicReviewRepository.find).not.toHaveBeenCalled();
  });
});
