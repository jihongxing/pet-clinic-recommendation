export enum TagLayer {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
}

export enum TagType {
  Positive = 'positive',
  Negative = 'negative',
}

export enum TagSource {
  Order = 'order',
  Normal = 'normal',
  System = 'system',
}

export enum EmotionType {
  Satisfied = 'satisfied',
  Neutral = 'neutral',
  Unsatisfied = 'unsatisfied',
}

export enum ClinicTagStatus {
  New = 'new',
  Verified = 'verified',
  Stable = 'stable',
  Expired = 'expired',
}

export enum OrderStatus {
  Clicked = 'clicked',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export enum ContactType {
  Phone = 'phone',
  Wechat = 'wechat',
}

export enum ReviewSource {
  Order = 'order',
  Normal = 'normal',
}

export enum ReviewStatus {
  Submitted = 'submitted',
  Hidden = 'hidden',
}

export enum ResponseStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum ClaimStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum AbnormalStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Ignored = 'ignored',
}
