import { Transform } from 'class-transformer';

export function toCapabilityCodeArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export const ToCapabilityCodeArray = () =>
  Transform(({ value }) => toCapabilityCodeArray(value));
