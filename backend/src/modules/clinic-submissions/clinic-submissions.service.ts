import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { InjectRepository } from '@nestjs/typeorm';
import { extname, join } from 'path';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import {
  AdminUserEntity,
  ClinicEntity,
  ClinicSubmissionReviewAction,
  ClinicSubmissionReviewLogEntity,
  ClinicSubmissionEntity,
  ClinicSubmissionStatus,
  ClinicSubmissionType,
} from '../../database/entities';
import { CreateClinicSubmissionDto } from './dto/create-clinic-submission.dto';
import { GetAdminClinicSubmissionsQueryDto } from './dto/get-admin-clinic-submissions-query.dto';
import { GetClinicSubmissionMatchesQueryDto } from './dto/get-clinic-submission-matches-query.dto';
import { GetMyClinicSubmissionsQueryDto } from './dto/get-my-clinic-submissions-query.dto';
import { ReviewClinicSubmissionDto } from './dto/review-clinic-submission.dto';

export interface CreateClinicSubmissionResult {
  id: number;
  status: ClinicSubmissionStatus;
  matchedClinics: Array<{
    clinicId: number;
    name: string;
    address: string;
  }>;
}

export interface GetClinicSubmissionMatchesResult {
  matches: Array<{
    clinicId: number;
    name: string;
    address: string;
    city: string;
    district: string | null;
    phone: string | null;
    businessHours: string | null;
    distance: number | null;
    matchScore: number;
    matchReasons: string[];
  }>;
}

export interface UploadClinicSubmissionPhotoResult {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface GetMyClinicSubmissionsResult {
  list: Array<{
    id: number;
    submissionType: string;
    status: ClinicSubmissionStatus;
    clinicId: number | null;
    matchedClinicId: number | null;
    name: string;
    address: string | null;
    city: string | null;
    district: string | null;
    phone: string | null;
    reason: string;
    reviewNote: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminClinicSubmissionListItem {
  id: number;
  submissionType: string;
  status: ClinicSubmissionStatus;
  clinicId: number | null;
  matchedClinicId: number | null;
  name: string;
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  reason: string;
  reviewNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  submitter: {
    userId: number;
    nickname: string | null;
    city: string | null;
  };
  reviewer: {
    adminUserId: number;
    username: string;
    displayName: string | null;
  } | null;
  linkedClinic: {
    clinicId: number;
    name: string;
    address: string;
  } | null;
  matchedClinic: {
    clinicId: number;
    name: string;
    address: string;
  } | null;
  potentialMatches: Array<{
    clinicId: number;
    name: string;
    address: string;
    distance: number | null;
    matchScore: number;
    matchReasons: string[];
  }>;
}

export interface GetAdminClinicSubmissionsResult {
  list: AdminClinicSubmissionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminClinicSubmissionDetailResult {
  id: number;
  submissionType: string;
  status: ClinicSubmissionStatus;
  clinicId: number | null;
  matchedClinicId: number | null;
  name: string;
  address: string | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  businessHours: string | null;
  photos: string[];
  reason: string;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  submitter: {
    userId: number;
    nickname: string | null;
    city: string | null;
    createdAt: Date;
  };
  reviewer: {
    adminUserId: number;
    username: string;
    displayName: string | null;
  } | null;
  linkedClinic: {
    clinicId: number;
    name: string;
    address: string;
    city: string;
    district: string | null;
    phone: string | null;
    businessHours: string | null;
  } | null;
  matchedClinic: {
    clinicId: number;
    name: string;
    address: string;
    city: string;
    district: string | null;
    phone: string | null;
    businessHours: string | null;
  } | null;
  potentialMatches: GetClinicSubmissionMatchesResult['matches'];
  historicalDuplicates: Array<{
    id: number;
    submissionType: string;
    status: ClinicSubmissionStatus;
    clinicId: number | null;
    matchedClinicId: number | null;
    name: string;
    address: string | null;
    city: string | null;
    district: string | null;
    phone: string | null;
    reason: string;
    createdAt: Date;
    submitter: {
      userId: number;
      nickname: string | null;
    };
    duplicateReasons: string[];
  }>;
}

export interface ReviewClinicSubmissionResult {
  id: number;
  status: ClinicSubmissionStatus;
  clinicId: number | null;
  matchedClinicId: number | null;
  reviewedAt: Date;
  reviewNote: string | null;
  reviewLogId: number;
}

export interface GetAdminClinicSubmissionReviewLogsResult {
  submissionId: number;
  list: Array<{
    id: number;
    action: ClinicSubmissionReviewAction;
    beforeStatus: ClinicSubmissionStatus;
    afterStatus: ClinicSubmissionStatus;
    note: string | null;
    createdAt: Date;
    reviewer: {
      adminUserId: number;
      username: string;
      displayName: string | null;
    } | null;
  }>;
}

interface ClinicSubmissionMatchInput {
  name: string;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
}

const CLINIC_SUBMISSION_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'clinic-submissions',
);
const CLINIC_SUBMISSION_UPLOAD_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class ClinicSubmissionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(ClinicSubmissionEntity)
    private readonly clinicSubmissionRepository: Repository<ClinicSubmissionEntity>,
    @InjectRepository(ClinicSubmissionReviewLogEntity)
    private readonly clinicSubmissionReviewLogRepository: Repository<ClinicSubmissionReviewLogEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicRepository: Repository<ClinicEntity>,
  ) {}

  async getSubmissionMatches(
    query: GetClinicSubmissionMatchesQueryDto,
  ): Promise<GetClinicSubmissionMatchesResult> {
    const matches = await this.findPotentialClinicMatches(
      {
        name: query.name,
        address: query.address,
        city: query.city,
        district: query.district,
        phone: query.phone,
        lat: query.lat,
        lng: query.lng,
      },
      5,
    );

    return {
      matches,
    };
  }

  async storeSubmissionPhoto(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    request: {
      protocol?: string;
      get?: (name: string) => string | undefined;
      headers?: Record<string, string | string[] | undefined>;
    },
  ): Promise<UploadClinicSubmissionPhotoResult> {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '上传图片不能为空',
      });
    }

    const extension =
      CLINIC_SUBMISSION_UPLOAD_EXTENSIONS[file.mimetype] ||
      extname(file.originalname).toLowerCase();

    if (!extension) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '无法识别图片格式',
      });
    }

    await mkdir(CLINIC_SUBMISSION_UPLOAD_DIR, {
      recursive: true,
    });

    const storedFileName = this.buildSubmissionPhotoFileName(extension);
    const storedFilePath = join(CLINIC_SUBMISSION_UPLOAD_DIR, storedFileName);

    await writeFile(storedFilePath, file.buffer);

    return {
      fileUrl: this.buildSubmissionPhotoUrl(storedFileName, request),
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async getAdminSubmissions(
    query: GetAdminClinicSubmissionsQueryDto,
  ): Promise<GetAdminClinicSubmissionsResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: FindOptionsWhere<ClinicSubmissionEntity> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.city?.trim()) {
      where.city = query.city.trim();
    }

    const createdFrom = query.createdFrom
      ? this.normalizeDateFilter(query.createdFrom, 'start')
      : null;
    const createdTo = query.createdTo
      ? this.normalizeDateFilter(query.createdTo, 'end')
      : null;

    if (createdFrom && createdTo) {
      where.createdAt = Between(createdFrom, createdTo);
    } else if (createdFrom) {
      where.createdAt = MoreThanOrEqual(createdFrom);
    } else if (createdTo) {
      where.createdAt = LessThanOrEqual(createdTo);
    }

    const [submissions, total] =
      await this.clinicSubmissionRepository.findAndCount({
        where,
        relations: {
          submitterUser: true,
          clinic: true,
          matchedClinic: true,
        },
        order: {
          createdAt: 'DESC',
          id: 'DESC',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

    const reviewerIds = Array.from(
      new Set(
        submissions
          .map((submission) => submission.reviewedBy)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const reviewers = reviewerIds.length
      ? await this.adminUserRepository.find({
          where: {
            id: In(reviewerIds),
          },
        })
      : [];
    const reviewerMap = new Map(
      reviewers.map((reviewer) => [reviewer.id, reviewer]),
    );

    const potentialMatchesList = await Promise.all(
      submissions.map(async (submission) => {
        if (
          submission.submissionType !== ClinicSubmissionType.New ||
          submission.clinicId
        ) {
          return [];
        }

        return this.findPotentialClinicMatches(
          {
            name: submission.name,
            address: submission.address,
            city: submission.city,
            district: submission.district,
            phone: submission.phone,
            lat: submission.lat,
            lng: submission.lng,
          },
          3,
        );
      }),
    );

    return {
      list: submissions.map((submission, index) => {
        const reviewer = submission.reviewedBy
          ? reviewerMap.get(submission.reviewedBy) ?? null
          : null;

        return {
          id: Number(submission.id),
          submissionType: submission.submissionType,
          status: submission.status,
          clinicId: submission.clinicId,
          matchedClinicId: submission.matchedClinicId,
          name: submission.name,
          address: submission.address,
          city: submission.city,
          district: submission.district,
          phone: submission.phone,
          reason: submission.reason,
          reviewNote: submission.reviewNote,
          createdAt: submission.createdAt,
          reviewedAt: submission.reviewedAt,
          submitter: {
            userId: Number(submission.submitterUser.id),
            nickname: submission.submitterUser.nickname,
            city: submission.submitterUser.city,
          },
          reviewer: reviewer
            ? {
                adminUserId: Number(reviewer.id),
                username: reviewer.username,
                displayName: reviewer.displayName,
              }
            : null,
          linkedClinic: submission.clinic
            ? {
                clinicId: submission.clinic.id,
                name: submission.clinic.name,
                address: submission.clinic.address,
              }
            : null,
          matchedClinic: submission.matchedClinic
            ? {
                clinicId: submission.matchedClinic.id,
                name: submission.matchedClinic.name,
                address: submission.matchedClinic.address,
              }
            : null,
          potentialMatches: potentialMatchesList[index].map((match) => ({
            clinicId: match.clinicId,
            name: match.name,
            address: match.address,
            distance: match.distance,
            matchScore: match.matchScore,
            matchReasons: match.matchReasons,
          })),
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async getAdminSubmissionDetail(
    id: number,
  ): Promise<AdminClinicSubmissionDetailResult> {
    const submission = await this.clinicSubmissionRepository.findOne({
      where: {
        id: String(id),
      },
      relations: {
        submitterUser: true,
        clinic: true,
        matchedClinic: true,
      },
    });

    if (!submission) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '推荐单不存在',
      });
    }

    const [reviewer, potentialMatches, historicalDuplicates] =
      await Promise.all([
        submission.reviewedBy
          ? this.adminUserRepository.findOne({
              where: {
                id: submission.reviewedBy,
              },
            })
          : Promise.resolve(null),
        this.findPotentialClinicMatches(
          {
            name: submission.name,
            address: submission.address,
            city: submission.city,
            district: submission.district,
            phone: submission.phone,
            lat: submission.lat,
            lng: submission.lng,
          },
          5,
        ),
        this.findHistoricalDuplicates(submission),
      ]);

    return {
      id: Number(submission.id),
      submissionType: submission.submissionType,
      status: submission.status,
      clinicId: submission.clinicId,
      matchedClinicId: submission.matchedClinicId,
      name: submission.name,
      address: submission.address,
      city: submission.city,
      district: submission.district,
      lat: submission.lat,
      lng: submission.lng,
      phone: submission.phone,
      businessHours: submission.businessHours,
      photos: Array.isArray(submission.photosJson) ? submission.photosJson : [],
      reason: submission.reason,
      reviewNote: submission.reviewNote,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      reviewedAt: submission.reviewedAt,
      submitter: {
        userId: Number(submission.submitterUser.id),
        nickname: submission.submitterUser.nickname,
        city: submission.submitterUser.city,
        createdAt: submission.submitterUser.createdAt,
      },
      reviewer: reviewer
        ? {
            adminUserId: Number(reviewer.id),
            username: reviewer.username,
            displayName: reviewer.displayName,
          }
        : null,
      linkedClinic: submission.clinic
        ? {
            clinicId: submission.clinic.id,
            name: submission.clinic.name,
            address: submission.clinic.address,
            city: submission.clinic.city,
            district: submission.clinic.district,
            phone: submission.clinic.phone,
            businessHours: submission.clinic.businessHours,
          }
        : null,
      matchedClinic: submission.matchedClinic
        ? {
            clinicId: submission.matchedClinic.id,
            name: submission.matchedClinic.name,
            address: submission.matchedClinic.address,
            city: submission.matchedClinic.city,
            district: submission.matchedClinic.district,
            phone: submission.matchedClinic.phone,
            businessHours: submission.matchedClinic.businessHours,
          }
        : null,
      potentialMatches,
      historicalDuplicates,
    };
  }

  async getAdminSubmissionReviewLogs(
    id: number,
  ): Promise<GetAdminClinicSubmissionReviewLogsResult> {
    const submission = await this.clinicSubmissionRepository.findOne({
      where: {
        id: String(id),
      },
    });

    if (!submission) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '推荐单不存在',
      });
    }

    const reviewLogs = await this.clinicSubmissionReviewLogRepository.find({
      where: {
        submissionId: submission.id,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    const reviewerIds = Array.from(
      new Set(
        reviewLogs
          .map((reviewLog) => reviewLog.reviewerId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const reviewers = reviewerIds.length
      ? await this.adminUserRepository.find({
          where: {
            id: In(reviewerIds),
          },
        })
      : [];
    const reviewerMap = new Map(
      reviewers.map((reviewer) => [reviewer.id, reviewer]),
    );

    return {
      submissionId: Number(submission.id),
      list: reviewLogs.map((reviewLog) => {
        const reviewer = reviewerMap.get(reviewLog.reviewerId) ?? null;

        return {
          id: Number(reviewLog.id),
          action: reviewLog.action,
          beforeStatus: reviewLog.beforeStatus,
          afterStatus: reviewLog.afterStatus,
          note: reviewLog.note,
          createdAt: reviewLog.createdAt,
          reviewer: reviewer
            ? {
                adminUserId: Number(reviewer.id),
                username: reviewer.username,
                displayName: reviewer.displayName,
              }
            : null,
        };
      }),
    };
  }

  async reviewSubmission(
    adminUserId: string,
    id: number,
    payload: ReviewClinicSubmissionDto,
  ): Promise<ReviewClinicSubmissionResult> {
    return this.dataSource.transaction(async (manager) => {
      const submissionRepository = manager.getRepository(ClinicSubmissionEntity);
      const clinicRepository = manager.getRepository(ClinicEntity);
      const reviewLogRepository = manager.getRepository(
        ClinicSubmissionReviewLogEntity,
      );

      const submission = await submissionRepository.findOne({
        where: {
          id: String(id),
        },
      });

      if (!submission) {
        throw new NotFoundException({
          code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
          message: '推荐单不存在',
        });
      }

      this.ensureSubmissionReviewable(submission.status);

      const previousStatus = submission.status;
      const reviewNote = this.toNullableString(payload.note);
      const reviewedAt = new Date();
      let clinicId = submission.clinicId;
      let matchedClinicId = submission.matchedClinicId;
      let nextStatus = previousStatus;

      if (payload.action === ClinicSubmissionReviewAction.ApprovedNew) {
        const createdClinic = await this.createClinicFromSubmission(
          clinicRepository,
          submission,
        );
        clinicId = createdClinic.id;
        matchedClinicId = null;
        nextStatus = ClinicSubmissionStatus.ApprovedNew;
      } else if (payload.action === ClinicSubmissionReviewAction.Merged) {
        const targetClinic = await clinicRepository.findOne({
          where: {
            id: payload.matchedClinicId!,
            status: 1,
          },
        });

        if (!targetClinic) {
          throw new NotFoundException({
            code: RESPONSE_CODE.CLINIC_NOT_FOUND,
            message: '目标诊所不存在',
          });
        }

        matchedClinicId = targetClinic.id;
        nextStatus = ClinicSubmissionStatus.Merged;
      } else if (payload.action === ClinicSubmissionReviewAction.NeedInfo) {
        nextStatus = ClinicSubmissionStatus.NeedInfo;
      } else if (payload.action === ClinicSubmissionReviewAction.Rejected) {
        nextStatus = ClinicSubmissionStatus.Rejected;
      }

      submission.status = nextStatus;
      submission.clinicId = clinicId;
      submission.matchedClinicId = matchedClinicId;
      submission.reviewedBy = adminUserId;
      submission.reviewedAt = reviewedAt;
      submission.reviewNote = reviewNote;

      const savedSubmission = await submissionRepository.save(submission);
      const reviewLog = reviewLogRepository.create({
        submissionId: submission.id,
        reviewerId: adminUserId,
        action: payload.action,
        beforeStatus: previousStatus,
        afterStatus: nextStatus,
        note: reviewNote,
      });
      const savedReviewLog = await reviewLogRepository.save(reviewLog);

      return {
        id: Number(savedSubmission.id),
        status: savedSubmission.status,
        clinicId: savedSubmission.clinicId,
        matchedClinicId: savedSubmission.matchedClinicId,
        reviewedAt,
        reviewNote: savedSubmission.reviewNote,
        reviewLogId: Number(savedReviewLog.id),
      };
    });
  }

  private async findPotentialClinicMatches(
    payload: ClinicSubmissionMatchInput,
    limit: number,
  ): Promise<GetClinicSubmissionMatchesResult['matches']> {
    const normalizedName = payload.name.trim();

    if (!normalizedName) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '诊所名称不能为空',
      });
    }

    const normalizedAddress = payload.address?.trim() ?? '';
    const normalizedPhone = payload.phone?.trim() ?? '';
    const normalizedCity = payload.city?.trim() ?? '';
    const normalizedDistrict = payload.district?.trim() ?? '';
    const hasLocation =
      typeof payload.lat === 'number' && typeof payload.lng === 'number';
    const cityParamIndex = hasLocation ? 6 : 4;
    const exactNameParamIndex = hasLocation ? 7 : 5;
    const distanceSelectExpression = hasLocation
      ? `
          ROUND(
            CAST(
              ST_Distance(
                c.location,
                ST_SetSRID(
                  ST_MakePoint($5::double precision, $4::double precision),
                  4326
                )::geography
              ) AS numeric
            ),
            0
          )
        `
      : 'NULL';
    const rows = await this.dataSource.query<
      Array<{
        id: number | string;
        name: string;
        address: string;
        city: string;
        district: string | null;
        phone: string | null;
        businessHours: string | null;
        distance: number | string | null;
      }>
    >(
      `
        SELECT
          c.id,
          c.name,
          c.address,
          c.city,
          c.district,
          c.phone,
          c.business_hours AS "businessHours",
          ${distanceSelectExpression} AS distance
        FROM clinic AS c
        WHERE c.status = 1
          AND (
            c.name ILIKE $1
            OR ($2 <> '' AND c.address ILIKE $2)
            OR ($3 <> '' AND c.phone = $3)
          )
          AND ($${cityParamIndex} = '' OR c.city = $${cityParamIndex})
        ORDER BY
          CASE
            WHEN c.name = $${exactNameParamIndex} THEN 0
            WHEN c.name ILIKE $1 THEN 1
            WHEN $3 <> '' AND c.phone = $3 THEN 2
            ELSE 3
          END ASC,
          distance ASC NULLS LAST,
          c.id ASC
        LIMIT 8;
      `,
      hasLocation
        ? [
        `%${normalizedName}%`,
        normalizedAddress ? `%${normalizedAddress}%` : '',
        normalizedPhone,
        payload.lat!,
        payload.lng!,
        normalizedCity,
        normalizedName,
      ]
        : [
            `%${normalizedName}%`,
            normalizedAddress ? `%${normalizedAddress}%` : '',
            normalizedPhone,
            normalizedCity,
            normalizedName,
          ],
    );

    const matches = rows
      .map((row) => {
        const reasons: string[] = [];
        let score = 0;
        const clinicName = row.name.trim();
        const clinicAddress = row.address.trim();
        const clinicPhone = row.phone?.trim() ?? '';
        const distance =
          row.distance === null || row.distance === undefined
            ? null
            : Number(row.distance);

        if (clinicName === normalizedName) {
          reasons.push('名称完全一致');
          score += 60;
        } else if (clinicName.includes(normalizedName) || normalizedName.includes(clinicName)) {
          reasons.push('名称高度相似');
          score += 40;
        } else {
          reasons.push('名称模糊匹配');
          score += 20;
        }

        if (normalizedPhone && clinicPhone && clinicPhone === normalizedPhone) {
          reasons.push('联系电话一致');
          score += 30;
        }

        if (normalizedAddress && clinicAddress.includes(normalizedAddress)) {
          reasons.push('地址高度相似');
          score += 25;
        }

        if (
          normalizedDistrict &&
          row.district &&
          row.district.trim() === normalizedDistrict
        ) {
          reasons.push('区域一致');
          score += 10;
        }

        if (distance !== null) {
          if (distance <= 300) {
            reasons.push('距离非常近');
            score += 20;
          } else if (distance <= 1000) {
            reasons.push('距离较近');
            score += 10;
          }
        }

        return {
          clinicId: Number(row.id),
          name: row.name,
          address: row.address,
          city: row.city,
          district: row.district,
          phone: row.phone,
          businessHours: row.businessHours,
          distance,
          matchScore: score,
          matchReasons: reasons,
        };
      })
      .filter((item) => item.matchScore >= 20)
      .sort((left, right) => {
        if (right.matchScore !== left.matchScore) {
          return right.matchScore - left.matchScore;
        }

        if (left.distance === null && right.distance === null) {
          return left.clinicId - right.clinicId;
        }

        if (left.distance === null) {
          return 1;
        }

        if (right.distance === null) {
          return -1;
        }

        return left.distance - right.distance;
      })
      .slice(0, limit);

    return matches;
  }

  private async findHistoricalDuplicates(
    submission: ClinicSubmissionEntity,
  ): Promise<AdminClinicSubmissionDetailResult['historicalDuplicates']> {
    const duplicateCandidates = await this.clinicSubmissionRepository.find({
      where: [
        {
          clinicId: submission.clinicId ?? undefined,
        },
        {
          name: submission.name,
          city: submission.city ?? undefined,
        },
        ...(submission.phone
          ? [
              {
                phone: submission.phone,
              },
            ]
          : []),
      ].filter((item) =>
        Object.values(item).some((value) => value !== undefined && value !== null),
      ) as FindOptionsWhere<ClinicSubmissionEntity>[],
      relations: {
        submitterUser: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      take: 10,
    });

    return duplicateCandidates
      .filter((candidate) => candidate.id !== submission.id)
      .map((candidate) => {
        const reasons: string[] = [];

        if (
          submission.clinicId &&
          candidate.clinicId &&
          submission.clinicId === candidate.clinicId
        ) {
          reasons.push('关联同一诊所');
        }

        if (candidate.name.trim() === submission.name.trim()) {
          reasons.push('诊所名称一致');
        }

        if (
          submission.phone &&
          candidate.phone &&
          submission.phone.trim() === candidate.phone.trim()
        ) {
          reasons.push('联系电话一致');
        }

        if (
          submission.address &&
          candidate.address &&
          candidate.address.trim() === submission.address.trim()
        ) {
          reasons.push('提交地址一致');
        }

        return {
          id: Number(candidate.id),
          submissionType: candidate.submissionType,
          status: candidate.status,
          clinicId: candidate.clinicId,
          matchedClinicId: candidate.matchedClinicId,
          name: candidate.name,
          address: candidate.address,
          city: candidate.city,
          district: candidate.district,
          phone: candidate.phone,
          reason: candidate.reason,
          createdAt: candidate.createdAt,
          submitter: {
            userId: Number(candidate.submitterUser.id),
            nickname: candidate.submitterUser.nickname,
          },
          duplicateReasons: reasons.length > 0 ? reasons : ['信息高度相似'],
        };
      })
      .slice(0, 5);
  }

  private ensureSubmissionReviewable(status: ClinicSubmissionStatus): void {
    if (
      status !== ClinicSubmissionStatus.PendingReview &&
      status !== ClinicSubmissionStatus.NeedInfo
    ) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '当前推荐单状态不允许继续审核',
      });
    }
  }

  private async createClinicFromSubmission(
    clinicRepository: Repository<ClinicEntity>,
    submission: ClinicSubmissionEntity,
  ): Promise<ClinicEntity> {
    if (
      typeof submission.lat !== 'number' ||
      typeof submission.lng !== 'number' ||
      !submission.address?.trim() ||
      !submission.city?.trim()
    ) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '推荐单缺少创建诊所所需的地址、城市或定位信息',
      });
    }

    const clinic = clinicRepository.create({
      name: submission.name.trim(),
      address: submission.address.trim(),
      lat: submission.lat,
      lng: submission.lng,
      location: {
        type: 'Point',
        coordinates: [submission.lng, submission.lat],
      },
      phone: submission.phone,
      wechat: null,
      businessHours: submission.businessHours,
      city: submission.city.trim(),
      district: submission.district,
      isClaimed: 0,
      expireAt: null,
      status: 1,
    });

    return clinicRepository.save(clinic);
  }

  async createSubmission(
    userId: string,
    payload: CreateClinicSubmissionDto,
  ): Promise<CreateClinicSubmissionResult> {
    this.validateRequiredTextFields(payload);
    await this.validateClinicAssociation(payload);

    const submission = this.clinicSubmissionRepository.create({
      submitterUserId: userId,
      submissionType: payload.submissionType,
      clinicId: payload.clinicId ?? null,
      name: payload.name.trim(),
      address: this.toNullableString(payload.address),
      city: this.toNullableString(payload.city),
      district: this.toNullableString(payload.district),
      lat: typeof payload.lat === 'number' ? payload.lat : null,
      lng: typeof payload.lng === 'number' ? payload.lng : null,
      phone: this.toNullableString(payload.phone),
      businessHours: this.toNullableString(payload.businessHours),
      photosJson: Array.isArray(payload.photos)
        ? payload.photos.map((item) => item.trim()).filter(Boolean)
        : [],
      reason: payload.reason.trim(),
      status: ClinicSubmissionStatus.PendingReview,
      matchedClinicId: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    const savedSubmission =
      await this.clinicSubmissionRepository.save(submission);

    return {
      id: Number(savedSubmission.id),
      status: savedSubmission.status,
      matchedClinics: [],
    };
  }

  async getMySubmissions(
    userId: string,
    query: GetMyClinicSubmissionsQueryDto,
  ): Promise<GetMyClinicSubmissionsResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      submitterUserId: userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [submissions, total] =
      await this.clinicSubmissionRepository.findAndCount({
        where,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

    return {
      list: submissions.map((submission) => ({
        id: Number(submission.id),
        submissionType: submission.submissionType,
        status: submission.status,
        clinicId: submission.clinicId,
        matchedClinicId: submission.matchedClinicId,
        name: submission.name,
        address: submission.address,
        city: submission.city,
        district: submission.district,
        phone: submission.phone,
        reason: submission.reason,
        reviewNote: submission.reviewNote,
        createdAt: submission.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  private async validateClinicAssociation(
    payload: CreateClinicSubmissionDto,
  ): Promise<void> {
    if (!payload.clinicId) {
      return;
    }

    const clinic = await this.clinicRepository.findOne({
      where: {
        id: payload.clinicId,
      },
      select: {
        id: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException({
        code: RESPONSE_CODE.CLINIC_NOT_FOUND,
        message: '诊所不存在',
      });
    }
  }

  private toNullableString(value?: string) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private normalizeDateFilter(
    value: string,
    mode: 'start' | 'end',
  ): Date {
    const normalizedValue = value.trim();
    const hasExplicitTime = normalizedValue.includes('T');
    const parsed = new Date(
      hasExplicitTime
        ? normalizedValue
        : `${normalizedValue}${mode === 'start' ? 'T00:00:00.000' : 'T23:59:59.999'}`,
    );

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '提交时间筛选格式不正确',
      });
    }

    return parsed;
  }

  private validateRequiredTextFields(payload: CreateClinicSubmissionDto): void {
    if (!payload.name.trim()) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '诊所名称不能为空',
      });
    }

    if (!payload.reason.trim()) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '推荐说明不能为空',
      });
    }
  }

  private buildSubmissionPhotoFileName(extension: string) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  }

  private buildSubmissionPhotoUrl(
    storedFileName: string,
    request: {
      protocol?: string;
      get?: (name: string) => string | undefined;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    const protocol =
      request.protocol ||
      this.toSingleHeaderValue(request.headers?.['x-forwarded-proto']) ||
      'http';
    const host =
      request.get?.('host') ||
      this.toSingleHeaderValue(request.headers?.host) ||
      'localhost:3000';

    return `${protocol}://${host}/uploads/clinic-submissions/${storedFileName}`;
  }

  private toSingleHeaderValue(value?: string | string[]) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
