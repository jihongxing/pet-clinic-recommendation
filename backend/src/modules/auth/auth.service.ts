import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import {
  ClinicAccountEntity,
  ClinicEntity,
  UserEntity,
} from '../../database/entities';
import { IssueDevTokenDto } from './dto/issue-dev-token.dto';
import { AuthActorType, JwtPayload } from './interfaces/jwt-payload.interface';
import { WechatSessionResponse } from './interfaces/wechat-session.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicRepository: Repository<ClinicEntity>,
    @InjectRepository(ClinicAccountEntity)
    private readonly clinicAccountRepository: Repository<ClinicAccountEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(code: string) {
    const openid = await this.resolveOpenIdByCode(code);
    const user = await this.resolveUserByOpenId(openid);

    return {
      token: await this.jwtService.signAsync(this.buildUserJwtPayload(user)),
      user: this.toUserActor(user),
    };
  }

  async issueDevToken(payload: IssueDevTokenDto) {
    const allowDevTokenIssuance =
      this.configService.get<boolean>('auth.allowDevTokenIssuance') ?? false;

    if (!allowDevTokenIssuance) {
      throw new ForbiddenException('当前环境不允许签发开发令牌');
    }

    const actorType = payload.actorType ?? AuthActorType.User;

    if (actorType === AuthActorType.Clinic) {
      const clinicAccount = await this.resolveDevClinicAccount(payload);
      const tokenPayload = this.buildClinicJwtPayload(clinicAccount);

      return {
        token: await this.jwtService.signAsync(tokenPayload),
        expiresIn: this.configService.get<string>('auth.jwtExpiresIn') ?? '7d',
        actor: this.toClinicActor(clinicAccount),
      };
    }

    const user = await this.resolveDevUser(payload);
    const tokenPayload = this.buildUserJwtPayload(user);

    return {
      token: await this.jwtService.signAsync(tokenPayload),
      expiresIn: this.configService.get<string>('auth.jwtExpiresIn') ?? '7d',
      actor: this.toUserActor(user),
    };
  }

  private async resolveOpenIdByCode(code: string) {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_MISSING,
        message: 'code 不能为空',
      });
    }

    const mockOpenId = this.resolveMockOpenId(normalizedCode);

    if (mockOpenId) {
      return mockOpenId;
    }

    return this.fetchWechatOpenId(normalizedCode);
  }

  private resolveMockOpenId(code: string) {
    const allowMockWechatLogin =
      this.configService.get<boolean>('auth.allowMockWechatLogin') ?? false;

    if (!allowMockWechatLogin || !code.startsWith('dev:')) {
      return null;
    }

    const mockOpenId = code.slice(4).trim();

    if (!mockOpenId) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '开发环境登录 code 格式无效',
      });
    }

    return mockOpenId;
  }

  private async fetchWechatOpenId(code: string) {
    const wechatAppId =
      this.configService.get<string>('auth.wechatAppId')?.trim() ?? '';
    const wechatSecret =
      this.configService.get<string>('auth.wechatSecret')?.trim() ?? '';

    if (!wechatAppId || !wechatSecret) {
      throw new ServiceUnavailableException({
        code: RESPONSE_CODE.INTERNAL_SERVER_ERROR,
        message: '微信登录配置缺失',
      });
    }

    const wechatApiBaseUrl =
      this.configService.get<string>('auth.wechatApiBaseUrl')?.trim() ??
      'https://api.weixin.qq.com/sns/jscode2session';

    try {
      const response = await axios.get<WechatSessionResponse>(
        wechatApiBaseUrl,
        {
          params: {
            appid: wechatAppId,
            secret: wechatSecret,
            js_code: code,
            grant_type: 'authorization_code',
          },
          timeout: 5000,
        },
      );

      const session = response.data;

      if (session.openid) {
        return session.openid;
      }

      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: session.errmsg || '微信登录失败，请重试',
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new ServiceUnavailableException({
        code: RESPONSE_CODE.INTERNAL_SERVER_ERROR,
        message: '微信登录服务暂时不可用',
      });
    }
  }

  private async resolveUserByOpenId(openid: string) {
    const existingUser = await this.userRepository.findOne({
      where: { openid },
    });

    if (existingUser) {
      existingUser.lastLoginAt = new Date();

      return this.userRepository.save(existingUser);
    }

    const user = this.userRepository.create({
      openid,
      lastLoginAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  private async resolveDevUser(payload: IssueDevTokenDto) {
    const trimmedUserId = payload.userId?.trim();
    const normalizedOpenid =
      payload.openid?.trim() || `dev-openid-${Date.now()}`;

    if (trimmedUserId) {
      const existingUser = await this.userRepository.findOne({
        where: { id: trimmedUserId },
      });

      if (!existingUser) {
        throw new NotFoundException({
          code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
          message: '用户不存在',
        });
      }

      existingUser.nickname = payload.nickname ?? existingUser.nickname;
      existingUser.avatar = payload.avatar ?? existingUser.avatar;
      existingUser.city = payload.city ?? existingUser.city;
      existingUser.lastLoginAt = new Date();

      return this.userRepository.save(existingUser);
    }

    const existingUser = await this.userRepository.findOne({
      where: { openid: normalizedOpenid },
    });

    if (existingUser) {
      existingUser.nickname = payload.nickname ?? existingUser.nickname;
      existingUser.avatar = payload.avatar ?? existingUser.avatar;
      existingUser.city = payload.city ?? existingUser.city;
      existingUser.lastLoginAt = new Date();

      return this.userRepository.save(existingUser);
    }

    const user = this.userRepository.create({
      openid: normalizedOpenid,
      nickname: payload.nickname ?? '开发环境用户',
      avatar: payload.avatar ?? null,
      city: payload.city ?? null,
      lastLoginAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  private async resolveDevClinicAccount(payload: IssueDevTokenDto) {
    const clinicId = payload.clinicId;
    const normalizedUsername = payload.username?.trim();

    if (!clinicId && !normalizedUsername) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_MISSING,
        message: '诊所开发令牌至少需要提供 clinicId 或 username',
      });
    }

    if (clinicId) {
      const existingClinicAccount = await this.clinicAccountRepository.findOne({
        where: { clinicId },
      });

      if (existingClinicAccount) {
        return existingClinicAccount;
      }

      if (normalizedUsername) {
        const accountByUsername = await this.clinicAccountRepository.findOne({
          where: { username: normalizedUsername },
        });

        if (accountByUsername && accountByUsername.clinicId !== clinicId) {
          throw new BadRequestException({
            code: RESPONSE_CODE.PARAM_INVALID,
            message: '诊所后台用户名已被其他诊所占用',
          });
        }
      }

      const clinic = await this.clinicRepository.findOne({
        where: {
          id: clinicId,
          status: 1,
        },
      });

      if (!clinic) {
        throw new NotFoundException({
          code: RESPONSE_CODE.CLINIC_NOT_FOUND,
          message: '诊所不存在',
        });
      }

      const clinicAccount = this.clinicAccountRepository.create({
        clinicId,
        username: normalizedUsername || `clinic_admin_${clinicId}`,
        passwordHash: 'dev-token-only',
        status: 1,
      });

      return this.clinicAccountRepository.save(clinicAccount);
    }

    const clinicAccount = await this.clinicAccountRepository.findOne({
      where: { username: normalizedUsername! },
    });

    if (!clinicAccount) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '诊所后台账户不存在',
      });
    }

    return clinicAccount;
  }

  private buildUserJwtPayload(user: UserEntity): JwtPayload {
    return {
      sub: user.id,
      actorType: AuthActorType.User,
      actorId: user.id,
      userId: user.id,
      openid: user.openid,
    };
  }

  private buildClinicJwtPayload(
    clinicAccount: ClinicAccountEntity,
  ): JwtPayload {
    return {
      sub: clinicAccount.id,
      actorType: AuthActorType.Clinic,
      actorId: clinicAccount.id,
      clinicAccountId: clinicAccount.id,
      clinicId: clinicAccount.clinicId,
      username: clinicAccount.username,
    };
  }

  private toUserActor(user: UserEntity) {
    return {
      actorType: AuthActorType.User,
      actorId: user.id,
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      city: user.city,
      createdAt: user.createdAt,
    };
  }

  private toClinicActor(clinicAccount: ClinicAccountEntity) {
    return {
      actorType: AuthActorType.Clinic,
      actorId: clinicAccount.id,
      clinicAccountId: clinicAccount.id,
      clinicId: clinicAccount.clinicId,
      username: clinicAccount.username,
      createdAt: clinicAccount.createdAt,
    };
  }
}
