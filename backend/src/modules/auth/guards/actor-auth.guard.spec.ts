import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
import { AuthActorType } from '../interfaces/jwt-payload.interface';
import { ClinicAuthGuard } from './clinic-auth.guard';
import { UserAuthGuard } from './user-auth.guard';

describe('ActorAuthGuards', () => {
  const context = {} as ExecutionContext;

  it('allows a user actor through UserAuthGuard', () => {
    const guard = new UserAuthGuard();
    const user = {
      sub: '1',
      actorType: AuthActorType.User,
      actorId: '1',
      userId: '1',
      openid: 'dev-openid-1',
    };

    expect(guard.handleRequest(null, user, undefined, context)).toBe(user);
  });

  it('rejects a clinic actor on UserAuthGuard', () => {
    const guard = new UserAuthGuard();

    expect(() =>
      guard.handleRequest(
        null,
        {
          sub: '301',
          actorType: AuthActorType.Clinic,
          actorId: '301',
          clinicAccountId: '301',
          clinicId: 8,
          username: 'clinic_admin_8',
        },
        undefined,
        context,
      ),
    ).toThrow(
      expect.objectContaining({
        response: {
          code: RESPONSE_CODE.TOKEN_INVALID,
          message: '当前令牌不支持访问用户接口',
        },
      }),
    );
  });

  it('allows a clinic actor through ClinicAuthGuard', () => {
    const guard = new ClinicAuthGuard();
    const clinicActor = {
      sub: '301',
      actorType: AuthActorType.Clinic,
      actorId: '301',
      clinicAccountId: '301',
      clinicId: 8,
      username: 'clinic_admin_8',
    };

    expect(guard.handleRequest(null, clinicActor, undefined, context)).toBe(
      clinicActor,
    );
  });

  it('rejects a user actor on ClinicAuthGuard', () => {
    const guard = new ClinicAuthGuard();

    try {
      guard.handleRequest(
        null,
        {
          sub: '1',
          actorType: AuthActorType.User,
          actorId: '1',
          userId: '1',
          openid: 'dev-openid-1',
        },
        undefined,
        context,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual({
        code: RESPONSE_CODE.TOKEN_INVALID,
        message: '当前令牌不支持访问诊所接口',
      });
    }
  });
});
