import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios from 'axios';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';

import {
  AdminUserEntity,
  ClinicAccountEntity,
  ClinicEntity,
  UserEntity,
} from '../../database/entities';
import { AuthService } from './auth.service';
import { AuthActorType } from './interfaces/jwt-payload.interface';

describe('AuthService', () => {
  let service: AuthService;
  let adminUserRepository: jest.Mocked<Repository<AdminUserEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let clinicRepository: jest.Mocked<Repository<ClinicEntity>>;
  let clinicAccountRepository: jest.Mocked<Repository<ClinicAccountEntity>>;
  let configService: { get: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'auth.allowDevTokenIssuance':
            return true;
          case 'auth.allowMockWechatLogin':
            return true;
          case 'auth.jwtExpiresIn':
            return '7d';
          case 'auth.wechatAppId':
            return 'wx-app-id';
          case 'auth.wechatSecret':
            return 'wx-secret';
          case 'auth.wechatApiBaseUrl':
            return 'https://api.weixin.qq.com/sns/jscode2session';
          default:
            return undefined;
        }
      }),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(AdminUserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
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
          provide: getRepositoryToken(ClinicAccountEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    adminUserRepository = module.get(getRepositoryToken(AdminUserEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
    clinicRepository = module.get(getRepositoryToken(ClinicEntity));
    clinicAccountRepository = module.get(
      getRepositoryToken(ClinicAccountEntity),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('issues an admin actor token in development and creates the admin user when needed', async () => {
    adminUserRepository.findOne.mockResolvedValueOnce(null);
    adminUserRepository.create.mockReturnValue({
      username: 'review_admin',
      passwordHash: 'hashed-password',
      displayName: '推荐审核员',
      status: 1,
      lastLoginAt: new Date('2026-05-12T00:00:00.000Z'),
    } as AdminUserEntity);
    adminUserRepository.save.mockResolvedValue({
      id: '901',
      username: 'review_admin',
      passwordHash: 'hashed-password',
      displayName: '推荐审核员',
      status: 1,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      lastLoginAt: new Date('2026-05-12T00:00:00.000Z'),
    } as AdminUserEntity);

    const result = await service.issueDevToken({
      actorType: AuthActorType.Admin,
      username: 'review_admin',
      displayName: '推荐审核员',
      password: 'Admin123456!',
    });

    expect(adminUserRepository.findOne).toHaveBeenCalledWith({
      where: { username: 'review_admin' },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: '901',
      actorType: AuthActorType.Admin,
      actorId: '901',
      adminUserId: '901',
      adminUsername: 'review_admin',
      username: 'review_admin',
    });
    expect(result.actor).toEqual({
      actorType: AuthActorType.Admin,
      actorId: '901',
      adminUserId: '901',
      username: 'review_admin',
      displayName: '推荐审核员',
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      lastLoginAt: new Date('2026-05-12T00:00:00.000Z'),
    });
  });

  it('logs in an admin user with username and password', async () => {
    const passwordHash = await (await import('bcryptjs')).hash('Admin123456!', 10);
    adminUserRepository.findOne.mockResolvedValue({
      id: '902',
      username: 'review_admin',
      passwordHash,
      displayName: '审核员 A',
      status: 1,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      lastLoginAt: null,
    } as AdminUserEntity);
    adminUserRepository.save.mockImplementation(async (entity) => entity as AdminUserEntity);

    const result = await service.loginAdmin({
      username: 'review_admin',
      password: 'Admin123456!',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: '902',
      actorType: AuthActorType.Admin,
      actorId: '902',
      adminUserId: '902',
      adminUsername: 'review_admin',
      username: 'review_admin',
    });
    expect(result.admin).toMatchObject({
      actorType: AuthActorType.Admin,
      adminUserId: '902',
      username: 'review_admin',
      displayName: '审核员 A',
    });
  });

  it('logs in a clinic account with username and password', async () => {
    const passwordHash = await (await import('bcryptjs')).hash('Clinic@12888', 10);
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
      passwordHash,
      status: 1,
      createdAt: new Date('2026-05-13T08:00:00.000Z'),
    } as ClinicAccountEntity);

    const result = await service.loginClinic({
      username: 'clinic_admin_12',
      password: 'Clinic@12888',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: '301',
      actorType: AuthActorType.Clinic,
      actorId: '301',
      clinicAccountId: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
    });
    expect(result.clinic).toMatchObject({
      actorType: AuthActorType.Clinic,
      clinicAccountId: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
    });
  });

  it('returns clinic session for an active clinic account', async () => {
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
      status: 1,
      createdAt: new Date('2026-05-13T08:00:00.000Z'),
    } as ClinicAccountEntity);

    await expect(service.getClinicSession('301')).resolves.toEqual({
      actorType: AuthActorType.Clinic,
      actorId: '301',
      clinicAccountId: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
      createdAt: new Date('2026-05-13T08:00:00.000Z'),
    });

    expect(clinicAccountRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: '301',
        status: 1,
      },
    });
  });

  it('throws when clinic session target is missing or disabled', async () => {
    clinicAccountRepository.findOne.mockResolvedValue(null);

    await expect(service.getClinicSession('999')).rejects.toThrow(
      '诊所账号不存在或已停用',
    );
  });

  it('creates a user and returns a token for development mock login', async () => {
    userRepository.findOne.mockResolvedValueOnce(null);
    userRepository.create.mockReturnValue({
      openid: 'dev-openid-001',
      nickname: null,
      avatar: null,
      city: null,
      lastLoginAt: new Date('2026-05-12T00:00:00.000Z'),
    } as UserEntity);
    userRepository.save.mockResolvedValue({
      id: '10',
      openid: 'dev-openid-001',
      nickname: null,
      avatar: null,
      city: null,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      lastLoginAt: new Date('2026-05-12T00:00:00.000Z'),
    } as UserEntity);

    const result = await service.login('dev:dev-openid-001');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { openid: 'dev-openid-001' },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: '10',
      actorType: AuthActorType.User,
      actorId: '10',
      userId: '10',
      openid: 'dev-openid-001',
    });
    expect(result).toEqual({
      token: 'jwt-token',
      user: {
        actorType: AuthActorType.User,
        actorId: '10',
        id: '10',
        openid: 'dev-openid-001',
        nickname: null,
        avatar: null,
        city: null,
        createdAt: new Date('2026-05-12T00:00:00.000Z'),
      },
    });
  });

  it('uses WeChat session exchange when a real code is provided', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        openid: 'wx-openid-001',
        session_key: 'session-key',
      },
    });
    userRepository.findOne.mockResolvedValueOnce({
      id: '20',
      openid: 'wx-openid-001',
      nickname: '微信用户',
      avatar: null,
      city: null,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      lastLoginAt: null,
    } as UserEntity);
    userRepository.save.mockResolvedValue({
      id: '20',
      openid: 'wx-openid-001',
      nickname: '微信用户',
      avatar: null,
      city: null,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      lastLoginAt: new Date('2026-05-12T00:00:00.000Z'),
    } as UserEntity);

    const result = await service.login('real-wechat-code');

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.weixin.qq.com/sns/jscode2session',
      expect.objectContaining({
        params: expect.objectContaining({
          appid: 'wx-app-id',
          secret: 'wx-secret',
          js_code: 'real-wechat-code',
          grant_type: 'authorization_code',
        }),
      }),
    );
    expect(result.token).toBe('jwt-token');
    expect(result.user.openid).toBe('wx-openid-001');
  });

  it('issues a clinic actor token for an existing clinic account', async () => {
    clinicAccountRepository.findOne.mockResolvedValue({
      id: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
      passwordHash: 'dev-token-only',
      status: 1,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
    } as ClinicAccountEntity);

    const result = await service.issueDevToken({
      actorType: AuthActorType.Clinic,
      clinicId: 12,
    });

    expect(clinicAccountRepository.findOne).toHaveBeenCalledWith({
      where: { clinicId: 12 },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: '301',
      actorType: AuthActorType.Clinic,
      actorId: '301',
      clinicAccountId: '301',
      clinicId: 12,
      username: 'clinic_admin_12',
    });
    expect(result).toEqual({
      token: 'jwt-token',
      expiresIn: '7d',
      actor: {
        actorType: AuthActorType.Clinic,
        actorId: '301',
        clinicAccountId: '301',
        clinicId: 12,
        username: 'clinic_admin_12',
        createdAt: new Date('2026-05-12T00:00:00.000Z'),
      },
    });
  });

  it('creates a clinic account when issuing a clinic actor token for an existing clinic', async () => {
    clinicAccountRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    clinicRepository.findOne.mockResolvedValue({
      id: 18,
      status: 1,
    } as ClinicEntity);
    clinicAccountRepository.create.mockReturnValue({
      clinicId: 18,
      username: 'clinic_admin_18',
      passwordHash: 'dev-token-only',
      status: 1,
    } as ClinicAccountEntity);
    clinicAccountRepository.save.mockResolvedValue({
      id: '302',
      clinicId: 18,
      username: 'clinic_admin_18',
      passwordHash: 'dev-token-only',
      status: 1,
      createdAt: new Date('2026-05-12T08:00:00.000Z'),
    } as ClinicAccountEntity);

    const result = await service.issueDevToken({
      actorType: AuthActorType.Clinic,
      clinicId: 18,
    });

    expect(clinicRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 18,
        status: 1,
      },
    });
    expect(clinicAccountRepository.create).toHaveBeenCalledWith({
      clinicId: 18,
      username: 'clinic_admin_18',
      passwordHash: 'dev-token-only',
      status: 1,
    });
    expect(result.actor).toMatchObject({
      actorType: AuthActorType.Clinic,
      clinicId: 18,
      clinicAccountId: '302',
    });
  });

  it('throws when development mock login code is malformed', async () => {
    await expect(service.login('dev:')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when wechat configuration is missing for real login', async () => {
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'auth.allowDevTokenIssuance':
          return true;
        case 'auth.allowMockWechatLogin':
          return true;
        case 'auth.jwtExpiresIn':
          return '7d';
        case 'auth.wechatAppId':
          return '';
        case 'auth.wechatSecret':
          return '';
        default:
          return undefined;
      }
    });

    await expect(service.login('real-wechat-code')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
