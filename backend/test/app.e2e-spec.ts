import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { RESPONSE_CODE } from '../src/common/constants/response-code.constants';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { validationExceptionFactory } from '../src/common/factories/validation-exception.factory';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  ContactType,
  EmotionType,
  ReviewSource,
} from '../src/database/entities';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { ClinicAuthGuard } from '../src/modules/auth/guards/clinic-auth.guard';
import { UserAuthGuard } from '../src/modules/auth/guards/user-auth.guard';
import { ClinicsController } from '../src/modules/clinics/clinics.controller';
import { ClinicsService } from '../src/modules/clinics/clinics.service';
import { AppLoggerService } from '../src/modules/logging/logging.service';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { TagsController } from '../src/modules/tags/tags.controller';
import { TagsService } from '../src/modules/tags/tags.service';

describe('Core API flows (e2e)', () => {
  let app: INestApplication;
  let authService: { login: jest.Mock };
  let clinicsService: {
    getNearbyClinics: jest.Mock;
    getClinicDetail: jest.Mock;
    getClinicResponses: jest.Mock;
    submitClinicResponse: jest.Mock;
  };
  let ordersService: {
    createOrder: jest.Mock;
    confirmVisit: jest.Mock;
    getReviewEligibility: jest.Mock;
    getMyOrders: jest.Mock;
  };
  let tagsService: {
    getTags: jest.Mock;
    getTagSelectionConfig: jest.Mock;
    getMyReviews: jest.Mock;
    submitTag: jest.Mock;
  };
  let loggerService: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    verbose: jest.Mock;
    logError: jest.Mock;
    logRequest: jest.Mock;
    getLogDirectory: jest.Mock;
  };

  beforeAll(async () => {
    authService = {
      login: jest.fn(),
    };
    clinicsService = {
      getNearbyClinics: jest.fn(),
      getClinicDetail: jest.fn(),
      getClinicResponses: jest.fn(),
      submitClinicResponse: jest.fn(),
    };
    ordersService = {
      createOrder: jest.fn(),
      confirmVisit: jest.fn(),
      getReviewEligibility: jest.fn(),
      getMyOrders: jest.fn(),
    };
    tagsService = {
      getTags: jest.fn(),
      getTagSelectionConfig: jest.fn(),
      getMyReviews: jest.fn(),
      submitTag: jest.fn(),
    };
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logError: jest.fn(),
      logRequest: jest.fn(),
      getLogDirectory: jest.fn().mockReturnValue('logs'),
    };

    const userAuthGuard = {
      canActivate: jest.fn((context) => {
        const requestContext = context.switchToHttp().getRequest() as {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };
        const authorization = requestContext.headers.authorization;

        if (authorization !== 'Bearer user-token') {
          throw new UnauthorizedException({
            code: RESPONSE_CODE.UNAUTHORIZED,
            message: '未提供访问令牌',
          });
        }

        requestContext.user = {
          sub: '1',
          actorType: 'user',
          actorId: '1',
          userId: '1',
          openid: 'dev-openid-e2e',
        };

        return true;
      }),
    };

    const clinicAuthGuard = {
      canActivate: jest.fn((context) => {
        const requestContext = context.switchToHttp().getRequest() as {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };
        const authorization = requestContext.headers.authorization;

        if (authorization !== 'Bearer clinic-token') {
          throw new UnauthorizedException({
            code: RESPONSE_CODE.UNAUTHORIZED,
            message: '未提供访问令牌',
          });
        }

        requestContext.user = {
          sub: '301',
          actorType: 'clinic',
          actorId: '301',
          clinicId: 1,
          clinicAccountId: '301',
          username: 'clinic_admin_1',
        };

        return true;
      }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [
        AuthController,
        ClinicsController,
        OrdersController,
        TagsController,
      ],
      providers: [
        Reflector,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: ClinicsService,
          useValue: clinicsService,
        },
        {
          provide: OrdersService,
          useValue: ordersService,
        },
        {
          provide: TagsService,
          useValue: tagsService,
        },
        {
          provide: AppLoggerService,
          useValue: loggerService,
        },
      ],
    })
      .overrideGuard(UserAuthGuard)
      .useValue(userAuthGuard)
      .overrideGuard(ClinicAuthGuard)
      .useValue(clinicAuthGuard);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter(app.get(AppLoggerService)));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes login, clinic browse, order creation and tag submission over HTTP', async () => {
    authService.login.mockResolvedValue({
      token: 'user-token',
      user: {
        id: '1',
        openid: 'dev-openid-e2e',
        nickname: '测试用户',
        avatar: null,
        city: '北京',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
    });
    clinicsService.getNearbyClinics.mockResolvedValue({
      list: [
        {
          id: 1,
          name: '爱宠动物医院',
          address: '北京市朝阳区建国路88号',
          distance: 860,
          lat: 39.9075,
          lng: 116.4574,
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          reputationScore: 88.2,
          priceScore: 76.5,
          confidenceFactor: 0.84,
          topTags: [],
          totalTagCount: 0,
          totalUsers: 3,
          isClaimed: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    clinicsService.getClinicDetail.mockResolvedValue({
      id: 1,
      name: '爱宠动物医院',
      address: '北京市朝阳区建国路88号',
      lat: 39.9075,
      lng: 116.4574,
      distance: 860,
      phone: '010-12345678',
      wechat: 'petmed_1',
      businessHours: '09:00-21:00',
      city: '北京',
      district: '朝阳区',
      scores: {
        trust: 88.2,
        value: 76.5,
        experience: 81,
        social: 24,
        riskPenalty: 0,
        reputation: 82.1,
        price: 74.6,
        confidenceFactor: 0.84,
      },
      tags: {},
      isClaimed: false,
    });
    ordersService.createOrder.mockResolvedValue({
      orderId: 1001,
      clinicId: 1,
      contactType: ContactType.Phone,
      contactInfo: '010-12345678',
      createdAt: '2026-05-12T12:00:00.000Z',
    });
    tagsService.submitTag.mockResolvedValue({
      success: true,
      weight: 1,
      userWeight: 1,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        code: 'dev:openid-e2e',
      })
      .expect(200);

    expect(loginResponse.body).toEqual({
      code: 0,
      message: 'success',
      data: {
        token: 'user-token',
        user: {
          id: '1',
          openid: 'dev-openid-e2e',
          nickname: '测试用户',
          avatar: null,
          city: '北京',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      },
    });
    expect(authService.login).toHaveBeenCalledWith('dev:openid-e2e');

    const nearbyResponse = await request(app.getHttpServer())
      .get('/api/v1/clinics/nearby')
      .query({
        lat: '39.9075',
        lng: '116.4574',
        city: '北京',
      })
      .expect(200);

    expect(nearbyResponse.body.code).toBe(0);
    expect(nearbyResponse.body.message).toBe('success');
    expect(clinicsService.getNearbyClinics).toHaveBeenCalledWith({
      lat: 39.9075,
      lng: 116.4574,
      radius: 3000,
      sortType: 'reputation',
      city: '北京',
      page: 1,
      pageSize: 20,
    });

    const detailResponse = await request(app.getHttpServer())
      .get('/api/v1/clinics/1')
      .query({
        lat: '39.9075',
        lng: '116.4574',
      })
      .expect(200);

    expect(detailResponse.body.data.id).toBe(1);
    expect(clinicsService.getClinicDetail).toHaveBeenCalledWith(1, {
      lat: 39.9075,
      lng: 116.4574,
    });

    const orderResponse = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', 'Bearer user-token')
      .send({
        clinicId: 1,
        contactType: ContactType.Phone,
      })
      .expect(201);

    expect(orderResponse.body).toEqual({
      code: 0,
      message: 'success',
      data: {
        orderId: 1001,
        clinicId: 1,
        contactType: ContactType.Phone,
        contactInfo: '010-12345678',
        createdAt: '2026-05-12T12:00:00.000Z',
      },
    });
    expect(ordersService.createOrder).toHaveBeenCalledWith('1', {
      clinicId: 1,
      contactType: ContactType.Phone,
    });

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/tags/submit')
      .set('Authorization', 'Bearer user-token')
      .set('x-device-id', 'device-e2e')
      .send({
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1, 5],
        source: ReviewSource.Order,
        reviewText: '医生解释得很清楚',
      })
      .expect(200);

    expect(submitResponse.body).toEqual({
      code: 0,
      message: '感谢您的反馈！',
      data: {
        success: true,
        weight: 1,
        userWeight: 1,
      },
    });
    expect(tagsService.submitTag).toHaveBeenCalledWith(
      '1',
      {
        clinicId: 1,
        emotion: EmotionType.Satisfied,
        tagIds: [1, 5],
        source: ReviewSource.Order,
        reviewText: '医生解释得很清楚',
      },
      expect.objectContaining({
        deviceId: 'device-e2e',
        ipAddress: expect.any(String),
      }),
    );
  });

  it('returns a standardized unauthorized response for protected order APIs', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        clinicId: 1,
        contactType: ContactType.Phone,
      })
      .expect(401);

    expect(response.body.code).toBe(RESPONSE_CODE.UNAUTHORIZED);
    expect(response.body.message).toBe('未提供访问令牌');
    expect(response.body.data).toBeNull();
    expect(response.body.path).toBe('/api/v1/orders');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('returns a standardized validation error for invalid nearby clinic queries', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/clinics/nearby')
      .query({
        lng: '116.4574',
        city: '北京',
      })
      .expect(400);

    expect(response.body.code).toBe(RESPONSE_CODE.PARAM_FORMAT_INVALID);
    expect(response.body.data).toBeNull();
    expect(response.body.path).toBe(
      '/api/v1/clinics/nearby?lng=116.4574&city=%E5%8C%97%E4%BA%AC',
    );
  });
});
