import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
import { AuthActorType } from '../interfaces/jwt-payload.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();
  const context = {} as ExecutionContext;

  it('returns authenticated user when token is valid', () => {
    const user = {
      sub: '1',
      actorType: AuthActorType.User,
      actorId: '1',
      userId: '1',
      openid: 'dev-openid-1',
    };

    expect(guard.handleRequest(null, user, undefined, context)).toBe(user);
  });

  it('maps expired token errors to TOKEN_EXPIRED', () => {
    try {
      guard.handleRequest(
        null,
        undefined,
        { name: 'TokenExpiredError', message: 'jwt expired' } as Error,
        context,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual({
        code: RESPONSE_CODE.TOKEN_EXPIRED,
        message: '登录已过期，请重新登录',
      });
    }
  });

  it('maps missing token errors to UNAUTHORIZED', () => {
    try {
      guard.handleRequest(
        null,
        undefined,
        { name: 'Error', message: 'No authorization token was found' } as Error,
        context,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual({
        code: RESPONSE_CODE.UNAUTHORIZED,
        message: '未提供访问令牌',
      });
    }
  });
});
