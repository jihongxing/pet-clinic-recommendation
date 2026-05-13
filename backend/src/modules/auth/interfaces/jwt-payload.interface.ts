export enum AuthActorType {
  User = 'user',
  Clinic = 'clinic',
  Admin = 'admin',
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
  adminUserId?: string;
  adminUsername?: string;
}
