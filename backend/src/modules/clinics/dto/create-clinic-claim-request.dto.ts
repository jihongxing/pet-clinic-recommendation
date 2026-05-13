import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClinicClaimRequestDto {
  @ApiProperty({
    description: '认领联系人姓名',
    example: '张三',
  })
  @IsString()
  @MaxLength(100)
  applicantName!: string;

  @ApiProperty({
    description: '认领联系人手机号',
    example: '13800000000',
  })
  @IsPhoneNumber('CN')
  applicantPhone!: string;

  @ApiPropertyOptional({
    description: '营业执照、门头照片或其他证明材料说明',
    example: '营业执照编号 ABC-123，门头照片已上传网盘',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  proofMaterial?: string;
}
