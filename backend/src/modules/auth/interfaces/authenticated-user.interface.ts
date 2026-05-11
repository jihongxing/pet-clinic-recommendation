import { JwtPayload } from './jwt-payload.interface';

export interface AuthenticatedUser extends JwtPayload {
  iat?: number;
  exp?: number;
}
