import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: AuthenticatedUser | undefined,
    info: Error | undefined,
    _context: ExecutionContext,
    _status?: unknown,
  ) {
    void _context;
    void _status;

    if (err) {
      throw err;
    }

    if (user) {
      return user as TUser;
    }

    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        code: RESPONSE_CODE.TOKEN_EXPIRED,
        message: '登录已过期，请重新登录',
      });
    }

    if (
      info?.message === 'No auth token' ||
      info?.message === 'No authorization token was found'
    ) {
      throw new UnauthorizedException({
        code: RESPONSE_CODE.UNAUTHORIZED,
        message: '未提供访问令牌',
      });
    }

    throw new UnauthorizedException({
      code: RESPONSE_CODE.TOKEN_INVALID,
      message: '无效的访问令牌',
    });
  }
}
