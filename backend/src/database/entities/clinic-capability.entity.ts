import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  CapabilitySourceType,
  CapabilityVerificationStatus,
} from './database.enums';
import { CapabilityDefinitionEntity } from './capability-definition.entity';
import { ClinicEntity } from './clinic.entity';
import { numericTransformer } from './column.transformer';

@Entity({ name: 'clinic_capability' })
@Index('uk_clinic_capability_clinic_capability', ['clinicId', 'capabilityId'], {
  unique: true,
})
@Index('idx_clinic_capability_clinic_status', [
  'clinicId',
  'verificationStatus',
  'capabilityId',
])
@Index('idx_clinic_capability_capability_status', [
  'capabilityId',
  'verificationStatus',
  'clinicId',
])
export class ClinicCapabilityEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'capability_id', type: 'integer' })
  capabilityId!: number;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: CapabilitySourceType,
    enumName: 'capability_source_type',
  })
  sourceType!: CapabilitySourceType;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: CapabilityVerificationStatus,
    enumName: 'capability_verification_status',
  })
  verificationStatus!: CapabilityVerificationStatus;

  @Column({
    name: 'confidence_score',
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 1,
    transformer: numericTransformer,
  })
  confidenceScore!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({
    name: 'evidence_photos_json',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  evidencePhotosJson!: string[];

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'verified_by', type: 'bigint', nullable: true })
  verifiedBy!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.clinicCapabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;

  @ManyToOne(
    () => CapabilityDefinitionEntity,
    (capabilityDefinition) => capabilityDefinition.clinicCapabilities,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'capability_id' })
  capability!: CapabilityDefinitionEntity;
}
