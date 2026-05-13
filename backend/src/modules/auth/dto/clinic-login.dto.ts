import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ClinicLoginDto {
  @ApiProperty({
    description: '诊所后台用户名',
    example: 'clinic_admin_12',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username!: string;

  @ApiProperty({
    description: '诊所后台密码',
    example: 'Clinic@12888',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
