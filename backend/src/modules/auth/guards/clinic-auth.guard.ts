import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthActorType } from '../interfaces/jwt-payload.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class ClinicAuthGuard extends JwtAuthGuard {
  override handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: AuthenticatedUser | undefined,
    info: Error | undefined,
    context: ExecutionContext,
    status?: unknown,
  ) {
    const authenticatedUser = super.handleRequest<AuthenticatedUser>(
      err,
      user,
      info,
      context,
      status,
    );

    if (
      authenticatedUser.actorType !== AuthActorType.Clinic ||
      !authenticatedUser.clinicAccountId ||
      !authenticatedUser.clinicId
    ) {
      throw new UnauthorizedException({
        code: RESPONSE_CODE.TOKEN_INVALID,
        message: '当前令牌不支持访问诊所接口',
      });
    }

    return authenticatedUser as TUser;
  }
}
