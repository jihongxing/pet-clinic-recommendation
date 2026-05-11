import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ClaimStatus } from './database.enums';
import { ClinicEntity } from './clinic.entity';

@Entity({ name: 'clinic_claim_request' })
@Index('idx_clinic_claim_request_clinic_status', ['clinicId', 'status'])
@Index('idx_clinic_claim_request_created_at', ['createdAt'])
export class ClinicClaimRequestEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'applicant_name', type: 'varchar', length: 100 })
  applicantName!: string;

  @Column({ name: 'applicant_phone', type: 'varchar', length: 30 })
  applicantPhone!: string;

  @Column({ name: 'proof_material', type: 'text', nullable: true })
  proofMaterial!: string | null;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    enumName: 'claim_status',
    default: ClaimStatus.Pending,
  })
  status!: ClaimStatus;

  @Column({ name: 'reviewed_by', type: 'bigint', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => ClinicEntity, (clinic) => clinic.clinicClaimRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: ClinicEntity;
}
