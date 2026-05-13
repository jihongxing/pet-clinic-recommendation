import { PartialType } from '@nestjs/swagger';

import { CreateCapabilityDefinitionDto } from './create-capability-definition.dto';

export class UpdateCapabilityDefinitionDto extends PartialType(
  CreateCapabilityDefinitionDto,
) {}
