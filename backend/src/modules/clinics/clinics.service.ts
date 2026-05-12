import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import {
  ClinicAccountEntity,
  ClinicClaimRequestEntity,
  ClinicEntity,
  ClaimStatus,
  ClinicTagResponseEntity,
  ClinicTagStatus,
  ResponseStatus,
  TagEntity,
} from '../../database/entities';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuthActorType } from '../auth/interfaces/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';
import { CreateClinicClaimRequestDto } from './dto/create-clinic-claim-request.dto';
import { GetAdminClaimRequestsQueryDto } from './dto/get-admin-claim-requests-query.dto';
import { GetClinicDetailQueryDto } from './dto/get-clinic-detail-query.dto';
import { GetNearbyClinicsQueryDto } from './dto/get-nearby-clinics-query.dto';
import { ReviewClinicClaimRequestDto } from './dto/review-clinic-claim-request.dto';
import { SearchClinicsQueryDto } from './dto/search-clinics-query.dto';
import { SubmitClinicResponseDto } from './dto/submit-clinic-response.dto';
import { hash } from 'bcryptjs';

interface NearbyClinicRawRow {
  id: number | string;
  name: string;
  address: string;
  lat: number | string;
  lng: number | string;
  phone: string | null;
  businessHours: string | null;
  reputationScore: number | string;
  priceScore: number | string;
  confidenceFactor: number | string;
  isClaimed: number | string;
  distance: number | string;
  totalUsers: number | string;
}

interface ClinicTagSummaryRawRow {
  clinicId: number | string;
  id: number | string;
  name: string;
  category: string;
  count: number | string;
  totalTagCount: number | string;
}

interface ClinicDetailRawRow {
  id: number | string;
  name: string;
  address: string;
  lat: number | string;
  lng: number | string;
  distance: number | string | null;
  phone: string | null;
  wechat: string | null;
  businessHours: string | null;
  city: string;
  district: string | null;
  trustScore: number | string;
  valueScore: number | string;
  experienceScore: number | string;
  socialScore: number | string;
  riskPenalty: number | string;
  reputationScore: number | string;
  priceScore: number | string;
  confidenceFactor: number | string;
  isClaimed: number | string;
}

interface ClinicDetailTagRawRow {
  id: number | string;
  name: string;
  category: string;
  count: number | string;
  uniqueUsers: number | string;
  status: ClinicTagStatus;
  displayWeight: number | string;
}

interface SearchClinicRawRow {
  id: number | string;
  name: string;
  address: string;
  lat: number | string;
  lng: number | string;
  phone: string | null;
  businessHours: string | null;
  reputationScore: number | string;
  priceScore: number | string;
  confidenceFactor: number | string;
  isClaimed: number | string;
  distance: number | string | null;
}

export interface NearbyClinicTagSummary {
  id: number;
  name: string;
  count: number;
  category: string;
}

export interface NearbyClinicItem {
  id: number;
  name: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
  phone: string | null;
  businessHours: string | null;
  reputationScore: number;
  priceScore: number;
  confidenceFactor: number;
  topTags: NearbyClinicTagSummary[];
  totalTagCount: number;
  totalUsers: number;
  isClaimed: boolean;
}

export interface NearbyClinicsResponse {
  list: NearbyClinicItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClinicDetailTagItem {
  id: number;
  name: string;
  count: number;
  uniqueUsers: number;
  status: ClinicTagStatus;
  displayWeight: number;
}

export interface ClinicDetailResponse {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number | null;
  phone: string | null;
  wechat: string | null;
  businessHours: string | null;
  city: string;
  district: string | null;
  scores: {
    trust: number;
    value: number;
    experience: number;
    social: number;
    riskPenalty: number;
    reputation: number;
    price: number;
    confidenceFactor: number;
  };
  tags: Record<string, ClinicDetailTagItem[]>;
  isClaimed: boolean;
}

export interface SearchClinicItem {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number | null;
  phone: string | null;
  businessHours: string | null;
  reputationScore: number;
  priceScore: number;
  confidenceFactor: number;
  isClaimed: boolean;
}

export interface SearchClinicsResponse {
  list: SearchClinicItem[];
  total: number;
  page: number;
  pageSize: number;
}

const NEARBY_CLINICS_CACHE_TTL_SECONDS = 300;
const CLINIC_DETAIL_CACHE_TTL_SECONDS = 300;
const CLINIC_RESPONSE_TEXT_LIMIT = 200;

export interface SubmitClinicResponseResult {
  responseId: number;
  status: ResponseStatus;
  createdAt: Date;
}

export interface CreateClinicClaimRequestResult {
  id: number;
  status: ClaimStatus;
}

export interface ClinicClaimRequestListItem {
  id: number;
  clinicId: number;
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  clinicDistrict: string | null;
  applicantName: string;
  applicantPhone: string;
  proofMaterial: string | null;
  status: ClaimStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface GetMyClinicClaimRequestsResult {
  list: ClinicClaimRequestListItem[];
  total: number;
}

export interface ClinicClaimRequestDetailResult extends ClinicClaimRequestListItem {
  submitterUserId: number | null;
}

export interface AdminClinicClaimRequestListItem
  extends ClinicClaimRequestListItem {
  submitter: {
    userId: number | null;
    nickname: string | null;
    city: string | null;
  } | null;
  reviewedBy: number | null;
}

export interface GetAdminClaimRequestsResult {
  list: AdminClinicClaimRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewClinicClaimRequestResult {
  id: number;
  status: ClaimStatus;
  reviewedAt: Date;
  reviewNote: string | null;
  reviewedBy: number;
  clinicAccount: {
    clinicAccountId: number;
    username: string;
    temporaryPassword: string | null;
  } | null;
}

export interface ClinicResponseItem {
  id: number;
  tagId: number;
  tagName: string;
  responseText: string;
  status: ResponseStatus;
  createdAt: Date;
  approvedAt: Date | null;
}

export interface ClinicResponseListResult {
  responses: ClinicResponseItem[];
}

@Injectable()
export class ClinicsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    @InjectRepository(ClinicEntity)
    private readonly clinicRepository: Repository<ClinicEntity>,
    @InjectRepository(ClinicAccountEntity)
    private readonly clinicAccountRepository: Repository<ClinicAccountEntity>,
    @InjectRepository(ClinicClaimRequestEntity)
    private readonly clinicClaimRequestRepository: Repository<ClinicClaimRequestEntity>,
    @InjectRepository(ClinicTagResponseEntity)
    private readonly clinicTagResponseRepository: Repository<ClinicTagResponseEntity>,
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
  ) {}

  async getClinicResponses(
    clinicId: number,
  ): Promise<ClinicResponseListResult> {
    const clinic = await this.clinicRepository.findOne({
      where: {
        id: clinicId,
        status: 1,
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

    const responses = await this.clinicTagResponseRepository.find({
      where: {
        clinicId,
        status: ResponseStatus.Approved,
      },
      relations: {
        tag: true,
      },
      order: {
        approvedAt: 'DESC',
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    return {
      responses: responses.map((response) => ({
        id: response.id,
        tagId: response.tagId,
        tagName: response.tag.name,
        responseText: response.responseText,
        status: response.status,
        createdAt: response.createdAt,
        approvedAt: response.approvedAt,
      })),
    };
  }

  async submitClinicResponse(
    clinicId: number,
    actor: AuthenticatedUser,
    payload: SubmitClinicResponseDto,
  ): Promise<SubmitClinicResponseResult> {
    this.ensureClinicActorMatchesClinic(clinicId, actor);

    const responseText = payload.responseText.trim();

    if (!responseText) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '回应内容不能为空',
      });
    }

    if (responseText.length > CLINIC_RESPONSE_TEXT_LIMIT) {
      throw new BadRequestException({
        code: RESPONSE_CODE.RESPONSE_TOO_LONG,
        message: `回应内容不能超过 ${CLINIC_RESPONSE_TEXT_LIMIT} 字`,
      });
    }

    await this.ensureClinicCanRespond(clinicId, actor.clinicAccountId!);

    const tag = await this.tagRepository.findOne({
      where: {
        id: payload.tagId,
        status: 1,
      },
    });

    if (!tag) {
      throw new NotFoundException({
        code: RESPONSE_CODE.TAG_NOT_FOUND,
        message: '标签不存在',
      });
    }

    const existingResponse = await this.clinicTagResponseRepository.findOne({
      where: {
        clinicId,
        tagId: payload.tagId,
      },
    });

    const entity =
      existingResponse ??
      this.clinicTagResponseRepository.create({
        clinicId,
        tagId: payload.tagId,
      });

    entity.responseText = responseText;
    entity.status = ResponseStatus.Pending;
    entity.approvedAt = null;
    entity.approvedBy = null;

    const savedResponse = await this.clinicTagResponseRepository.save(entity);

    return {
      responseId: savedResponse.id,
      status: savedResponse.status,
      createdAt: savedResponse.createdAt,
    };
  }

  async createClinicClaimRequest(
    clinicId: number,
    submitterUserId: string,
    payload: CreateClinicClaimRequestDto,
  ): Promise<CreateClinicClaimRequestResult> {
    const clinic = await this.clinicRepository.findOne({
      where: {
        id: clinicId,
        status: 1,
      },
    });

    if (!clinic) {
      throw new NotFoundException({
        code: RESPONSE_CODE.CLINIC_NOT_FOUND,
        message: '诊所不存在',
      });
    }

    if (clinic.isClaimed === 1) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '该诊所已被认领，无需重复申请',
      });
    }

    const existingPendingRequest =
      await this.clinicClaimRequestRepository.findOne({
        where: {
          clinicId,
          status: ClaimStatus.Pending,
        },
      });

    if (existingPendingRequest) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '该诊所已有认领申请正在审核中',
      });
    }

    const claimRequest = this.clinicClaimRequestRepository.create({
      clinicId,
      submitterUserId,
      applicantName: payload.applicantName.trim(),
      applicantPhone: payload.applicantPhone.trim(),
      proofMaterial: this.toNullableString(payload.proofMaterial),
      status: ClaimStatus.Pending,
    });
    const savedClaimRequest =
      await this.clinicClaimRequestRepository.save(claimRequest);

    return {
      id: Number(savedClaimRequest.id),
      status: savedClaimRequest.status,
    };
  }

  async getMyClinicClaimRequests(
    submitterUserId: string,
  ): Promise<GetMyClinicClaimRequestsResult> {
    const claimRequests = await this.clinicClaimRequestRepository.find({
      where: {
        submitterUserId,
      },
      relations: {
        clinic: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    return {
      list: claimRequests.map((claimRequest) =>
        this.toClinicClaimRequestListItem(claimRequest),
      ),
      total: claimRequests.length,
    };
  }

  async getAdminClaimRequests(
    query: GetAdminClaimRequestsQueryDto,
  ): Promise<GetAdminClaimRequestsResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: FindOptionsWhere<ClinicClaimRequestEntity> = {};

    if (query.status) {
      where.status = query.status;
    }

    const [claimRequests, total] =
      await this.clinicClaimRequestRepository.findAndCount({
        where,
        relations: {
          clinic: true,
          submitterUser: true,
        },
        order: {
          createdAt: 'DESC',
          id: 'DESC',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

    return {
      list: claimRequests.map((claimRequest) => ({
        ...this.toClinicClaimRequestListItem(claimRequest),
        submitter: claimRequest.submitterUser
          ? {
              userId: Number(claimRequest.submitterUser.id),
              nickname: claimRequest.submitterUser.nickname,
              city: claimRequest.submitterUser.city,
            }
          : null,
        reviewedBy: claimRequest.reviewedBy
          ? Number(claimRequest.reviewedBy)
          : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getClinicClaimRequestDetail(
    id: number,
    actor: AuthenticatedUser,
  ): Promise<ClinicClaimRequestDetailResult> {
    const claimRequest = await this.clinicClaimRequestRepository.findOne({
      where: {
        id: String(id),
      },
      relations: {
        clinic: true,
      },
    });

    if (!claimRequest) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '认领申请不存在',
      });
    }

    if (
      actor.actorType === AuthActorType.User &&
      claimRequest.submitterUserId !== actor.userId
    ) {
      throw new ForbiddenException({
        code: RESPONSE_CODE.TOKEN_INVALID,
        message: '无权查看该认领申请',
      });
    }

    if (
      actor.actorType !== AuthActorType.User &&
      actor.actorType !== AuthActorType.Admin
    ) {
      throw new ForbiddenException({
        code: RESPONSE_CODE.TOKEN_INVALID,
        message: '当前令牌不支持查看认领申请',
      });
    }

    return {
      ...this.toClinicClaimRequestListItem(claimRequest),
      submitterUserId: claimRequest.submitterUserId
        ? Number(claimRequest.submitterUserId)
        : null,
    };
  }

  async reviewClinicClaimRequest(
    adminUserId: string,
    id: number,
    payload: ReviewClinicClaimRequestDto,
  ): Promise<ReviewClinicClaimRequestResult> {
    return this.dataSource.transaction(async (manager) => {
      const claimRequestRepository =
        manager.getRepository(ClinicClaimRequestEntity);
      const clinicRepository = manager.getRepository(ClinicEntity);
      const clinicAccountRepository = manager.getRepository(ClinicAccountEntity);

      const claimRequest = await claimRequestRepository.findOne({
        where: {
          id: String(id),
        },
      });

      if (!claimRequest) {
        throw new NotFoundException({
          code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
          message: '认领申请不存在',
        });
      }

      if (claimRequest.status !== ClaimStatus.Pending) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: '当前认领申请状态不允许继续审核',
        });
      }

      let clinicAccountMeta: ReviewClinicClaimRequestResult['clinicAccount'] = null;
      const adminNote = this.toNullableString(payload.note);

      if (payload.action === ClaimStatus.Approved) {
        const clinic = await clinicRepository.findOne({
          where: {
            id: claimRequest.clinicId,
            status: 1,
          },
        });

        if (!clinic) {
          throw new NotFoundException({
            code: RESPONSE_CODE.CLINIC_NOT_FOUND,
            message: '诊所不存在',
          });
        }

        const clinicAccount =
          await clinicAccountRepository.findOne({
            where: {
              clinicId: claimRequest.clinicId,
            },
          });

        if (clinicAccount) {
          clinicAccount.status = 1;
          const savedClinicAccount =
            await clinicAccountRepository.save(clinicAccount);
          clinicAccountMeta = {
            clinicAccountId: Number(savedClinicAccount.id),
            username: savedClinicAccount.username,
            temporaryPassword: null,
          };
        } else {
          const username = `clinic_admin_${claimRequest.clinicId}`;
          const temporaryPassword = this.buildClinicTemporaryPassword(
            claimRequest.clinicId,
          );
          const passwordHash = await hash(temporaryPassword, 10);
          const createdClinicAccount = clinicAccountRepository.create({
            clinicId: claimRequest.clinicId,
            username,
            passwordHash,
            status: 1,
          });
          const savedClinicAccount =
            await clinicAccountRepository.save(createdClinicAccount);
          clinicAccountMeta = {
            clinicAccountId: Number(savedClinicAccount.id),
            username: savedClinicAccount.username,
            temporaryPassword,
          };
        }

        clinic.isClaimed = 1;
        clinic.expireAt = null;
        await clinicRepository.save(clinic);
      }

      claimRequest.status = payload.action;
      claimRequest.reviewedBy = adminUserId;
      claimRequest.reviewedAt = new Date();
      claimRequest.reviewNote = this.buildClaimReviewNote(
        adminNote,
        clinicAccountMeta,
      );

      const savedClaimRequest = await claimRequestRepository.save(claimRequest);

      return {
        id: Number(savedClaimRequest.id),
        status: savedClaimRequest.status,
        reviewedAt: savedClaimRequest.reviewedAt!,
        reviewNote: savedClaimRequest.reviewNote,
        reviewedBy: Number(adminUserId),
        clinicAccount: clinicAccountMeta,
      };
    });
  }

  async searchClinics(
    query: SearchClinicsQueryDto,
  ): Promise<SearchClinicsResponse> {
    const keyword = query.keyword.trim();
    const likeKeyword = `%${keyword}%`;
    const filterParams: Array<string | number> = [likeKeyword];
    const conditions = [
      'c.status = 1',
      '(c.name ILIKE $1 OR c.address ILIKE $1)',
    ];

    let latParamIndex = 2;
    let lngParamIndex = 3;
    let nextParamIndex = 2;

    if (query.city?.trim()) {
      conditions.push(`c.city = $${nextParamIndex}`);
      filterParams.push(query.city.trim());
      nextParamIndex += 1;
      latParamIndex = nextParamIndex;
      lngParamIndex = nextParamIndex + 1;
    }

    const params: Array<string | number | null> = [
      ...filterParams,
      query.lat ?? null,
      query.lng ?? null,
    ];
    nextParamIndex = params.length + 1;

    const distanceExpression = `
      CASE
        WHEN $${latParamIndex}::double precision IS NOT NULL
          AND $${lngParamIndex}::double precision IS NOT NULL
        THEN ROUND(
          CAST(
            ST_Distance(
              c.location,
              ST_SetSRID(
                ST_MakePoint($${lngParamIndex}::double precision, $${latParamIndex}::double precision),
                4326
              )::geography
            ) AS numeric
          ),
          0
        )
        ELSE NULL
      END
    `;
    const whereClause = conditions.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;

    const countRows = await this.dataSource.query<{ total: string | number }[]>(
      `
        SELECT COUNT(*)::int AS total
        FROM clinic AS c
        WHERE ${whereClause};
      `,
      filterParams,
    );
    const total = Number(countRows[0]?.total ?? 0);

    if (total === 0) {
      return {
        list: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    const rows = await this.dataSource.query<SearchClinicRawRow[]>(
      `
        SELECT
          c.id,
          c.name,
          c.address,
          c.lat,
          c.lng,
          c.phone,
          c.business_hours AS "businessHours",
          c.reputation_score AS "reputationScore",
          c.price_score AS "priceScore",
          c.confidence_factor AS "confidenceFactor",
          c.is_claimed AS "isClaimed",
          ${distanceExpression} AS distance
        FROM clinic AS c
        WHERE ${whereClause}
        ORDER BY
          CASE
            WHEN c.name ILIKE $1 THEN 0
            ELSE 1
          END ASC,
          c.reputation_score DESC,
          c.id ASC
        LIMIT $${nextParamIndex}
        OFFSET $${nextParamIndex + 1};
      `,
      [...params, query.pageSize, offset],
    );

    return {
      list: rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        address: row.address,
        lat: Number(row.lat),
        lng: Number(row.lng),
        distance: row.distance === null ? null : Number(row.distance),
        phone: row.phone,
        businessHours: row.businessHours,
        reputationScore: Number(row.reputationScore),
        priceScore: Number(row.priceScore),
        confidenceFactor: Number(row.confidenceFactor),
        isClaimed: Number(row.isClaimed) === 1,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getClinicDetail(
    id: number,
    query: GetClinicDetailQueryDto,
  ): Promise<ClinicDetailResponse> {
    const cacheKey = this.buildClinicDetailCacheKey(id, query);
    const cached = await this.getClinicDetailCache(cacheKey);

    if (cached) {
      return cached;
    }

    const clinicRows = await this.dataSource.query<ClinicDetailRawRow[]>(
      `
        SELECT
          c.id,
          c.name,
          c.address,
          c.lat,
          c.lng,
          CASE
            WHEN $2::double precision IS NOT NULL AND $3::double precision IS NOT NULL
              THEN ROUND(
                CAST(
                  ST_Distance(
                    c.location,
                    ST_SetSRID(
                      ST_MakePoint($3::double precision, $2::double precision),
                      4326
                    )::geography
                  ) AS numeric
                ),
                0
              )
            ELSE NULL
          END AS distance,
          c.phone,
          c.wechat,
          c.business_hours AS "businessHours",
          c.city,
          c.district,
          c.trust_score AS "trustScore",
          c.value_score AS "valueScore",
          c.experience_score AS "experienceScore",
          c.social_score AS "socialScore",
          c.risk_penalty AS "riskPenalty",
          c.reputation_score AS "reputationScore",
          c.price_score AS "priceScore",
          c.confidence_factor AS "confidenceFactor",
          c.is_claimed AS "isClaimed"
        FROM clinic AS c
        WHERE c.id = $1
          AND c.status = 1
        LIMIT 1;
      `,
      [id, query.lat ?? null, query.lng ?? null],
    );

    const clinic = clinicRows[0];

    if (!clinic) {
      throw new NotFoundException({
        code: RESPONSE_CODE.CLINIC_NOT_FOUND,
        message: '诊所不存在',
      });
    }

    const tagRows = await this.dataSource.query<ClinicDetailTagRawRow[]>(
      `
        SELECT
          t.id,
          t.name,
          t.category,
          cts.count,
          cts.unique_users AS "uniqueUsers",
          cts.status,
          cts.display_weight AS "displayWeight"
        FROM clinic_tag_stat AS cts
        INNER JOIN tag AS t ON t.id = cts.tag_id
        WHERE cts.clinic_id = $1
          AND cts.count > 0
          AND cts.status != 'expired'
          AND t.status = 1
          AND t.is_display = 1
        ORDER BY t.category ASC, cts.count DESC, t.id ASC;
      `,
      [id],
    );

    const tags = tagRows.reduce<Record<string, ClinicDetailTagItem[]>>(
      (accumulator, row) => {
        const categoryBucket = accumulator[row.category] ?? [];

        categoryBucket.push({
          id: Number(row.id),
          name: row.name,
          count: Number(row.count),
          uniqueUsers: Number(row.uniqueUsers),
          status: row.status,
          displayWeight: Number(row.displayWeight),
        });

        accumulator[row.category] = categoryBucket;

        return accumulator;
      },
      {},
    );

    const result = {
      id: Number(clinic.id),
      name: clinic.name,
      address: clinic.address,
      lat: Number(clinic.lat),
      lng: Number(clinic.lng),
      distance: clinic.distance === null ? null : Number(clinic.distance),
      phone: clinic.phone,
      wechat: clinic.wechat,
      businessHours: clinic.businessHours,
      city: clinic.city,
      district: clinic.district,
      scores: {
        trust: Number(clinic.trustScore),
        value: Number(clinic.valueScore),
        experience: Number(clinic.experienceScore),
        social: Number(clinic.socialScore),
        riskPenalty: Number(clinic.riskPenalty),
        reputation: Number(clinic.reputationScore),
        price: Number(clinic.priceScore),
        confidenceFactor: Number(clinic.confidenceFactor),
      },
      tags,
      isClaimed: Number(clinic.isClaimed) === 1,
    };

    await this.setClinicDetailCache(cacheKey, result);

    return result;
  }

  async getNearbyClinics(
    query: GetNearbyClinicsQueryDto,
  ): Promise<NearbyClinicsResponse> {
    const cacheKey = this.buildNearbyClinicCacheKey(query);
    const cached = await this.getNearbyClinicsCache(cacheKey);

    if (cached) {
      return cached;
    }

    const { countSql, listSql, params, pagingParams } =
      this.buildNearbyClinicSql(query);

    const countRows = await this.dataSource.query<{ total: string | number }[]>(
      countSql,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    if (total === 0) {
      return {
        list: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    const clinicRows = await this.dataSource.query<NearbyClinicRawRow[]>(
      listSql,
      [...params, ...pagingParams],
    );

    const clinicIds = clinicRows.map((row) => Number(row.id));
    const tagSummaryMap = await this.loadClinicTagSummaries(clinicIds);

    const result = {
      list: clinicRows.map((row) => {
        const clinicId = Number(row.id);
        const tagSummary = tagSummaryMap.get(clinicId) ?? {
          topTags: [],
          totalTagCount: 0,
        };

        return {
          id: clinicId,
          name: row.name,
          address: row.address,
          distance: Number(row.distance),
          lat: Number(row.lat),
          lng: Number(row.lng),
          phone: row.phone,
          businessHours: row.businessHours,
          reputationScore: Number(row.reputationScore),
          priceScore: Number(row.priceScore),
          confidenceFactor: Number(row.confidenceFactor),
          topTags: tagSummary.topTags,
          totalTagCount: tagSummary.totalTagCount,
          totalUsers: Number(row.totalUsers ?? 0),
          isClaimed: Number(row.isClaimed) === 1,
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };

    await this.setNearbyClinicsCache(cacheKey, result);

    return result;
  }

  private buildNearbyClinicSql(query: GetNearbyClinicsQueryDto) {
    const pointExpression =
      'ST_SetSRID(ST_MakePoint($2::double precision, $3::double precision), 4326)::geography';
    const params: Array<string | number | number[]> = [
      query.city,
      query.lng,
      query.lat,
      query.radius,
    ];
    const conditions = [
      'c.status = 1',
      'c.city = $1',
      `ST_DWithin(c.location, ${pointExpression}, $4)`,
    ];

    let nextParamIndex = 5;

    if (query.tagIds && query.tagIds.length > 0) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM clinic_tag_stat AS cts
          WHERE cts.clinic_id = c.id
            AND cts.tag_id = ANY($${nextParamIndex}::int[])
            AND cts.count > 0
            AND cts.status != 'expired'
        )
      `);
      params.push(query.tagIds);
      nextParamIndex += 1;
    }

    const sortColumn =
      query.sortType === 'price' ? 'c.price_score' : 'c.reputation_score';
    const whereClause = conditions.join(' AND ');
    const distanceExpression = `ROUND(CAST(ST_Distance(c.location, ${pointExpression}) AS numeric), 0)`;
    const offset = (query.page - 1) * query.pageSize;
    const pagingParams = [query.pageSize, offset];

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM clinic AS c
      WHERE ${whereClause};
    `;

    const listSql = `
      SELECT
        c.id,
        c.name,
        c.address,
        c.lat,
        c.lng,
        c.phone,
        c.business_hours AS "businessHours",
        c.reputation_score AS "reputationScore",
        c.price_score AS "priceScore",
        c.confidence_factor AS "confidenceFactor",
        c.is_claimed AS "isClaimed",
        ${distanceExpression} AS distance,
        COALESCE((
          SELECT COUNT(DISTINCT utl.user_id)
          FROM user_tag_log AS utl
          WHERE utl.clinic_id = c.id
        ), 0) AS "totalUsers"
      FROM clinic AS c
      WHERE ${whereClause}
      ORDER BY ${sortColumn} DESC, ${distanceExpression} ASC, c.id ASC
      LIMIT $${nextParamIndex}
      OFFSET $${nextParamIndex + 1};
    `;

    return {
      countSql,
      listSql,
      params,
      pagingParams,
    };
  }

  private async loadClinicTagSummaries(clinicIds: number[]) {
    const clinicTagSummaryMap = new Map<
      number,
      {
        topTags: NearbyClinicTagSummary[];
        totalTagCount: number;
      }
    >();

    if (clinicIds.length === 0) {
      return clinicTagSummaryMap;
    }

    const rows = await this.dataSource.query<ClinicTagSummaryRawRow[]>(
      `
        SELECT *
        FROM (
          SELECT
            cts.clinic_id AS "clinicId",
            t.id,
            t.name,
            t.category,
            cts.count,
            SUM(cts.count) OVER (PARTITION BY cts.clinic_id) AS "totalTagCount",
            ROW_NUMBER() OVER (
              PARTITION BY cts.clinic_id
              ORDER BY cts.count DESC, t.id ASC
            ) AS rank
          FROM clinic_tag_stat AS cts
          INNER JOIN tag AS t ON t.id = cts.tag_id
          WHERE cts.clinic_id = ANY($1::int[])
            AND cts.count > 0
            AND cts.status != 'expired'
            AND t.status = 1
            AND t.is_display = 1
        ) AS ranked_tags
        WHERE rank <= 3
        ORDER BY "clinicId" ASC, rank ASC;
      `,
      [clinicIds],
    );

    for (const row of rows) {
      const clinicId = Number(row.clinicId);
      const current = clinicTagSummaryMap.get(clinicId) ?? {
        topTags: [],
        totalTagCount: Number(row.totalTagCount ?? 0),
      };

      current.topTags.push({
        id: Number(row.id),
        name: row.name,
        count: Number(row.count),
        category: row.category,
      });

      current.totalTagCount = Number(
        row.totalTagCount ?? current.totalTagCount,
      );
      clinicTagSummaryMap.set(clinicId, current);
    }

    return clinicTagSummaryMap;
  }

  private buildNearbyClinicCacheKey(query: GetNearbyClinicsQueryDto) {
    const tagIds =
      query.tagIds && query.tagIds.length > 0
        ? [...query.tagIds].sort((left, right) => left - right).join(',')
        : 'all';

    return [
      'clinics',
      'nearby',
      encodeURIComponent(query.city),
      query.lat.toFixed(6),
      query.lng.toFixed(6),
      query.radius,
      query.sortType,
      query.page,
      query.pageSize,
      tagIds,
    ].join(':');
  }

  private buildClinicDetailCacheKey(
    id: number,
    query: GetClinicDetailQueryDto,
  ) {
    const lat = query.lat !== undefined ? query.lat.toFixed(6) : 'none';
    const lng = query.lng !== undefined ? query.lng.toFixed(6) : 'none';

    return ['clinics', 'detail', id, lat, lng].join(':');
  }

  private async getNearbyClinicsCache(key: string) {
    try {
      const cached = await this.redisService.get(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as NearbyClinicsResponse;
    } catch {
      return null;
    }
  }

  private async getClinicDetailCache(key: string) {
    try {
      const cached = await this.redisService.get(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as ClinicDetailResponse;
    } catch {
      return null;
    }
  }

  private async setNearbyClinicsCache(
    key: string,
    value: NearbyClinicsResponse,
  ) {
    try {
      await this.redisService.set(
        key,
        JSON.stringify(value),
        NEARBY_CLINICS_CACHE_TTL_SECONDS,
      );
    } catch {
      // Ignore Redis write failures so the primary DB query still succeeds.
    }
  }

  private async setClinicDetailCache(key: string, value: ClinicDetailResponse) {
    try {
      await this.redisService.set(
        key,
        JSON.stringify(value),
        CLINIC_DETAIL_CACHE_TTL_SECONDS,
      );
    } catch {
      // Ignore Redis write failures so the primary DB query still succeeds.
    }
  }

  private ensureClinicActorMatchesClinic(
    clinicId: number,
    actor: AuthenticatedUser,
  ) {
    if (actor.clinicId !== clinicId) {
      throw new ForbiddenException({
        code: RESPONSE_CODE.TOKEN_INVALID,
        message: '当前诊所账号无权操作该诊所',
      });
    }
  }

  private async ensureClinicCanRespond(
    clinicId: number,
    clinicAccountId: string,
  ) {
    const [clinic, clinicAccount] = await Promise.all([
      this.clinicRepository.findOne({
        where: {
          id: clinicId,
          status: 1,
        },
      }),
      this.clinicAccountRepository.findOne({
        where: {
          id: clinicAccountId,
          clinicId,
          status: 1,
        },
      }),
    ]);

    const isClaimExpired =
      clinic?.expireAt instanceof Date &&
      clinic.expireAt.getTime() < Date.now();
    const isClaimValid = clinic?.isClaimed === 1 && !isClaimExpired;

    if (!clinic || !clinicAccount || !isClaimValid) {
      throw new BadRequestException({
        code: RESPONSE_CODE.CLINIC_NOT_CLAIMED,
        message: '请先认领诊所后再提交回应',
      });
    }
  }

  private toNullableString(value?: string | null) {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
  }

  private buildClinicTemporaryPassword(clinicId: number) {
    return `Clinic@${clinicId}888`;
  }

  private buildClaimReviewNote(
    adminNote: string | null,
    clinicAccount: ReviewClinicClaimRequestResult['clinicAccount'],
  ) {
    if (!clinicAccount) {
      return adminNote;
    }

    const accountNote = clinicAccount.temporaryPassword
      ? `后台登录账号：${clinicAccount.username}，初始密码：${clinicAccount.temporaryPassword}`
      : `后台登录账号：${clinicAccount.username}，密码沿用原账号密码`;

    return adminNote ? `${adminNote}\n${accountNote}` : accountNote;
  }

  private toClinicClaimRequestListItem(
    claimRequest: ClinicClaimRequestEntity,
  ): ClinicClaimRequestListItem {
    return {
      id: Number(claimRequest.id),
      clinicId: claimRequest.clinicId,
      clinicName: claimRequest.clinic?.name || '未知诊所',
      clinicAddress: claimRequest.clinic?.address || '',
      clinicCity: claimRequest.clinic?.city || '',
      clinicDistrict: claimRequest.clinic?.district || null,
      applicantName: claimRequest.applicantName,
      applicantPhone: claimRequest.applicantPhone,
      proofMaterial: claimRequest.proofMaterial,
      status: claimRequest.status,
      reviewNote: claimRequest.reviewNote,
      reviewedAt: claimRequest.reviewedAt,
      createdAt: claimRequest.createdAt,
    };
  }
}
