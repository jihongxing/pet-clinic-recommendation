import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';

import {
  ClinicAccountEntity,
  ClinicEntity,
  UserEntity,
} from '../../database/entities';
import { AuthService } from './auth.service';
import { AuthActorType } from './interfaces/jwt-payload.interface';

describe('AuthService', () => {
  let service: AuthService;
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
    userRepository = module.get(getRepositoryToken(UserEntity));
    clinicRepository = module.get(getRepositoryToken(ClinicEntity));
    clinicAccountRepository = module.get(
      getRepositoryToken(ClinicAccountEntity),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
