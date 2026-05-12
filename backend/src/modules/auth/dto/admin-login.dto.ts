import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    description: '管理员用户名',
    example: 'review_admin',
  })
  @IsString()
  @MaxLength(100)
  username!: string;

  @ApiProperty({
    description: '管理员密码',
    example: 'Admin123456!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
