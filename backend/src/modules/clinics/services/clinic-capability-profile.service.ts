import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { RESPONSE_CODE } from '../../../common/constants/response-code.constants';
import {
  CapabilityDefinitionEntity,
  CapabilityProfileStatus,
  CapabilitySourceType,
  CapabilityType,
  CapabilityVerificationStatus,
  ClinicCapabilityEntity,
  ClinicEntity,
  ClinicSubmissionEntity,
} from '../../../database/entities';
import { GetCapabilityDefinitionsQueryDto } from '../dto/get-capability-definitions-query.dto';
import { CreateCapabilityDefinitionDto } from '../dto/create-capability-definition.dto';
import { UpdateCapabilityDefinitionDto } from '../dto/update-capability-definition.dto';
import { UpsertClinicCapabilityItemDto } from '../dto/upsert-clinic-capabilities.dto';
import { ClinicCacheService } from './clinic-cache.service';

export interface CapabilityDefinitionItem {
  id: number;
  code: string;
  name: string;
  type: CapabilityType;
  sortOrder: number;
  isActive: boolean;
}

export interface ClinicCapabilityViewItem {
  id: number;
  code: string;
  name: string;
  type: CapabilityType;
  sourceType: CapabilitySourceType;
  verificationStatus: CapabilityVerificationStatus;
  confidenceScore: number;
  note: string | null;
}

export interface GroupedCapabilityDictionaryResponse {
  services: CapabilityDefinitionItem[];
  specialties: CapabilityDefinitionItem[];
  equipment: CapabilityDefinitionItem[];
  facilities: CapabilityDefinitionItem[];
  speciesSupported: CapabilityDefinitionItem[];
}

export interface GroupedClinicCapabilityResponse {
  services: ClinicCapabilityViewItem[];
  specialties: ClinicCapabilityViewItem[];
  equipment: ClinicCapabilityViewItem[];
  facilities: ClinicCapabilityViewItem[];
  speciesSupported: ClinicCapabilityViewItem[];
  highlights: string[];
}

export interface NormalizedSubmissionCapabilities {
  services: string[];
  specialties: string[];
  equipment: string[];
  facilities: string[];
  speciesSupported: string[];
  capabilityNotes: string | null;
}

export interface GroupedSubmissionCapabilitySnapshot extends GroupedCapabilityDictionaryResponse {
  capabilityNotes: string | null;
}

const CAPABILITY_TYPE_TO_GROUP_KEY: Record<
  CapabilityType,
  keyof Omit<GroupedClinicCapabilityResponse, 'highlights'>
> = {
  [CapabilityType.Service]: 'services',
  [CapabilityType.Specialty]: 'specialties',
  [CapabilityType.Equipment]: 'equipment',
  [CapabilityType.Facility]: 'facilities',
  [CapabilityType.SpeciesSupported]: 'speciesSupported',
};

const GROUP_KEY_TO_CAPABILITY_TYPE: Record<
  keyof Omit<GroupedClinicCapabilityResponse, 'highlights'>,
  CapabilityType
> = {
  services: CapabilityType.Service,
  specialties: CapabilityType.Specialty,
  equipment: CapabilityType.Equipment,
  facilities: CapabilityType.Facility,
  speciesSupported: CapabilityType.SpeciesSupported,
};

@Injectable()
export class ClinicCapabilityProfileService {
  constructor(
    @InjectRepository(CapabilityDefinitionEntity)
    private readonly capabilityDefinitionRepository: Repository<CapabilityDefinitionEntity>,
    @InjectRepository(ClinicCapabilityEntity)
    private readonly clinicCapabilityRepository: Repository<ClinicCapabilityEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicRepository: Repository<ClinicEntity>,
    private readonly clinicCacheService: ClinicCacheService,
  ) {}

  async getCapabilityDefinitions(
    query: GetCapabilityDefinitionsQueryDto = {},
    options?: { includeInactive?: boolean },
  ): Promise<GroupedCapabilityDictionaryResponse> {
    const definitions = await this.capabilityDefinitionRepository.find({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(options?.includeInactive ? {} : { isActive: 1 }),
      },
      order: {
        type: 'ASC',
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });

    return this.groupDefinitions(definitions);
  }

  async listCapabilityDefinitionsForAdmin(): Promise<
    CapabilityDefinitionItem[]
  > {
    const definitions = await this.capabilityDefinitionRepository.find({
      order: {
        type: 'ASC',
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });

    return definitions.map((item) => this.toDefinitionItem(item));
  }

  async createCapabilityDefinition(
    payload: CreateCapabilityDefinitionDto,
  ): Promise<CapabilityDefinitionItem> {
    const code = payload.code.trim();
    const name = payload.name.trim();

    if (!code || !name) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '能力 code 和名称不能为空',
      });
    }

    const existing = await this.capabilityDefinitionRepository.findOne({
      where: {
        code,
      },
    });

    if (existing) {
      throw new ConflictException({
        code: RESPONSE_CODE.REPEAT_SUBMIT,
        message: '能力 code 已存在',
      });
    }

    const entity = this.capabilityDefinitionRepository.create({
      code,
      name,
      type: payload.type,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? 1,
    });
    const saved = await this.capabilityDefinitionRepository.save(entity);

    return this.toDefinitionItem(saved);
  }

  async updateCapabilityDefinition(
    id: number,
    payload: UpdateCapabilityDefinitionDto,
  ): Promise<CapabilityDefinitionItem> {
    const entity = await this.capabilityDefinitionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '能力字典项不存在',
      });
    }

    if (payload.code) {
      const code = payload.code.trim();
      if (!code) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: '能力 code 不能为空',
        });
      }

      const duplicate = await this.capabilityDefinitionRepository.findOne({
        where: { code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException({
          code: RESPONSE_CODE.REPEAT_SUBMIT,
          message: '能力 code 已存在',
        });
      }
      entity.code = code;
    }

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: '能力名称不能为空',
        });
      }
      entity.name = name;
    }

    if (payload.type) {
      entity.type = payload.type;
    }

    if (payload.sortOrder !== undefined) {
      entity.sortOrder = payload.sortOrder;
    }

    if (payload.isActive !== undefined) {
      entity.isActive = payload.isActive;
    }

    const saved = await this.capabilityDefinitionRepository.save(entity);
    return this.toDefinitionItem(saved);
  }

  async deleteCapabilityDefinition(
    id: number,
  ): Promise<{ id: number; deleted: true }> {
    const entity = await this.capabilityDefinitionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException({
        code: RESPONSE_CODE.RESOURCE_NOT_FOUND,
        message: '能力字典项不存在',
      });
    }

    const referencedCount = await this.clinicCapabilityRepository.count({
      where: {
        capabilityId: id,
      },
    });

    if (referencedCount > 0) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '该能力字典项已被诊所能力档案引用，请先停用或清理引用',
      });
    }

    await this.capabilityDefinitionRepository.delete({ id });
    return { id, deleted: true };
  }

  async getClinicCapabilities(
    clinicId: number,
  ): Promise<GroupedClinicCapabilityResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: {
        id: clinicId,
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

    const items = await this.clinicCapabilityRepository.find({
      where: {
        clinicId,
      },
      relations: {
        capability: true,
      },
      order: {
        capability: {
          type: 'ASC',
          sortOrder: 'ASC',
          id: 'ASC',
        },
      },
    });

    return this.groupClinicCapabilities(items);
  }

  async getClinicCapabilitiesMap(
    clinicIds: number[],
  ): Promise<Map<number, GroupedClinicCapabilityResponse>> {
    const result = new Map<number, GroupedClinicCapabilityResponse>();

    if (clinicIds.length === 0) {
      return result;
    }

    const items = await this.clinicCapabilityRepository.find({
      where: {
        clinicId: In(clinicIds),
      },
      relations: {
        capability: true,
      },
      order: {
        clinicId: 'ASC',
        capability: {
          type: 'ASC',
          sortOrder: 'ASC',
          id: 'ASC',
        },
      },
    });

    const groupedByClinic = new Map<number, ClinicCapabilityEntity[]>();
    for (const item of items) {
      const bucket = groupedByClinic.get(item.clinicId) ?? [];
      bucket.push(item);
      groupedByClinic.set(item.clinicId, bucket);
    }

    for (const clinicId of clinicIds) {
      result.set(
        clinicId,
        this.groupClinicCapabilities(groupedByClinic.get(clinicId) ?? []),
      );
    }

    return result;
  }

  async replaceClinicCapabilities(
    clinicId: number,
    items: UpsertClinicCapabilityItemDto[],
    adminUserId: string,
  ): Promise<GroupedClinicCapabilityResponse> {
    const clinic = await this.clinicRepository.findOne({
      where: {
        id: clinicId,
      },
    });

    if (!clinic) {
      throw new NotFoundException({
        code: RESPONSE_CODE.CLINIC_NOT_FOUND,
        message: '诊所不存在',
      });
    }

    const normalizedItems = items.map((item) => ({
      code: item.code.trim(),
      verificationStatus:
        item.verificationStatus ?? CapabilityVerificationStatus.Verified,
      note: item.note?.trim() || null,
    }));

    const codeSet = new Set<string>();
    for (const item of normalizedItems) {
      if (!item.code) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: '能力 code 不能为空',
        });
      }

      if (codeSet.has(item.code)) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: `能力 code 存在重复：${item.code}`,
        });
      }

      codeSet.add(item.code);
    }

    const definitions = normalizedItems.length
      ? await this.capabilityDefinitionRepository.find({
          where: {
            code: In(normalizedItems.map((item) => item.code)),
            isActive: 1,
          },
        })
      : [];
    const definitionMap = new Map(definitions.map((item) => [item.code, item]));

    for (const item of normalizedItems) {
      if (!definitionMap.has(item.code)) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: `未知或已停用的能力 code：${item.code}`,
        });
      }
    }

    await this.clinicCapabilityRepository.manager.transaction(
      async (manager) => {
        const clinicCapabilityRepository = manager.getRepository(
          ClinicCapabilityEntity,
        );
        const clinicRepository = manager.getRepository(ClinicEntity);

        const existingItems = await clinicCapabilityRepository.find({
          where: {
            clinicId,
          },
        });

        const desiredCodes = new Set(normalizedItems.map((item) => item.code));
        const deleteIds = existingItems
          .filter((item) => {
            const definition = definitions.find(
              (definitionItem) => definitionItem.id === item.capabilityId,
            );

            return definition ? !desiredCodes.has(definition.code) : true;
          })
          .map((item) => item.id);

        if (deleteIds.length > 0) {
          await clinicCapabilityRepository.delete(deleteIds);
        }

        for (const item of normalizedItems) {
          const definition = definitionMap.get(item.code)!;
          const existing = existingItems.find(
            (capability) => capability.capabilityId === definition.id,
          );
          const entity =
            existing ??
            clinicCapabilityRepository.create({
              clinicId,
              capabilityId: definition.id,
            });

          entity.sourceType = CapabilitySourceType.AdminManual;
          entity.verificationStatus = item.verificationStatus;
          entity.confidenceScore =
            item.verificationStatus === CapabilityVerificationStatus.Verified
              ? 1
              : 0.6;
          entity.note = item.note;
          entity.evidencePhotosJson = [];
          entity.verifiedAt =
            item.verificationStatus === CapabilityVerificationStatus.Verified
              ? new Date()
              : null;
          entity.verifiedBy =
            item.verificationStatus === CapabilityVerificationStatus.Verified
              ? adminUserId
              : null;
          await clinicCapabilityRepository.save(entity);
        }

        clinic.capabilityProfileStatus =
          normalizedItems.length > 0
            ? CapabilityProfileStatus.Verified
            : CapabilityProfileStatus.Empty;
        await clinicRepository.save(clinic);
      },
    );

    await this.clinicCacheService.invalidateAfterReview(clinicId);
    return this.getClinicCapabilities(clinicId);
  }

  async validateSubmissionCapabilities(input: {
    services?: string[];
    specialties?: string[];
    equipment?: string[];
    facilities?: string[];
    speciesSupported?: string[];
    capabilityNotes?: string | null;
  }): Promise<NormalizedSubmissionCapabilities> {
    const normalized: NormalizedSubmissionCapabilities = {
      services: this.normalizeCodeList(input.services),
      specialties: this.normalizeCodeList(input.specialties),
      equipment: this.normalizeCodeList(input.equipment),
      facilities: this.normalizeCodeList(input.facilities),
      speciesSupported: this.normalizeCodeList(input.speciesSupported),
      capabilityNotes: this.toNullableString(input.capabilityNotes),
    };

    const allCodes = [
      ...normalized.services,
      ...normalized.specialties,
      ...normalized.equipment,
      ...normalized.facilities,
      ...normalized.speciesSupported,
    ];

    if (allCodes.length === 0) {
      return normalized;
    }

    const definitions = await this.capabilityDefinitionRepository.find({
      where: {
        code: In(allCodes),
        isActive: 1,
      },
    });
    const definitionMap = new Map(definitions.map((item) => [item.code, item]));

    for (const code of allCodes) {
      const definition = definitionMap.get(code);
      if (!definition) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: `未知或已停用的能力 code：${code}`,
        });
      }
    }

    this.ensureGroupMatchesType('services', normalized.services, definitionMap);
    this.ensureGroupMatchesType(
      'specialties',
      normalized.specialties,
      definitionMap,
    );
    this.ensureGroupMatchesType(
      'equipment',
      normalized.equipment,
      definitionMap,
    );
    this.ensureGroupMatchesType(
      'facilities',
      normalized.facilities,
      definitionMap,
    );
    this.ensureGroupMatchesType(
      'speciesSupported',
      normalized.speciesSupported,
      definitionMap,
    );

    return normalized;
  }

  async buildSubmissionCapabilitySnapshot(input: {
    services?: string[];
    specialties?: string[];
    equipment?: string[];
    facilities?: string[];
    speciesSupported?: string[];
    capabilityNotes?: string | null;
  }): Promise<GroupedSubmissionCapabilitySnapshot> {
    const normalized = await this.validateSubmissionCapabilities(input);
    const allCodes = [
      ...normalized.services,
      ...normalized.specialties,
      ...normalized.equipment,
      ...normalized.facilities,
      ...normalized.speciesSupported,
    ];

    if (allCodes.length === 0) {
      return {
        services: [],
        specialties: [],
        equipment: [],
        facilities: [],
        speciesSupported: [],
        capabilityNotes: normalized.capabilityNotes,
      };
    }

    const definitions = await this.capabilityDefinitionRepository.find({
      where: {
        code: In(allCodes),
      },
      order: {
        type: 'ASC',
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });
    const grouped = this.groupDefinitions(definitions);

    const sortByCodes = (
      items: CapabilityDefinitionItem[],
      codes: string[],
    ) => {
      const codeOrder = new Map(codes.map((code, index) => [code, index]));
      return [...items].sort(
        (left, right) =>
          (codeOrder.get(left.code) ?? Number.MAX_SAFE_INTEGER) -
          (codeOrder.get(right.code) ?? Number.MAX_SAFE_INTEGER),
      );
    };

    return {
      services: sortByCodes(grouped.services, normalized.services),
      specialties: sortByCodes(grouped.specialties, normalized.specialties),
      equipment: sortByCodes(grouped.equipment, normalized.equipment),
      facilities: sortByCodes(grouped.facilities, normalized.facilities),
      speciesSupported: sortByCodes(
        grouped.speciesSupported,
        normalized.speciesSupported,
      ),
      capabilityNotes: normalized.capabilityNotes,
    };
  }

  async applySubmissionToClinicProfile(
    manager: EntityManager,
    clinic: ClinicEntity,
    submission: ClinicSubmissionEntity,
    adminUserId: string | null,
    reviewNote?: string | null,
  ): Promise<void> {
    const normalized = await this.validateSubmissionCapabilities({
      services: submission.servicesJson,
      specialties: submission.specialtiesJson,
      equipment: submission.equipmentJson,
      facilities: submission.facilitiesJson,
      speciesSupported: submission.speciesSupportedJson,
      capabilityNotes: submission.capabilityNotes ?? reviewNote ?? null,
    });
    const allCodes = [
      ...normalized.services,
      ...normalized.specialties,
      ...normalized.equipment,
      ...normalized.facilities,
      ...normalized.speciesSupported,
    ];
    const definitionRepository = manager.getRepository(
      CapabilityDefinitionEntity,
    );
    const clinicCapabilityRepository = manager.getRepository(
      ClinicCapabilityEntity,
    );
    const clinicRepository = manager.getRepository(ClinicEntity);

    if (submission.photosJson.length > 0) {
      if (!clinic.coverPhotoUrl) {
        clinic.coverPhotoUrl = submission.photosJson[0];
      }

      if (
        !Array.isArray(clinic.galleryPhotosJson) ||
        clinic.galleryPhotosJson.length === 0
      ) {
        clinic.galleryPhotosJson = [...submission.photosJson];
      }
    }

    if (submission.address?.trim()) {
      clinic.address = submission.address.trim();
    }
    if (submission.city?.trim()) {
      clinic.city = submission.city.trim();
    }
    if (submission.district !== undefined) {
      clinic.district = this.toNullableString(submission.district);
    }
    if (submission.phone !== undefined) {
      clinic.phone = this.toNullableString(submission.phone);
    }
    if (submission.businessHours !== undefined) {
      clinic.businessHours = this.toNullableString(submission.businessHours);
    }

    if (allCodes.length === 0) {
      clinic.capabilityProfileStatus =
        clinic.capabilityProfileStatus === CapabilityProfileStatus.Empty
          ? CapabilityProfileStatus.Pending
          : clinic.capabilityProfileStatus;
      await clinicRepository.save(clinic);
      return;
    }

    const definitions = await definitionRepository.find({
      where: {
        code: In(allCodes),
      },
    });
    const definitionMap = new Map(definitions.map((item) => [item.code, item]));
    const existingItems = await clinicCapabilityRepository.find({
      where: {
        clinicId: clinic.id,
      },
    });
    const existingByCapabilityId = new Map(
      existingItems.map((item) => [item.capabilityId, item]),
    );

    for (const code of allCodes) {
      const definition = definitionMap.get(code);
      if (!definition) {
        continue;
      }

      const existing = existingByCapabilityId.get(definition.id);
      const entity =
        existing ??
        clinicCapabilityRepository.create({
          clinicId: clinic.id,
          capabilityId: definition.id,
        });

      entity.sourceType =
        existing?.sourceType === CapabilitySourceType.AdminManual
          ? CapabilitySourceType.AdminManual
          : CapabilitySourceType.UserSubmission;
      entity.verificationStatus = CapabilityVerificationStatus.Verified;
      entity.confidenceScore = Math.max(existing?.confidenceScore ?? 0, 0.9);
      entity.note = this.mergeNotes(
        existing?.note ?? null,
        this.toNullableString(submission.capabilityNotes) ??
          this.toNullableString(reviewNote),
      );
      entity.evidencePhotosJson =
        submission.photosJson.length > 0
          ? [
              ...new Set([
                ...(existing?.evidencePhotosJson ?? []),
                ...submission.photosJson,
              ]),
            ]
          : (existing?.evidencePhotosJson ?? []);
      entity.verifiedAt = new Date();
      entity.verifiedBy = adminUserId;

      await clinicCapabilityRepository.save(entity);
    }

    clinic.capabilityProfileStatus = CapabilityProfileStatus.Verified;
    await clinicRepository.save(clinic);
  }

  private groupDefinitions(
    definitions: CapabilityDefinitionEntity[],
  ): GroupedCapabilityDictionaryResponse {
    const grouped: GroupedCapabilityDictionaryResponse = {
      services: [],
      specialties: [],
      equipment: [],
      facilities: [],
      speciesSupported: [],
    };

    for (const item of definitions) {
      grouped[CAPABILITY_TYPE_TO_GROUP_KEY[item.type]].push(
        this.toDefinitionItem(item),
      );
    }

    return grouped;
  }

  private groupClinicCapabilities(
    items: ClinicCapabilityEntity[],
  ): GroupedClinicCapabilityResponse {
    const grouped: GroupedClinicCapabilityResponse = {
      services: [],
      specialties: [],
      equipment: [],
      facilities: [],
      speciesSupported: [],
      highlights: [],
    };

    for (const item of items) {
      if (!item.capability) {
        continue;
      }

      grouped[CAPABILITY_TYPE_TO_GROUP_KEY[item.capability.type]].push({
        id: item.id,
        code: item.capability.code,
        name: item.capability.name,
        type: item.capability.type,
        sourceType: item.sourceType,
        verificationStatus: item.verificationStatus,
        confidenceScore: item.confidenceScore,
        note: item.note,
      });
    }

    grouped.highlights = this.buildHighlights(grouped);
    return grouped;
  }

  private buildHighlights(
    grouped: Omit<GroupedClinicCapabilityResponse, 'highlights'>,
  ): string[] {
    const highlightCandidates = [
      grouped.specialties.find((item) => item.code === 'sp_cat')?.name,
      grouped.services.find((item) => item.code === 'srv_emergency')?.name,
      grouped.equipment.find((item) => item.code === 'eq_ultrasound')?.name,
      grouped.facilities.find((item) => item.code === 'fc_inpatient')?.name,
    ].filter((item): item is string => Boolean(item));

    return highlightCandidates.slice(0, 2);
  }

  private toDefinitionItem(
    item: CapabilityDefinitionEntity,
  ): CapabilityDefinitionItem {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      sortOrder: item.sortOrder,
      isActive: item.isActive === 1,
    };
  }

  private normalizeCodeList(items?: string[]) {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const rawItem of items ?? []) {
      const item = rawItem.trim();
      if (!item) {
        continue;
      }
      if (seen.has(item)) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: `能力 code 存在重复：${item}`,
        });
      }
      seen.add(item);
      result.push(item);
    }

    return result;
  }

  private ensureGroupMatchesType(
    groupKey: keyof Omit<GroupedClinicCapabilityResponse, 'highlights'>,
    codes: string[],
    definitionMap: Map<string, CapabilityDefinitionEntity>,
  ) {
    const expectedType = GROUP_KEY_TO_CAPABILITY_TYPE[groupKey];

    for (const code of codes) {
      const definition = definitionMap.get(code);

      if (definition && definition.type !== expectedType) {
        throw new BadRequestException({
          code: RESPONSE_CODE.PARAM_INVALID,
          message: `能力 code ${code} 不属于 ${groupKey} 分组`,
        });
      }
    }
  }

  private toNullableString(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private mergeNotes(existing: string | null, incoming: string | null) {
    if (existing && incoming && existing !== incoming) {
      return `${existing}\n${incoming}`.slice(0, 500);
    }

    return incoming ?? existing;
  }
}
