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
import { UserEntity } from './user.entity';

@Entity({ name: 'clinic_claim_request' })
@Index('idx_clinic_claim_request_clinic_status', ['clinicId', 'status'])
@Index('idx_clinic_claim_request_created_at', ['createdAt'])
@Index('idx_clinic_claim_request_submitter_user', ['submitterUserId'])
export class ClinicClaimRequestEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'clinic_id', type: 'integer' })
  clinicId!: number;

  @Column({ name: 'submitter_user_id', type: 'bigint', nullable: true })
  submitterUserId!: string | null;

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

  @Column({ name: 'review_note', type: 'varchar', length: 500, nullable: true })
  reviewNote!: string | null;

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

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'submitter_user_id' })
  submitterUser!: UserEntity | null;
}
