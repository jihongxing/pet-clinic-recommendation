import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AdminUserEntity,
  ClinicAccountEntity,
  ClinicEntity,
  UserEntity,
} from '../../database/entities';
import { AdminAuthController } from './admin-auth.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClinicAuthController } from './clinic-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('auth.jwtSecret') ?? 'dev_only_change_me',
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn') ?? '7d',
        },
      }),
    }),
    TypeOrmModule.forFeature([
      AdminUserEntity,
      UserEntity,
      ClinicEntity,
      ClinicAccountEntity,
    ]),
  ],
  controllers: [AuthController, AdminAuthController, ClinicAuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
