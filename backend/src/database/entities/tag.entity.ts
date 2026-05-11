import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClinicTagResponseEntity } from './clinic-tag-response.entity';
import { ClinicTagStatEntity } from './clinic-tag-stat.entity';
import { TagLayer, TagType } from './database.enums';
import { TagLifecycleLogEntity } from './tag-lifecycle-log.entity';
import { UserTagLogEntity } from './user-tag-log.entity';
import { numericTransformer } from './column.transformer';

@Entity({ name: 'tag' })
@Unique('uk_tag_name', ['name'])
@Index('idx_tag_layer_category', ['layer', 'category'])
@Index('idx_tag_is_user_select', ['isUserSelect'])
export class TagEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'enum', enum: TagLayer, enumName: 'tag_layer' })
  layer!: TagLayer;

  @Column({ type: 'varchar', length: 20 })
  category!: string;

  @Column({
    type: 'enum',
    enum: TagType,
    enumName: 'tag_type',
    default: TagType.Positive,
  })
  type!: TagType;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 1,
    transformer: numericTransformer,
  })
  weight!: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_user_select', type: 'smallint', default: 1 })
  isUserSelect!: number;

  @Column({ name: 'is_display', type: 'smallint', default: 1 })
  isDisplay!: number;

  @Column({ type: 'smallint', default: 1 })
  status!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToMany(() => UserTagLogEntity, (userTagLog) => userTagLog.tag)
  userTagLogs!: UserTagLogEntity[];

  @OneToMany(() => ClinicTagStatEntity, (clinicTagStat) => clinicTagStat.tag)
  clinicTagStats!: ClinicTagStatEntity[];

  @OneToMany(
    () => TagLifecycleLogEntity,
    (tagLifecycleLog) => tagLifecycleLog.tag,
  )
  tagLifecycleLogs!: TagLifecycleLogEntity[];

  @OneToMany(
    () => ClinicTagResponseEntity,
    (clinicTagResponse) => clinicTagResponse.tag,
  )
  clinicTagResponses!: ClinicTagResponseEntity[];
}
