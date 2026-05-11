import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

import { ContactType } from '../../../database/entities';

const CONTACT_TYPE_OPTIONS = [ContactType.Phone, ContactType.Wechat] as const;

export class CreateOrderDto {
  @ApiProperty({
    description: '诊所 ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  clinicId!: number;

  @ApiProperty({
    description: '联系方式类型',
    enum: CONTACT_TYPE_OPTIONS,
    example: ContactType.Phone,
  })
  @IsIn(CONTACT_TYPE_OPTIONS)
  contactType!: ContactType;
}
