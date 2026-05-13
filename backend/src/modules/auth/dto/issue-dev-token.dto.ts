import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { AuthActorType } from '../interfaces/jwt-payload.interface';

export class IssueDevTokenDto {
  @ApiPropertyOptional({
    description: '开发令牌主体类型，默认 user',
    enum: AuthActorType,
    example: AuthActorType.User,
  })
  @IsOptional()
  @IsEnum(AuthActorType)
  actorType?: AuthActorType;

  @ApiPropertyOptional({
    description: '已存在用户 ID，传入后优先按用户 ID 签发 token',
    example: '1',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '开发环境 openid；未传时会自动生成',
    example: 'dev-openid-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  openid?: string;

  @ApiPropertyOptional({
    description: '用户昵称',
    example: '开发环境用户',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiPropertyOptional({
    description: '用户头像 URL',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @ApiPropertyOptional({
    description: '城市',
    example: '上海',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  city?: string;

  @ApiPropertyOptional({
    description: '诊所 ID，仅 actorType=clinic 时使用',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clinicId?: number;

  @ApiPropertyOptional({
    description: '诊所后台用户名，仅 actorType=clinic 时使用；未传则自动生成',
    example: 'clinic_admin_1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({
    description: '管理员展示名，仅 actorType=admin 时使用',
    example: '推荐审核员',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description:
      '开发态管理员密码；仅 actorType=admin 时用于创建或重置登录密码',
    example: 'Admin123456!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;
}
