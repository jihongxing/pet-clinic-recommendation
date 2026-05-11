import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class WechatLoginDto {
  @ApiProperty({
    description: '微信登录 code；开发环境可使用 dev:<openid> 进行本地验收',
    example: '021xYt0w3abcde1FGh0w3xyzAbc1Yt0Q',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  code!: string;
}
