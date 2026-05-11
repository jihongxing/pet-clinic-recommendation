import { BadRequestException, ValidationError } from '@nestjs/common';

import { RESPONSE_CODE } from '../constants/response-code.constants';

function flattenValidationMessages(errors: ValidationError[]) {
  return errors.flatMap((error) => {
    const currentMessages = error.constraints
      ? Object.values(error.constraints)
      : [];
    const childrenMessages = error.children?.length
      ? flattenValidationMessages(error.children)
      : [];

    return [...currentMessages, ...childrenMessages];
  });
}

function resolveValidationCode(messages: string[]) {
  if (messages.some((message) => message.includes('should not be empty'))) {
    return RESPONSE_CODE.PARAM_MISSING;
  }

  if (messages.length > 0) {
    return RESPONSE_CODE.PARAM_FORMAT_INVALID;
  }

  return RESPONSE_CODE.PARAM_INVALID;
}

export function validationExceptionFactory(errors: ValidationError[]) {
  const messages = flattenValidationMessages(errors);
  const message = messages[0] ?? '参数错误';

  throw new BadRequestException({
    code: resolveValidationCode(messages),
    message,
    data: null,
  });
}
