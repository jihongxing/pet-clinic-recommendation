import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../../database/entities';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(UserEntity));
  });

  it('returns the current user profile', async () => {
    repository.findOne.mockResolvedValue({
      id: '1',
      openid: 'dev-openid-1',
      nickname: '测试用户',
      avatar: 'https://example.com/avatar.png',
      city: '上海',
      createdAt: new Date('2026-05-12T10:00:00.000Z'),
    } as UserEntity);

    await expect(service.getProfile('1')).resolves.toEqual({
      id: '1',
      nickname: '测试用户',
      avatar: 'https://example.com/avatar.png',
      city: '上海',
      createdAt: new Date('2026-05-12T10:00:00.000Z'),
    });
  });

  it('throws when the current user does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getProfile('404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
