export enum AuthActorType {
  User = 'user',
  Clinic = 'clinic',
}

export interface JwtPayload {
  sub: string;
  actorType: AuthActorType;
  actorId: string;
  userId?: string;
  openid?: string;
  clinicId?: number;
  clinicAccountId?: string;
  username?: string;
}
