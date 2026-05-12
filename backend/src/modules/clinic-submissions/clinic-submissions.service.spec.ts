import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  AdminUserEntity,
  ClinicEntity,
  ClinicSubmissionReviewAction,
  ClinicSubmissionReviewLogEntity,
  ClinicSubmissionEntity,
  ClinicSubmissionStatus,
  ClinicSubmissionType,
  UserEntity,
} from '../../database/entities';
import { ClinicSubmissionsService } from './clinic-submissions.service';

describe('ClinicSubmissionsService', () => {
  let service: ClinicSubmissionsService;
  let clinicSubmissionRepository: jest.Mocked<
    Repository<ClinicSubmissionEntity>
  >;
  let clinicRepository: jest.Mocked<Repository<ClinicEntity>>;
  let clinicSubmissionReviewLogRepository: jest.Mocked<
    Repository<ClinicSubmissionReviewLogEntity>
  >;
  let adminUserRepository: jest.Mocked<Repository<AdminUserEntity>>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicSubmissionsService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(AdminUserEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClinicSubmissionEntity),
          useValue: {
            findAndCount: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClinicSubmissionReviewLogEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClinicEntity),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClinicSubmissionsService>(ClinicSubmissionsService);
    clinicSubmissionRepository = module.get(
      getRepositoryToken(ClinicSubmissionEntity),
    );
    clinicSubmissionReviewLogRepository = module.get(
      getRepositoryToken(ClinicSubmissionReviewLogEntity),
    );
    clinicRepository = module.get(getRepositoryToken(ClinicEntity));
    adminUserRepository = module.get(getRepositoryToken(AdminUserEntity));
    dataSource.query.mockReset();
    (dataSource as { transaction?: jest.Mock }).transaction = jest.fn(
      async (callback: (manager: {
        getRepository: (entity: unknown) => unknown;
      }) => unknown) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === ClinicSubmissionEntity) {
              return clinicSubmissionRepository;
            }

            if (entity === ClinicEntity) {
              return clinicRepository;
            }

            if (entity === ClinicSubmissionReviewLogEntity) {
              return clinicSubmissionReviewLogRepository;
            }

            throw new Error('Unexpected repository');
          },
        }),
    );
  });

  it('checks potential matches without location parameters when lat/lng are absent', async () => {
    dataSource.query.mockResolvedValue([]);

    const result = await service.getSubmissionMatches({
      name: '测试联调宠物诊所',
      address: '上海市浦东新区花木路 188 号',
      city: '上海',
      district: '浦东新区',
      phone: '13800138001',
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.not.stringContaining('ST_MakePoint($5::double precision, $4::double precision)'),
      [
        '%测试联调宠物诊所%',
        '%上海市浦东新区花木路 188 号%',
        '13800138001',
        '上海',
        '测试联调宠物诊所',
      ],
    );
    expect(result).toEqual({
      matches: [],
    });
  });

  it('returns admin review list with reviewer info and potential matches', async () => {
    clinicSubmissionRepository.findAndCount.mockResolvedValue([
      [
        {
          id: '1001',
          submissionType: ClinicSubmissionType.New,
          status: ClinicSubmissionStatus.PendingReview,
          clinicId: null,
          matchedClinicId: null,
          name: '爱宠动物医院',
          address: '北京市朝阳区望京路 1 号',
          city: '北京',
          district: '朝阳区',
          lat: 39.99,
          lng: 116.47,
          phone: '010-12345678',
          reason: '附近没有这家诊所',
          reviewNote: null,
          createdAt: new Date('2026-05-12T08:00:00.000Z'),
          reviewedAt: null,
          reviewedBy: null,
          submitterUser: {
            id: '21',
            nickname: '阿福家长',
            city: '北京',
          } as UserEntity,
          clinic: null,
          matchedClinic: null,
        } as ClinicSubmissionEntity,
        {
          id: '1002',
          submissionType: ClinicSubmissionType.Supplement,
          status: ClinicSubmissionStatus.NeedInfo,
          clinicId: 12,
          matchedClinicId: 12,
          name: '望京爱宠动物医院',
          address: '北京市朝阳区望京路 2 号',
          city: '北京',
          district: '朝阳区',
          lat: null,
          lng: null,
          phone: '010-99999999',
          reason: '补充营业时间',
          reviewNote: '请补充门头图',
          createdAt: new Date('2026-05-12T09:00:00.000Z'),
          reviewedAt: new Date('2026-05-12T10:00:00.000Z'),
          reviewedBy: '901',
          submitterUser: {
            id: '22',
            nickname: '豆包家长',
            city: '北京',
          } as UserEntity,
          clinic: {
            id: 12,
            name: '望京爱宠动物医院',
            address: '北京市朝阳区望京路 2 号',
          } as ClinicEntity,
          matchedClinic: {
            id: 12,
            name: '望京爱宠动物医院',
            address: '北京市朝阳区望京路 2 号',
          } as ClinicEntity,
        } as ClinicSubmissionEntity,
      ],
      2,
    ]);
    adminUserRepository.find.mockResolvedValue([
      {
        id: '901',
        username: 'review_admin',
        displayName: '推荐审核员',
      } as AdminUserEntity,
    ]);
    dataSource.query.mockResolvedValue([
      {
        id: 12,
        name: '爱宠动物医院望京店',
        address: '北京市朝阳区望京路 9 号',
        city: '北京',
        district: '朝阳区',
        phone: '010-12345678',
        businessHours: '09:00-21:00',
        distance: 120,
      },
    ]);

    const result = await service.getAdminSubmissions({
      city: '北京',
      page: 1,
      pageSize: 20,
    });

    expect(clinicSubmissionRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          city: '北京',
        },
      }),
    );
    expect(result.total).toBe(2);
    expect(result.list[0]).toMatchObject({
      id: 1001,
      submissionType: ClinicSubmissionType.New,
      submitter: {
        userId: 21,
        nickname: '阿福家长',
      },
    });
    expect(result.list[0].potentialMatches[0]).toMatchObject({
      clinicId: 12,
      matchScore: 100,
    });
    expect(result.list[1]).toMatchObject({
      id: 1002,
      reviewer: {
        adminUserId: 901,
        username: 'review_admin',
        displayName: '推荐审核员',
      },
      linkedClinic: {
        clinicId: 12,
      },
      matchedClinic: {
        clinicId: 12,
      },
    });
    expect(result.list[1].potentialMatches).toEqual([]);
  });

  it('throws when admin submission date filter is invalid', async () => {
    await expect(
      service.getAdminSubmissions({
        createdFrom: 'invalid-date',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toThrow('提交时间筛选格式不正确');
  });

  it('returns admin submission detail with potential matches and historical duplicates', async () => {
    clinicSubmissionRepository.findOne
      .mockResolvedValueOnce({
        id: '1001',
        submissionType: ClinicSubmissionType.New,
        status: ClinicSubmissionStatus.PendingReview,
        clinicId: null,
        matchedClinicId: null,
        name: '爱宠动物医院',
        address: '北京市朝阳区望京路 1 号',
        city: '北京',
        district: '朝阳区',
        lat: 39.99,
        lng: 116.47,
        phone: '010-12345678',
        businessHours: '09:00-21:00',
        photosJson: ['https://example.com/1.jpg'],
        reason: '附近没有这家诊所',
        reviewNote: '待人工核对',
        createdAt: new Date('2026-05-12T08:00:00.000Z'),
        updatedAt: new Date('2026-05-12T09:00:00.000Z'),
        reviewedAt: new Date('2026-05-12T10:00:00.000Z'),
        reviewedBy: '901',
        submitterUser: {
          id: '21',
          nickname: '阿福家长',
          city: '北京',
          createdAt: new Date('2026-05-10T08:00:00.000Z'),
        } as UserEntity,
        clinic: null,
        matchedClinic: null,
      } as ClinicSubmissionEntity)
      .mockResolvedValueOnce(null);
    adminUserRepository.findOne.mockResolvedValue({
      id: '901',
      username: 'review_admin',
      displayName: '推荐审核员',
    } as AdminUserEntity);
    clinicSubmissionRepository.find.mockResolvedValue([
      {
        id: '1002',
        submissionType: ClinicSubmissionType.New,
        status: ClinicSubmissionStatus.PendingReview,
        clinicId: null,
        matchedClinicId: null,
        name: '爱宠动物医院',
        address: '北京市朝阳区望京路 1 号',
        city: '北京',
        district: '朝阳区',
        phone: '010-12345678',
        reason: '我也推荐这家',
        createdAt: new Date('2026-05-11T08:00:00.000Z'),
        submitterUser: {
          id: '22',
          nickname: '豆包家长',
        } as UserEntity,
      } as ClinicSubmissionEntity,
    ]);
    dataSource.query.mockResolvedValue([
      {
        id: 12,
        name: '爱宠动物医院望京店',
        address: '北京市朝阳区望京路 9 号',
        city: '北京',
        district: '朝阳区',
        phone: '010-12345678',
        businessHours: '09:00-21:00',
        distance: 120,
      },
    ]);

    const result = await service.getAdminSubmissionDetail(1001);

    expect(result).toMatchObject({
      id: 1001,
      submissionType: ClinicSubmissionType.New,
      reviewNote: '待人工核对',
      submitter: {
        userId: 21,
        nickname: '阿福家长',
      },
      reviewer: {
        adminUserId: 901,
        username: 'review_admin',
        displayName: '推荐审核员',
      },
    });
    expect(result.photos).toEqual(['https://example.com/1.jpg']);
    expect(result.potentialMatches[0]).toMatchObject({
      clinicId: 12,
      matchScore: 100,
    });
    expect(result.historicalDuplicates[0]).toMatchObject({
      id: 1002,
      submitter: {
        userId: 22,
        nickname: '豆包家长',
      },
    });
    expect(result.historicalDuplicates[0].duplicateReasons).toEqual(
      expect.arrayContaining(['诊所名称一致', '联系电话一致', '提交地址一致']),
    );
  });

  it('throws when admin submission detail does not exist', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue(null);

    await expect(service.getAdminSubmissionDetail(9999)).rejects.toThrow(
      '推荐单不存在',
    );
  });

  it('returns admin submission review logs with reviewer info', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue({
      id: '1001',
    } as ClinicSubmissionEntity);
    clinicSubmissionReviewLogRepository.find = jest.fn().mockResolvedValue([
      {
        id: '502',
        submissionId: '1001',
        reviewerId: '902',
        action: ClinicSubmissionReviewAction.NeedInfo,
        beforeStatus: ClinicSubmissionStatus.PendingReview,
        afterStatus: ClinicSubmissionStatus.NeedInfo,
        note: '请补充门头照片',
        createdAt: new Date('2026-05-12T11:00:00.000Z'),
      } as ClinicSubmissionReviewLogEntity,
      {
        id: '501',
        submissionId: '1001',
        reviewerId: '901',
        action: ClinicSubmissionReviewAction.ApprovedNew,
        beforeStatus: ClinicSubmissionStatus.PendingReview,
        afterStatus: ClinicSubmissionStatus.ApprovedNew,
        note: '资料完整',
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
      } as ClinicSubmissionReviewLogEntity,
    ]);
    adminUserRepository.find.mockResolvedValue([
      {
        id: '901',
        username: 'review_admin',
        displayName: '推荐审核员',
      } as AdminUserEntity,
      {
        id: '902',
        username: 'senior_admin',
        displayName: '资深审核员',
      } as AdminUserEntity,
    ]);

    const result = await service.getAdminSubmissionReviewLogs(1001);

    expect(clinicSubmissionReviewLogRepository.find).toHaveBeenCalledWith({
      where: {
        submissionId: '1001',
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });
    expect(result).toMatchObject({
      submissionId: 1001,
      list: [
        {
          id: 502,
          action: ClinicSubmissionReviewAction.NeedInfo,
          note: '请补充门头照片',
          reviewer: {
            adminUserId: 902,
            username: 'senior_admin',
            displayName: '资深审核员',
          },
        },
        {
          id: 501,
          action: ClinicSubmissionReviewAction.ApprovedNew,
          note: '资料完整',
          reviewer: {
            adminUserId: 901,
            username: 'review_admin',
            displayName: '推荐审核员',
          },
        },
      ],
    });
  });

  it('throws when admin submission review logs target does not exist', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue(null);

    await expect(service.getAdminSubmissionReviewLogs(9999)).rejects.toThrow(
      '推荐单不存在',
    );
  });

  it('reviews a submission as approved_new and creates clinic plus review log', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue({
      id: '1001',
      submissionType: ClinicSubmissionType.New,
      status: ClinicSubmissionStatus.PendingReview,
      clinicId: null,
      matchedClinicId: null,
      name: '爱宠动物医院',
      address: '北京市朝阳区望京路 1 号',
      city: '北京',
      district: '朝阳区',
      lat: 39.99,
      lng: 116.47,
      phone: '010-12345678',
      businessHours: '09:00-21:00',
      reason: '附近没有这家诊所',
    } as ClinicSubmissionEntity);
    clinicRepository.create.mockImplementation(
      (payload) => payload as unknown as ClinicEntity,
    );
    clinicRepository.save.mockResolvedValue({
      id: 88,
    } as ClinicEntity);
    clinicSubmissionRepository.save.mockImplementation(
      async (entity) => entity as ClinicSubmissionEntity,
    );
    clinicSubmissionReviewLogRepository.create.mockImplementation(
      (payload) => payload as ClinicSubmissionReviewLogEntity,
    );
    clinicSubmissionReviewLogRepository.save.mockResolvedValue({
      id: '501',
    } as ClinicSubmissionReviewLogEntity);

    const result = await service.reviewSubmission('901', 1001, {
      action: ClinicSubmissionReviewAction.ApprovedNew,
      note: '资料完整，创建新诊所',
    });

    expect(clinicRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '爱宠动物医院',
        city: '北京',
        location: {
          type: 'Point',
          coordinates: [116.47, 39.99],
        },
      }),
    );
    expect(clinicSubmissionReviewLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewerId: '901',
        action: ClinicSubmissionReviewAction.ApprovedNew,
        beforeStatus: ClinicSubmissionStatus.PendingReview,
        afterStatus: ClinicSubmissionStatus.ApprovedNew,
      }),
    );
    expect(result).toMatchObject({
      id: 1001,
      status: ClinicSubmissionStatus.ApprovedNew,
      clinicId: 88,
      matchedClinicId: null,
      reviewLogId: 501,
      reviewNote: '资料完整，创建新诊所',
    });
  });

  it('reviews a submission as merged and writes target clinic plus log', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue({
      id: '1003',
      submissionType: ClinicSubmissionType.New,
      status: ClinicSubmissionStatus.PendingReview,
      clinicId: null,
      matchedClinicId: null,
      name: '爱宠动物医院',
      address: '北京市朝阳区望京路 1 号',
      city: '北京',
      district: '朝阳区',
      lat: 39.99,
      lng: 116.47,
      phone: '010-12345678',
      businessHours: '09:00-21:00',
      reason: '和已有诊所重复',
    } as ClinicSubmissionEntity);
    clinicRepository.findOne.mockResolvedValue({
      id: 12,
      status: 1,
    } as ClinicEntity);
    clinicSubmissionRepository.save.mockImplementation(
      async (entity) => entity as ClinicSubmissionEntity,
    );
    clinicSubmissionReviewLogRepository.create.mockImplementation(
      (payload) => payload as ClinicSubmissionReviewLogEntity,
    );
    clinicSubmissionReviewLogRepository.save.mockResolvedValue({
      id: '502',
    } as ClinicSubmissionReviewLogEntity);

    const result = await service.reviewSubmission('901', 1003, {
      action: ClinicSubmissionReviewAction.Merged,
      matchedClinicId: 12,
      note: '已合并到已有诊所',
    });

    expect(clinicRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 12,
        status: 1,
      },
    });
    expect(result).toMatchObject({
      id: 1003,
      status: ClinicSubmissionStatus.Merged,
      matchedClinicId: 12,
      reviewLogId: 502,
    });
  });

  it('rejects review when submission is already in terminal status', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue({
      id: '1004',
      status: ClinicSubmissionStatus.Rejected,
    } as ClinicSubmissionEntity);

    await expect(
      service.reviewSubmission('901', 1004, {
        action: ClinicSubmissionReviewAction.NeedInfo,
        note: '补充资料',
      }),
    ).rejects.toThrow('当前推荐单状态不允许继续审核');
  });

  it('creates a pending submission with normalized fields', async () => {
    clinicSubmissionRepository.create.mockImplementation(
      (payload) => payload as ClinicSubmissionEntity,
    );
    clinicSubmissionRepository.save.mockResolvedValue({
      id: '1005',
      status: ClinicSubmissionStatus.PendingReview,
    } as ClinicSubmissionEntity);

    const result = await service.createSubmission('21', {
      submissionType: ClinicSubmissionType.New,
      name: '  爱宠动物医院  ',
      address: '  北京市朝阳区望京路 1 号  ',
      city: '  北京  ',
      district: '  朝阳区  ',
      lat: 39.99,
      lng: 116.47,
      phone: ' 010-12345678 ',
      businessHours: ' 09:00-21:00 ',
      photos: [' https://example.com/1.jpg ', '   ', 'https://example.com/2.jpg'],
      reason: '  附近没有这家诊所  ',
    });

    expect(clinicSubmissionRepository.create).toHaveBeenCalledWith({
      submitterUserId: '21',
      submissionType: ClinicSubmissionType.New,
      clinicId: null,
      name: '爱宠动物医院',
      address: '北京市朝阳区望京路 1 号',
      city: '北京',
      district: '朝阳区',
      lat: 39.99,
      lng: 116.47,
      phone: '010-12345678',
      businessHours: '09:00-21:00',
      photosJson: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
      reason: '附近没有这家诊所',
      status: ClinicSubmissionStatus.PendingReview,
      matchedClinicId: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });
    expect(result).toEqual({
      id: 1005,
      status: ClinicSubmissionStatus.PendingReview,
      matchedClinics: [],
    });
  });

  it('returns current user submissions with status filter', async () => {
    clinicSubmissionRepository.findAndCount.mockResolvedValue([
      [
        {
          id: '1006',
          submissionType: ClinicSubmissionType.Correction,
          status: ClinicSubmissionStatus.NeedInfo,
          clinicId: 12,
          matchedClinicId: null,
          name: '望京爱宠动物医院',
          address: '北京市朝阳区望京路 2 号',
          city: '北京',
          district: '朝阳区',
          phone: '010-66666666',
          reason: '补充最新地址',
          reviewNote: '请补充门头照片',
          createdAt: new Date('2026-05-12T08:00:00.000Z'),
        } as ClinicSubmissionEntity,
      ],
      1,
    ]);

    const result = await service.getMySubmissions('21', {
      status: ClinicSubmissionStatus.NeedInfo,
      page: 1,
      pageSize: 10,
    });

    expect(clinicSubmissionRepository.findAndCount).toHaveBeenCalledWith({
      where: {
        submitterUserId: '21',
        status: ClinicSubmissionStatus.NeedInfo,
      },
      select: {
        id: true,
        submissionType: true,
        status: true,
        clinicId: true,
        matchedClinicId: true,
        name: true,
        address: true,
        city: true,
        district: true,
        phone: true,
        reason: true,
        reviewNote: true,
        createdAt: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: 0,
      take: 10,
    });
    expect(result).toEqual({
      list: [
        {
          id: 1006,
          submissionType: ClinicSubmissionType.Correction,
          status: ClinicSubmissionStatus.NeedInfo,
          clinicId: 12,
          matchedClinicId: null,
          name: '望京爱宠动物医院',
          address: '北京市朝阳区望京路 2 号',
          city: '北京',
          district: '朝阳区',
          phone: '010-66666666',
          reason: '补充最新地址',
          reviewNote: '请补充门头照片',
          createdAt: new Date('2026-05-12T08:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('reviews a submission as need_info and only updates review state plus log', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue({
      id: '1007',
      submissionType: ClinicSubmissionType.Supplement,
      status: ClinicSubmissionStatus.PendingReview,
      clinicId: 12,
      matchedClinicId: null,
      name: '望京爱宠动物医院',
      address: '北京市朝阳区望京路 2 号',
      city: '北京',
      district: '朝阳区',
      phone: '010-66666666',
      reason: '补充信息',
    } as ClinicSubmissionEntity);
    clinicSubmissionRepository.save.mockImplementation(
      async (entity) => entity as ClinicSubmissionEntity,
    );
    clinicSubmissionReviewLogRepository.create.mockImplementation(
      (payload) => payload as ClinicSubmissionReviewLogEntity,
    );
    clinicSubmissionReviewLogRepository.save.mockResolvedValue({
      id: '503',
    } as ClinicSubmissionReviewLogEntity);

    const result = await service.reviewSubmission('901', 1007, {
      action: ClinicSubmissionReviewAction.NeedInfo,
      note: '请补充门头照片和联系电话',
    });

    expect(clinicRepository.create).not.toHaveBeenCalled();
    expect(clinicRepository.save).not.toHaveBeenCalled();
    expect(clinicSubmissionReviewLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: '1007',
        reviewerId: '901',
        action: ClinicSubmissionReviewAction.NeedInfo,
        beforeStatus: ClinicSubmissionStatus.PendingReview,
        afterStatus: ClinicSubmissionStatus.NeedInfo,
        note: '请补充门头照片和联系电话',
      }),
    );
    expect(result).toMatchObject({
      id: 1007,
      status: ClinicSubmissionStatus.NeedInfo,
      clinicId: 12,
      matchedClinicId: null,
      reviewLogId: 503,
      reviewNote: '请补充门头照片和联系电话',
    });
  });

  it('rejects merged review when target clinic does not exist', async () => {
    clinicSubmissionRepository.findOne.mockResolvedValue({
      id: '1008',
      submissionType: ClinicSubmissionType.New,
      status: ClinicSubmissionStatus.PendingReview,
      clinicId: null,
      matchedClinicId: null,
      name: '爱宠动物医院',
      address: '北京市朝阳区望京路 1 号',
      city: '北京',
      district: '朝阳区',
      lat: 39.99,
      lng: 116.47,
      phone: '010-12345678',
      reason: '疑似重复',
    } as ClinicSubmissionEntity);
    clinicRepository.findOne.mockResolvedValue(null);

    await expect(
      service.reviewSubmission('901', 1008, {
        action: ClinicSubmissionReviewAction.Merged,
        matchedClinicId: 999,
        note: '尝试合并',
      }),
    ).rejects.toThrow('目标诊所不存在');
  });
});
