export const numericTransformer = {
  to(value?: number | null): number | null {
    return value ?? null;
  },
  from(value?: string | number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return typeof value === 'number' ? value : Number(value);
  },
};
