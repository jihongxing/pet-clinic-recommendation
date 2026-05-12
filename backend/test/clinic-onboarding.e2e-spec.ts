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
  ClaimStatus,
  ClinicSubmissionReviewAction,
  ClinicSubmissionStatus,
  ClinicSubmissionType,
  ResponseStatus,
} from '../src/database/entities';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AdminAuthController } from '../src/modules/auth/admin-auth.controller';
import { ClinicAuthController } from '../src/modules/auth/clinic-auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { AdminAuthGuard } from '../src/modules/auth/guards/admin-auth.guard';
import { ClinicAuthGuard } from '../src/modules/auth/guards/clinic-auth.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UserAuthGuard } from '../src/modules/auth/guards/user-auth.guard';
import { AdminClinicSubmissionsController } from '../src/modules/clinic-submissions/admin-clinic-submissions.controller';
import { ClinicSubmissionsController } from '../src/modules/clinic-submissions/clinic-submissions.controller';
import { ClinicSubmissionsService } from '../src/modules/clinic-submissions/clinic-submissions.service';
import { AdminClinicClaimRequestsController } from '../src/modules/clinics/admin-clinic-claim-requests.controller';
import { ClinicClaimRequestsController } from '../src/modules/clinics/clinic-claim-requests.controller';
import { ClinicsController } from '../src/modules/clinics/clinics.controller';
import { ClinicsService } from '../src/modules/clinics/clinics.service';
import { AppLoggerService } from '../src/modules/logging/logging.service';

describe('Clinic onboarding flow (e2e)', () => {
  let app: INestApplication;
  let authService: {
    login: jest.Mock;
    loginAdmin: jest.Mock;
    getAdminSession: jest.Mock;
    loginClinic: jest.Mock;
    getClinicSession: jest.Mock;
  };
  let clinicSubmissionsService: {
    getSubmissionMatches: jest.Mock;
    storeSubmissionPhoto: jest.Mock;
    createSubmission: jest.Mock;
    getMySubmissions: jest.Mock;
    getAdminSubmissions: jest.Mock;
    getAdminSubmissionDetail: jest.Mock;
    getAdminSubmissionReviewLogs: jest.Mock;
    reviewSubmission: jest.Mock;
  };
  let clinicsService: {
    createClinicClaimRequest: jest.Mock;
    getMyClinicClaimRequests: jest.Mock;
    getClinicClaimRequestDetail: jest.Mock;
    getAdminClaimRequests: jest.Mock;
    reviewClinicClaimRequest: jest.Mock;
    submitClinicResponse: jest.Mock;
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
      loginAdmin: jest.fn(),
      getAdminSession: jest.fn(),
      loginClinic: jest.fn(),
      getClinicSession: jest.fn(),
    };
    clinicSubmissionsService = {
      getSubmissionMatches: jest.fn(),
      storeSubmissionPhoto: jest.fn(),
      createSubmission: jest.fn(),
      getMySubmissions: jest.fn(),
      getAdminSubmissions: jest.fn(),
      getAdminSubmissionDetail: jest.fn(),
      getAdminSubmissionReviewLogs: jest.fn(),
      reviewSubmission: jest.fn(),
    };
    clinicsService = {
      createClinicClaimRequest: jest.fn(),
      getMyClinicClaimRequests: jest.fn(),
      getClinicClaimRequestDetail: jest.fn(),
      getAdminClaimRequests: jest.fn(),
      reviewClinicClaimRequest: jest.fn(),
      submitClinicResponse: jest.fn(),
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

    const userActor = {
      sub: '1',
      actorType: 'user',
      actorId: '1',
      userId: '1',
      openid: 'dev-openid-r19',
    };
    const adminActor = {
      sub: '901',
      actorType: 'admin',
      actorId: '901',
      adminUserId: '901',
      adminUsername: 'review_admin',
      username: 'review_admin',
    };
    const clinicActor = {
      sub: '301',
      actorType: 'clinic',
      actorId: '301',
      clinicId: 88,
      clinicAccountId: '301',
      username: 'clinic_admin_88',
    };

    const userAuthGuard = {
      canActivate: jest.fn((context) => {
        const requestContext = context.switchToHttp().getRequest() as {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };

        if (requestContext.headers.authorization !== 'Bearer user-token') {
          throw new UnauthorizedException({
            code: RESPONSE_CODE.UNAUTHORIZED,
            message: '未提供访问令牌',
          });
        }

        requestContext.user = userActor;
        return true;
      }),
    };

    const adminAuthGuard = {
      canActivate: jest.fn((context) => {
        const requestContext = context.switchToHttp().getRequest() as {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };

        if (requestContext.headers.authorization !== 'Bearer admin-token') {
          throw new UnauthorizedException({
            code: RESPONSE_CODE.UNAUTHORIZED,
            message: '未提供访问令牌',
          });
        }

        requestContext.user = adminActor;
        return true;
      }),
    };

    const clinicAuthGuard = {
      canActivate: jest.fn((context) => {
        const requestContext = context.switchToHttp().getRequest() as {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };

        if (requestContext.headers.authorization !== 'Bearer clinic-token') {
          throw new UnauthorizedException({
            code: RESPONSE_CODE.UNAUTHORIZED,
            message: '未提供访问令牌',
          });
        }

        requestContext.user = clinicActor;
        return true;
      }),
    };

    const jwtAuthGuard = {
      canActivate: jest.fn((context) => {
        const requestContext = context.switchToHttp().getRequest() as {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };
        const authorization = requestContext.headers.authorization;

        if (authorization === 'Bearer user-token') {
          requestContext.user = userActor;
          return true;
        }

        if (authorization === 'Bearer admin-token') {
          requestContext.user = adminActor;
          return true;
        }

        if (authorization === 'Bearer clinic-token') {
          requestContext.user = clinicActor;
          return true;
        }

        throw new UnauthorizedException({
          code: RESPONSE_CODE.UNAUTHORIZED,
          message: '未提供访问令牌',
        });
      }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [
        AuthController,
        AdminAuthController,
        ClinicAuthController,
        ClinicSubmissionsController,
        AdminClinicSubmissionsController,
        ClinicsController,
        ClinicClaimRequestsController,
        AdminClinicClaimRequestsController,
      ],
      providers: [
        Reflector,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: ClinicSubmissionsService,
          useValue: clinicSubmissionsService,
        },
        {
          provide: ClinicsService,
          useValue: clinicsService,
        },
        {
          provide: AppLoggerService,
          useValue: loggerService,
        },
      ],
    })
      .overrideGuard(UserAuthGuard)
      .useValue(userAuthGuard)
      .overrideGuard(AdminAuthGuard)
      .useValue(adminAuthGuard)
      .overrideGuard(ClinicAuthGuard)
      .useValue(clinicAuthGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuard);

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

  it('uploads a clinic submission photo over HTTP', async () => {
    clinicSubmissionsService.storeSubmissionPhoto.mockResolvedValue({
      fileUrl: 'http://127.0.0.1/uploads/clinic-submissions/test-photo.jpg',
      fileName: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      size: 18,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/clinic-submissions/photos')
      .set('Authorization', 'Bearer user-token')
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'test-photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(response.body).toEqual({
      code: 0,
      message: '上传成功',
      data: {
        fileUrl: 'http://127.0.0.1/uploads/clinic-submissions/test-photo.jpg',
        fileName: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        size: 18,
      },
    });
    expect(clinicSubmissionsService.storeSubmissionPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'test-photo.jpg',
        mimetype: 'image/jpeg',
        size: 18,
        buffer: expect.any(Buffer),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer user-token',
        }),
      }),
    );
  });

  it('runs recommendation review and clinic claim approval flow over HTTP', async () => {
    authService.login.mockResolvedValue({
      token: 'user-token',
      user: {
        id: '1',
        openid: 'dev-openid-r19',
        nickname: '测试用户',
        avatar: null,
        city: '北京',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
    });
    authService.loginAdmin.mockResolvedValue({
      token: 'admin-token',
      admin: {
        actorType: 'admin',
        actorId: '901',
        adminUserId: '901',
        username: 'review_admin',
        displayName: '推荐审核员',
        createdAt: '2026-05-12T08:00:00.000Z',
        lastLoginAt: '2026-05-12T09:00:00.000Z',
      },
    });
    authService.loginClinic.mockResolvedValue({
      token: 'clinic-token',
      clinic: {
        actorType: 'clinic',
        actorId: '301',
        clinicAccountId: '301',
        clinicId: 88,
        username: 'clinic_admin_88',
        createdAt: '2026-05-12T10:00:00.000Z',
      },
    });
    authService.getClinicSession.mockResolvedValue({
      actorType: 'clinic',
      actorId: '301',
      clinicAccountId: '301',
      clinicId: 88,
      username: 'clinic_admin_88',
      createdAt: '2026-05-12T10:00:00.000Z',
    });

    clinicSubmissionsService.getSubmissionMatches.mockResolvedValue({
      matches: [
        {
          clinicId: 12,
          name: '爱宠动物医院望京店',
          address: '北京市朝阳区望京路 9 号',
          city: '北京',
          district: '朝阳区',
          phone: '010-12345678',
          businessHours: '09:00-21:00',
          distance: 120,
          matchScore: 95,
          matchReasons: ['名称高度相似', '距离非常近'],
        },
      ],
    });
    clinicSubmissionsService.createSubmission.mockResolvedValue({
      id: 1001,
      status: ClinicSubmissionStatus.PendingReview,
      matchedClinics: [],
    });
    clinicSubmissionsService.getMySubmissions.mockResolvedValue({
      list: [
        {
          id: 1001,
          submissionType: ClinicSubmissionType.New,
          status: ClinicSubmissionStatus.PendingReview,
          clinicId: null,
          matchedClinicId: null,
          name: '望京安心宠物诊所',
          address: '北京市朝阳区望京街道花家地北里 10 号',
          city: '北京',
          district: '朝阳区',
          phone: '13800000000',
          reason: '小区周边新开的宠物诊所，搜索不到',
          reviewNote: null,
          createdAt: '2026-05-12T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    clinicSubmissionsService.getAdminSubmissions.mockResolvedValue({
      list: [
        {
          id: 1001,
          submissionType: ClinicSubmissionType.New,
          status: ClinicSubmissionStatus.PendingReview,
          clinicId: null,
          matchedClinicId: null,
          name: '望京安心宠物诊所',
          address: '北京市朝阳区望京街道花家地北里 10 号',
          city: '北京',
          district: '朝阳区',
          phone: '13800000000',
          reason: '小区周边新开的宠物诊所，搜索不到',
          reviewNote: null,
          createdAt: '2026-05-12T10:00:00.000Z',
          reviewedAt: null,
          submitter: {
            userId: 1,
            nickname: '测试用户',
            city: '北京',
          },
          reviewer: null,
          linkedClinic: null,
          matchedClinic: null,
          potentialMatches: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    clinicSubmissionsService.getAdminSubmissionDetail.mockResolvedValue({
      id: 1001,
      submissionType: ClinicSubmissionType.New,
      status: ClinicSubmissionStatus.PendingReview,
      clinicId: null,
      matchedClinicId: null,
      name: '望京安心宠物诊所',
      address: '北京市朝阳区望京街道花家地北里 10 号',
      city: '北京',
      district: '朝阳区',
      lat: 39.9876,
      lng: 116.4699,
      phone: '13800000000',
      businessHours: '10:00-20:00',
      photos: ['https://example.com/clinic-a.jpg'],
      reason: '小区周边新开的宠物诊所，搜索不到',
      reviewNote: null,
      createdAt: '2026-05-12T10:00:00.000Z',
      updatedAt: '2026-05-12T10:00:00.000Z',
      reviewedAt: null,
      submitter: {
        userId: 1,
        nickname: '测试用户',
        city: '北京',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
      reviewer: null,
      linkedClinic: null,
      matchedClinic: null,
      potentialMatches: [],
      historicalDuplicates: [],
    });
    clinicSubmissionsService.reviewSubmission.mockResolvedValue({
      id: 1001,
      status: ClinicSubmissionStatus.ApprovedNew,
      clinicId: 88,
      matchedClinicId: null,
      reviewedAt: '2026-05-12T11:00:00.000Z',
      reviewNote: '资料完整，创建新诊所',
      reviewLogId: 501,
    });
    clinicSubmissionsService.getAdminSubmissionReviewLogs.mockResolvedValue({
      submissionId: 1001,
      list: [
        {
          id: 501,
          action: ClinicSubmissionReviewAction.ApprovedNew,
          beforeStatus: ClinicSubmissionStatus.PendingReview,
          afterStatus: ClinicSubmissionStatus.ApprovedNew,
          note: '资料完整，创建新诊所',
          createdAt: '2026-05-12T11:00:00.000Z',
          reviewer: {
            adminUserId: 901,
            username: 'review_admin',
            displayName: '推荐审核员',
          },
        },
      ],
    });

    clinicsService.createClinicClaimRequest.mockResolvedValue({
      id: 2001,
      status: ClaimStatus.Pending,
    });
    clinicsService.getMyClinicClaimRequests.mockResolvedValue({
      list: [
        {
          id: 2001,
          clinicId: 88,
          clinicName: '望京安心宠物诊所',
          clinicAddress: '北京市朝阳区望京街道花家地北里 10 号',
          clinicCity: '北京',
          clinicDistrict: '朝阳区',
          applicantName: '张医生',
          applicantPhone: '13800000000',
          proofMaterial: '营业执照与门头照片',
          status: ClaimStatus.Pending,
          reviewNote: null,
          reviewedAt: null,
          createdAt: '2026-05-12T12:00:00.000Z',
        },
      ],
      total: 1,
    });
    clinicsService.getClinicClaimRequestDetail.mockResolvedValue({
      id: 2001,
      clinicId: 88,
      clinicName: '望京安心宠物诊所',
      clinicAddress: '北京市朝阳区望京街道花家地北里 10 号',
      clinicCity: '北京',
      clinicDistrict: '朝阳区',
      applicantName: '张医生',
      applicantPhone: '13800000000',
      proofMaterial: '营业执照与门头照片',
      status: ClaimStatus.Pending,
      reviewNote: null,
      reviewedAt: null,
      createdAt: '2026-05-12T12:00:00.000Z',
      submitterUserId: 1,
    });
    clinicsService.getAdminClaimRequests.mockResolvedValue({
      list: [
        {
          id: 2001,
          clinicId: 88,
          clinicName: '望京安心宠物诊所',
          clinicAddress: '北京市朝阳区望京街道花家地北里 10 号',
          clinicCity: '北京',
          clinicDistrict: '朝阳区',
          applicantName: '张医生',
          applicantPhone: '13800000000',
          proofMaterial: '营业执照与门头照片',
          status: ClaimStatus.Pending,
          reviewNote: null,
          reviewedAt: null,
          createdAt: '2026-05-12T12:00:00.000Z',
          submitter: {
            userId: 1,
            nickname: '测试用户',
            city: '北京',
          },
          reviewedBy: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    clinicsService.reviewClinicClaimRequest.mockResolvedValue({
      id: 2001,
      status: ClaimStatus.Approved,
      reviewedAt: '2026-05-12T13:00:00.000Z',
      reviewNote:
        '证照和联系人信息一致\n后台登录账号：clinic_admin_88，初始密码：Clinic@88888',
      reviewedBy: 901,
      clinicAccount: {
        clinicAccountId: 301,
        username: 'clinic_admin_88',
        temporaryPassword: 'Clinic@88888',
      },
    });
    clinicsService.submitClinicResponse.mockResolvedValue({
      responseId: 6001,
      status: ResponseStatus.Pending,
      createdAt: '2026-05-12T14:00:00.000Z',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        code: 'dev:openid-r19',
      })
      .expect(200);

    expect(loginResponse.body.data.token).toBe('user-token');
    expect(authService.login).toHaveBeenCalledWith('dev:openid-r19');

    const matchesResponse = await request(app.getHttpServer())
      .get('/api/v1/clinic-submissions/matches')
      .set('Authorization', 'Bearer user-token')
      .query({
        name: '望京安心宠物诊所',
        address: '北京市朝阳区望京街道花家地北里 10 号',
        city: '北京',
        district: '朝阳区',
        lat: '39.9876',
        lng: '116.4699',
      })
      .expect(200);

    expect(matchesResponse.body).toEqual({
      code: 0,
      message: 'success',
      data: {
        matches: [
          {
            clinicId: 12,
            name: '爱宠动物医院望京店',
            address: '北京市朝阳区望京路 9 号',
            city: '北京',
            district: '朝阳区',
            phone: '010-12345678',
            businessHours: '09:00-21:00',
            distance: 120,
            matchScore: 95,
            matchReasons: ['名称高度相似', '距离非常近'],
          },
        ],
      },
    });
    expect(clinicSubmissionsService.getSubmissionMatches).toHaveBeenCalledWith({
      name: '望京安心宠物诊所',
      address: '北京市朝阳区望京街道花家地北里 10 号',
      city: '北京',
      district: '朝阳区',
      lat: 39.9876,
      lng: 116.4699,
    });

    const createSubmissionResponse = await request(app.getHttpServer())
      .post('/api/v1/clinic-submissions')
      .set('Authorization', 'Bearer user-token')
      .send({
        submissionType: ClinicSubmissionType.New,
        name: '望京安心宠物诊所',
        address: '北京市朝阳区望京街道花家地北里 10 号',
        city: '北京',
        district: '朝阳区',
        lat: 39.9876,
        lng: 116.4699,
        phone: '13800000000',
        businessHours: '10:00-20:00',
        photos: ['https://example.com/clinic-a.jpg'],
        reason: '小区周边新开的宠物诊所，搜索不到',
      })
      .expect(201);

    expect(createSubmissionResponse.body).toEqual({
      code: 0,
      message: '提交成功，等待审核',
      data: {
        id: 1001,
        status: ClinicSubmissionStatus.PendingReview,
        matchedClinics: [],
      },
    });
    expect(clinicSubmissionsService.createSubmission).toHaveBeenCalledWith(
      '1',
      {
        submissionType: ClinicSubmissionType.New,
        name: '望京安心宠物诊所',
        address: '北京市朝阳区望京街道花家地北里 10 号',
        city: '北京',
        district: '朝阳区',
        lat: 39.9876,
        lng: 116.4699,
        phone: '13800000000',
        businessHours: '10:00-20:00',
        photos: ['https://example.com/clinic-a.jpg'],
        reason: '小区周边新开的宠物诊所，搜索不到',
      },
    );

    const mySubmissionsResponse = await request(app.getHttpServer())
      .get('/api/v1/clinic-submissions/my')
      .set('Authorization', 'Bearer user-token')
      .query({
        status: ClinicSubmissionStatus.PendingReview,
        page: '1',
        pageSize: '20',
      })
      .expect(200);

    expect(mySubmissionsResponse.body.data.total).toBe(1);
    expect(clinicSubmissionsService.getMySubmissions).toHaveBeenCalledWith(
      '1',
      {
        status: ClinicSubmissionStatus.PendingReview,
        page: 1,
        pageSize: 20,
      },
    );

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({
        username: 'review_admin',
        password: 'Admin123456!',
      })
      .expect(200);

    expect(adminLoginResponse.body.data.token).toBe('admin-token');
    expect(authService.loginAdmin).toHaveBeenCalledWith({
      username: 'review_admin',
      password: 'Admin123456!',
    });

    const adminQueueResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/clinic-submissions')
      .set('Authorization', 'Bearer admin-token')
      .query({
        status: ClinicSubmissionStatus.PendingReview,
        city: '北京',
        page: '1',
        pageSize: '20',
      })
      .expect(200);

    expect(adminQueueResponse.body.data.total).toBe(1);
    expect(clinicSubmissionsService.getAdminSubmissions).toHaveBeenCalledWith({
      status: ClinicSubmissionStatus.PendingReview,
      city: '北京',
      page: 1,
      pageSize: 20,
    });

    const adminDetailResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/clinic-submissions/1001')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(adminDetailResponse.body.data.id).toBe(1001);
    expect(clinicSubmissionsService.getAdminSubmissionDetail).toHaveBeenCalledWith(
      1001,
    );

    const reviewSubmissionResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/clinic-submissions/1001/review')
      .set('Authorization', 'Bearer admin-token')
      .send({
        action: ClinicSubmissionReviewAction.ApprovedNew,
        note: '资料完整，创建新诊所',
      })
      .expect(201);

    expect(reviewSubmissionResponse.body).toEqual({
      code: 0,
      message: '审核完成',
      data: {
        id: 1001,
        status: ClinicSubmissionStatus.ApprovedNew,
        clinicId: 88,
        matchedClinicId: null,
        reviewedAt: '2026-05-12T11:00:00.000Z',
        reviewNote: '资料完整，创建新诊所',
        reviewLogId: 501,
      },
    });
    expect(clinicSubmissionsService.reviewSubmission).toHaveBeenCalledWith(
      '901',
      1001,
      {
        action: ClinicSubmissionReviewAction.ApprovedNew,
        note: '资料完整，创建新诊所',
      },
    );

    const reviewLogsResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/clinic-submissions/1001/review-logs')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(reviewLogsResponse.body.data.list).toHaveLength(1);
    expect(
      clinicSubmissionsService.getAdminSubmissionReviewLogs,
    ).toHaveBeenCalledWith(1001);

    const createClaimResponse = await request(app.getHttpServer())
      .post('/api/v1/clinics/88/claim-requests')
      .set('Authorization', 'Bearer user-token')
      .send({
        applicantName: '张医生',
        applicantPhone: '13800000000',
        proofMaterial: '营业执照与门头照片',
      })
      .expect(201);

    expect(createClaimResponse.body).toEqual({
      code: 0,
      message: '认领申请已提交，等待审核',
      data: {
        id: 2001,
        status: ClaimStatus.Pending,
      },
    });
    expect(clinicsService.createClinicClaimRequest).toHaveBeenCalledWith(
      88,
      '1',
      {
        applicantName: '张医生',
        applicantPhone: '13800000000',
        proofMaterial: '营业执照与门头照片',
      },
    );

    const myClaimsResponse = await request(app.getHttpServer())
      .get('/api/v1/clinic-claim-requests/my')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(myClaimsResponse.body.data.total).toBe(1);
    expect(clinicsService.getMyClinicClaimRequests).toHaveBeenCalledWith('1');

    const claimDetailResponse = await request(app.getHttpServer())
      .get('/api/v1/clinic-claim-requests/2001')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(claimDetailResponse.body.data.id).toBe(2001);
    expect(clinicsService.getClinicClaimRequestDetail).toHaveBeenCalledWith(
      2001,
      expect.objectContaining({
        userId: '1',
        actorType: 'user',
      }),
    );

    const adminClaimQueueResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/claim-requests')
      .set('Authorization', 'Bearer admin-token')
      .query({
        status: ClaimStatus.Pending,
        page: '1',
        pageSize: '20',
      })
      .expect(200);

    expect(adminClaimQueueResponse.body.data.total).toBe(1);
    expect(clinicsService.getAdminClaimRequests).toHaveBeenCalledWith({
      status: ClaimStatus.Pending,
      page: 1,
      pageSize: 20,
    });

    const reviewClaimResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/claim-requests/2001/review')
      .set('Authorization', 'Bearer admin-token')
      .send({
        action: ClaimStatus.Approved,
        note: '证照和联系人信息一致',
      })
      .expect(201);

    expect(reviewClaimResponse.body).toEqual({
      code: 0,
      message: '审核完成',
      data: {
        id: 2001,
        status: ClaimStatus.Approved,
        reviewedAt: '2026-05-12T13:00:00.000Z',
        reviewNote:
          '证照和联系人信息一致\n后台登录账号：clinic_admin_88，初始密码：Clinic@88888',
        reviewedBy: 901,
        clinicAccount: {
          clinicAccountId: 301,
          username: 'clinic_admin_88',
          temporaryPassword: 'Clinic@88888',
        },
      },
    });
    expect(clinicsService.reviewClinicClaimRequest).toHaveBeenCalledWith(
      '901',
      2001,
      {
        action: ClaimStatus.Approved,
        note: '证照和联系人信息一致',
      },
    );

    const clinicLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/clinic/login')
      .send({
        username: 'clinic_admin_88',
        password: 'Clinic@88888',
      })
      .expect(200);

    expect(clinicLoginResponse.body.data.token).toBe('clinic-token');
    expect(authService.loginClinic).toHaveBeenCalledWith({
      username: 'clinic_admin_88',
      password: 'Clinic@88888',
    });

    const clinicSessionResponse = await request(app.getHttpServer())
      .get('/api/v1/clinic/session')
      .set('Authorization', 'Bearer clinic-token')
      .expect(200);

    expect(clinicSessionResponse.body).toEqual({
      code: 0,
      message: 'success',
      data: {
        actorType: 'clinic',
        actorId: '301',
        clinicAccountId: '301',
        clinicId: 88,
        username: 'clinic_admin_88',
        createdAt: '2026-05-12T10:00:00.000Z',
      },
    });
    expect(authService.getClinicSession).toHaveBeenCalledWith('301');

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/clinics/88/responses')
      .set('Authorization', 'Bearer clinic-token')
      .send({
        tagId: 8,
        responseText: '我们已补充收费说明并在前台公示。',
      })
      .expect(201);

    expect(submitResponse.body).toEqual({
      code: 0,
      message: '提交成功，等待审核',
      data: {
        responseId: 6001,
        status: ResponseStatus.Pending,
        createdAt: '2026-05-12T14:00:00.000Z',
      },
    });
    expect(clinicsService.submitClinicResponse).toHaveBeenCalledWith(
      88,
      expect.objectContaining({
        clinicAccountId: '301',
        clinicId: 88,
        actorType: 'clinic',
      }),
      {
        tagId: 8,
        responseText: '我们已补充收费说明并在前台公示。',
      },
    );
  });
});
