import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CapabilityType } from './database.enums';
import { ClinicCapabilityEntity } from './clinic-capability.entity';

@Entity({ name: 'capability_definition' })
@Index('uk_capability_definition_code', ['code'], { unique: true })
@Index('idx_capability_definition_type_active_sort', [
  'type',
  'isActive',
  'sortOrder',
])
export class CapabilityDefinitionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({
    type: 'enum',
    enum: CapabilityType,
    enumName: 'capability_type',
  })
  type!: CapabilityType;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'smallint', default: 1 })
  isActive!: number;

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

  @OneToMany(
    () => ClinicCapabilityEntity,
    (clinicCapability) => clinicCapability.capability,
  )
  clinicCapabilities!: ClinicCapabilityEntity[];
}
