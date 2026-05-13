import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  CapabilityDefinitionEntity,
  CapabilityType,
  CapabilityVerificationStatus,
  ClinicCapabilityEntity,
  ClinicEntity,
} from '../../../database/entities';
import { ClinicCapabilityProfileService } from './clinic-capability-profile.service';
import { ClinicCacheService } from './clinic-cache.service';

describe('ClinicCapabilityProfileService', () => {
  let service: ClinicCapabilityProfileService;
  let capabilityDefinitionRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let clinicCapabilityRepository: {
    find: jest.Mock;
    count: jest.Mock;
  };
  let clinicRepository: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    capabilityDefinitionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    clinicCapabilityRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };
    clinicRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicCapabilityProfileService,
        {
          provide: getRepositoryToken(CapabilityDefinitionEntity),
          useValue: capabilityDefinitionRepository,
        },
        {
          provide: getRepositoryToken(ClinicCapabilityEntity),
          useValue: clinicCapabilityRepository,
        },
        {
          provide: getRepositoryToken(ClinicEntity),
          useValue: clinicRepository,
        },
        {
          provide: ClinicCacheService,
          useValue: {
            invalidateAfterReview: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ClinicCapabilityProfileService);
  });

  it('groups active capability definitions by type', async () => {
    capabilityDefinitionRepository.find.mockResolvedValue([
      {
        id: 1,
        code: 'srv_outpatient',
        name: '常规门诊',
        type: CapabilityType.Service,
        sortOrder: 1,
        isActive: 1,
      } as CapabilityDefinitionEntity,
      {
        id: 2,
        code: 'sp_cat',
        name: '猫专科',
        type: CapabilityType.Specialty,
        sortOrder: 1,
        isActive: 1,
      } as CapabilityDefinitionEntity,
    ]);

    await expect(service.getCapabilityDefinitions()).resolves.toEqual({
      services: [
        {
          id: 1,
          code: 'srv_outpatient',
          name: '常规门诊',
          type: CapabilityType.Service,
          sortOrder: 1,
          isActive: true,
        },
      ],
      specialties: [
        {
          id: 2,
          code: 'sp_cat',
          name: '猫专科',
          type: CapabilityType.Specialty,
          sortOrder: 1,
          isActive: true,
        },
      ],
      equipment: [],
      facilities: [],
      speciesSupported: [],
    });
  });

  it('rejects capability code when the selected group does not match dictionary type', async () => {
    capabilityDefinitionRepository.find.mockResolvedValue([
      {
        id: 15,
        code: 'eq_ultrasound',
        name: 'B超',
        type: CapabilityType.Equipment,
        sortOrder: 1,
        isActive: 1,
      } as CapabilityDefinitionEntity,
    ]);

    await expect(
      service.validateSubmissionCapabilities({
        specialties: ['eq_ultrasound'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('groups clinic capability items and generates high-value highlights', async () => {
    clinicRepository.findOne.mockResolvedValue({
      id: 9,
    } as ClinicEntity);
    clinicCapabilityRepository.find.mockResolvedValue([
      {
        id: 1,
        clinicId: 9,
        capabilityId: 8,
        sourceType: 'user_submission',
        verificationStatus: CapabilityVerificationStatus.Verified,
        confidenceScore: 0.9,
        note: null,
        capability: {
          id: 8,
          code: 'sp_cat',
          name: '猫专科',
          type: CapabilityType.Specialty,
          sortOrder: 1,
          isActive: 1,
        } as CapabilityDefinitionEntity,
      } as ClinicCapabilityEntity,
      {
        id: 2,
        clinicId: 9,
        capabilityId: 15,
        sourceType: 'admin_manual',
        verificationStatus: CapabilityVerificationStatus.Verified,
        confidenceScore: 1,
        note: '后台核验',
        capability: {
          id: 15,
          code: 'eq_ultrasound',
          name: 'B超',
          type: CapabilityType.Equipment,
          sortOrder: 1,
          isActive: 1,
        } as CapabilityDefinitionEntity,
      } as ClinicCapabilityEntity,
    ]);

    await expect(service.getClinicCapabilities(9)).resolves.toEqual({
      services: [],
      specialties: [
        {
          id: 1,
          code: 'sp_cat',
          name: '猫专科',
          type: CapabilityType.Specialty,
          sourceType: 'user_submission',
          verificationStatus: CapabilityVerificationStatus.Verified,
          confidenceScore: 0.9,
          note: null,
        },
      ],
      equipment: [
        {
          id: 2,
          code: 'eq_ultrasound',
          name: 'B超',
          type: CapabilityType.Equipment,
          sourceType: 'admin_manual',
          verificationStatus: CapabilityVerificationStatus.Verified,
          confidenceScore: 1,
          note: '后台核验',
        },
      ],
      facilities: [],
      speciesSupported: [],
      highlights: ['猫专科', 'B超'],
    });
  });
});
