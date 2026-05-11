import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ReviewExtraTagLogEntity } from './review-extra-tag-log.entity';
import { numericTransformer } from './column.transformer';

@Entity({ name: 'extra_tag_option' })
@Unique('uk_extra_tag_option_name', ['name'])
export class ExtraTagOptionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0.3,
    transformer: numericTransformer,
  })
  weight!: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ type: 'smallint', default: 1 })
  status!: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToMany(
    () => ReviewExtraTagLogEntity,
    (reviewExtraTagLog) => reviewExtraTagLog.extraTagOption,
  )
  reviewExtraTagLogs!: ReviewExtraTagLogEntity[];
}
