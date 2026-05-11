import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import { UserEntity } from '../../database/entities';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '用户不存在',
      });
    }

    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      city: user.city,
      createdAt: user.createdAt,
    };
  }
}
