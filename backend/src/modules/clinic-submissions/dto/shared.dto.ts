import { Transform } from 'class-transformer';

export function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (error) {
      return [value];
    }
  }

  return value;
}

export function toCodeArray(value: unknown) {
  const arrayValue = toStringArray(value);

  if (!Array.isArray(arrayValue)) {
    return arrayValue;
  }

  return arrayValue
    .map((item) =>
      typeof item === 'string' ? item.trim() : String(item ?? '').trim(),
    )
    .filter(Boolean);
}

export const ToNumber = () => Transform(({ value }) => toNumber(value));
export const ToStringArray = () =>
  Transform(({ value }) => toStringArray(value));
export const ToCodeArray = () => Transform(({ value }) => toCodeArray(value));
