import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthActorType, JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('auth.jwtSecret') ?? 'dev_only_change_me',
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const actorType = payload.actorType ?? AuthActorType.User;

    if (actorType === AuthActorType.Clinic) {
      const clinicAccountId = payload.clinicAccountId ?? payload.sub;

      if (!clinicAccountId || !payload.clinicId || !payload.username) {
        throw new UnauthorizedException({
          code: RESPONSE_CODE.TOKEN_INVALID,
          message: '无效的访问令牌',
        });
      }

      return {
        ...payload,
        actorType,
        actorId: payload.actorId ?? clinicAccountId,
        sub: payload.sub ?? clinicAccountId,
        clinicAccountId,
      };
    }

    const userId = payload.userId ?? payload.sub;

    if (!userId || !payload.openid) {
      throw new UnauthorizedException({
        code: RESPONSE_CODE.TOKEN_INVALID,
        message: '无效的访问令牌',
      });
    }

    return {
      ...payload,
      actorType: AuthActorType.User,
      actorId: payload.actorId ?? userId,
      sub: payload.sub ?? userId,
      userId,
    };
  }
}
