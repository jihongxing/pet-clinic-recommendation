import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  ClinicTagStatus,
  OrderStatus,
  TagType,
} from '../../../database/entities';

interface EffectiveTagStatRow {
  tagId: number | string;
  category: string;
  type: TagType;
  count: number | string;
  uniqueUsers: number | string;
  tagWeight: number | string;
}

interface RiskTagStatRow {
  tagId: number | string;
  uniqueUsers: number | string;
  lastTaggedAt: Date | string | null;
  tagWeight: number | string;
}

interface RepeatCustomerRawRow {
  totalUsers: number | string;
  repeatUsers: number | string;
}

interface ReferralRawRow {
  referrerUserId: string;
  referralCount: number | string;
}

interface ActiveUserRawRow {
  totalUsers: number | string;
  activeUsers: number | string;
}

export interface ClinicScoreBreakdown {
  clinicId: number;
  trustScore: number;
  valueScore: number;
  experienceScore: number;
  socialScore: number;
  riskPenalty: number;
  confidenceFactor: number;
  finalScore: number;
  reputationScore: number;
  priceScore: number;
}

const SCORE_WEIGHTS = {
  final: {
    trust: 0.45,
    value: 0.25,
    experience: 0.15,
    social: 0.15,
  },
  reputation: {
    trust: 0.55,
    value: 0.2,
    experience: 0.15,
    social: 0.1,
  },
  price: {
    value: 0.4,
    trust: 0.35,
    experience: 0.15,
    social: 0.1,
  },
  riskPenaltyPerTag: 15,
} as const;

const BASE_SCORE = 60;
const CONFIDENCE_THRESHOLD = 20;

@Injectable()
export class ScoreCalculatorService {
  constructor(private readonly dataSource: DataSource) {}

  async calculateClinicScore(clinicId: number): Promise<ClinicScoreBreakdown> {
    const effectiveTagStats = await this.loadEffectiveCoreTagStats(clinicId);
    const totalEffectiveTagCount = effectiveTagStats.reduce(
      (sum, stat) => sum + this.getWeightedCount(stat),
      0,
    );

    const trustScore = this.calculateTrustScore(effectiveTagStats);
    const valueScore = await this.calculateValueScore(
      clinicId,
      effectiveTagStats,
      totalEffectiveTagCount,
    );
    const experienceScore = this.calculateExperienceScore(
      effectiveTagStats,
      totalEffectiveTagCount,
    );
    const socialScore = await this.calculateSocialScore(clinicId);
    const riskPenalty = await this.calculateRiskPenalty(clinicId);
    const confidenceFactor = this.roundToTwo(
      Math.min(1, totalEffectiveTagCount / CONFIDENCE_THRESHOLD),
    );

    const rawFinalScore =
      trustScore * SCORE_WEIGHTS.final.trust +
      valueScore * SCORE_WEIGHTS.final.value +
      experienceScore * SCORE_WEIGHTS.final.experience +
      socialScore * SCORE_WEIGHTS.final.social -
      riskPenalty;
    const rawReputationScore =
      trustScore * SCORE_WEIGHTS.reputation.trust +
      valueScore * SCORE_WEIGHTS.reputation.value +
      experienceScore * SCORE_WEIGHTS.reputation.experience +
      socialScore * SCORE_WEIGHTS.reputation.social -
      riskPenalty;
    const rawPriceScore =
      valueScore * SCORE_WEIGHTS.price.value +
      trustScore * SCORE_WEIGHTS.price.trust +
      experienceScore * SCORE_WEIGHTS.price.experience +
      socialScore * SCORE_WEIGHTS.price.social -
      riskPenalty;

    return {
      clinicId,
      trustScore,
      valueScore,
      experienceScore,
      socialScore,
      riskPenalty,
      confidenceFactor,
      finalScore: this.applyConfidence(rawFinalScore, confidenceFactor),
      reputationScore: this.applyConfidence(
        rawReputationScore,
        confidenceFactor,
      ),
      priceScore: this.applyConfidence(rawPriceScore, confidenceFactor),
    };
  }

  async persistClinicScore(clinicId: number): Promise<ClinicScoreBreakdown> {
    const score = await this.calculateClinicScore(clinicId);

    await this.dataSource.query(
      `
        UPDATE clinic
        SET
          trust_score = $1,
          value_score = $2,
          experience_score = $3,
          risk_penalty = $4,
          social_score = $5,
          reputation_score = $6,
          price_score = $7,
          confidence_factor = $8
        WHERE id = $9;
      `,
      [
        score.trustScore,
        score.valueScore,
        score.experienceScore,
        score.riskPenalty,
        score.socialScore,
        score.reputationScore,
        score.priceScore,
        score.confidenceFactor,
        clinicId,
      ],
    );

    return score;
  }

  private async loadEffectiveCoreTagStats(clinicId: number) {
    return this.dataSource.query<EffectiveTagStatRow[]>(
      `
        SELECT
          cts.tag_id AS "tagId",
          t.category,
          t.type,
          cts.count,
          cts.unique_users AS "uniqueUsers",
          t.weight AS "tagWeight"
        FROM clinic_tag_stat AS cts
        INNER JOIN tag AS t ON t.id = cts.tag_id
        WHERE cts.clinic_id = $1
          AND cts.count > 0
          AND cts.status IN ($2, $3)
          AND t.status = 1
          AND t.category IN ('trust', 'value', 'experience');
      `,
      [clinicId, ClinicTagStatus.Verified, ClinicTagStatus.Stable],
    );
  }

  private calculateTrustScore(tagStats: EffectiveTagStatRow[]) {
    const trustStats = tagStats.filter((stat) => stat.category === 'trust');
    const positiveWeight = trustStats
      .filter((stat) => stat.type === TagType.Positive)
      .reduce((sum, stat) => sum + this.getWeightedCount(stat), 0);
    const negativeWeight = trustStats
      .filter((stat) => stat.type === TagType.Negative)
      .reduce((sum, stat) => sum + this.getWeightedCount(stat), 0);
    const totalWeight = positiveWeight + negativeWeight;

    if (totalWeight <= 0) {
      return 0;
    }

    return this.roundToTwo(
      ((positiveWeight - negativeWeight) / totalWeight) * 100,
    );
  }

  private async calculateValueScore(
    clinicId: number,
    tagStats: EffectiveTagStatRow[],
    totalEffectiveTagCount: number,
  ) {
    if (totalEffectiveTagCount <= 0) {
      return 0;
    }

    const totalValueWeight = tagStats
      .filter((stat) => stat.category === 'value')
      .reduce((sum, stat) => sum + this.getWeightedCount(stat), 0);
    const uniqueUsers = await this.loadDistinctUserCountByCategory(
      clinicId,
      'value',
    );
    const independenceFactor = Math.min(1, uniqueUsers / 5);

    return this.roundToTwo(
      (totalValueWeight / totalEffectiveTagCount) * independenceFactor * 100,
    );
  }

  private calculateExperienceScore(
    tagStats: EffectiveTagStatRow[],
    totalEffectiveTagCount: number,
  ) {
    if (totalEffectiveTagCount <= 0) {
      return 0;
    }

    const totalExperienceWeight = tagStats
      .filter((stat) => stat.category === 'experience')
      .reduce((sum, stat) => sum + this.getWeightedCount(stat), 0);

    return this.roundToTwo(
      (totalExperienceWeight / totalEffectiveTagCount) * 100,
    );
  }

  private async calculateSocialScore(clinicId: number) {
    const [repeatRate, recommendFactor, activeRate] = await Promise.all([
      this.loadRepeatCustomerRate(clinicId),
      this.loadRecommendationFactor(clinicId),
      this.loadActiveUserRate(clinicId),
    ]);

    return this.roundToTwo(
      (repeatRate * 0.5 + recommendFactor * 0.3 + activeRate * 0.2) * 100,
    );
  }

  private async calculateRiskPenalty(clinicId: number) {
    const riskStats = await this.dataSource.query<RiskTagStatRow[]>(
      `
        SELECT
          cts.tag_id AS "tagId",
          cts.unique_users AS "uniqueUsers",
          cts.last_tagged_at AS "lastTaggedAt",
          t.weight AS "tagWeight"
        FROM clinic_tag_stat AS cts
        INNER JOIN tag AS t ON t.id = cts.tag_id
        WHERE cts.clinic_id = $1
          AND cts.count > 0
          AND t.status = 1
          AND t.category = 'risk';
      `,
      [clinicId],
    );

    const totalPenalty = riskStats.reduce((sum, stat) => {
      const uniqueUsers = Number(stat.uniqueUsers);

      if (uniqueUsers < 2) {
        return sum;
      }

      const independenceFactor = Math.min(1, uniqueUsers / 3);
      const timeFactor = this.resolveTimeDecayFactor(stat.lastTaggedAt);
      const tagWeight = Number(stat.tagWeight ?? 1);

      return (
        sum +
        SCORE_WEIGHTS.riskPenaltyPerTag *
          timeFactor *
          independenceFactor *
          tagWeight
      );
    }, 0);

    return this.roundToTwo(totalPenalty);
  }

  private async loadDistinctUserCountByCategory(
    clinicId: number,
    category: string,
  ) {
    const rows = await this.dataSource.query<
      { uniqueUsers: number | string }[]
    >(
      `
        SELECT COUNT(DISTINCT utl.user_id)::int AS "uniqueUsers"
        FROM user_tag_log AS utl
        INNER JOIN tag AS t ON t.id = utl.tag_id
        WHERE utl.clinic_id = $1
          AND t.status = 1
          AND t.category = $2;
      `,
      [clinicId, category],
    );

    return Number(rows[0]?.uniqueUsers ?? 0);
  }

  private async loadRepeatCustomerRate(clinicId: number) {
    const rows = await this.dataSource.query<RepeatCustomerRawRow[]>(
      `
        SELECT
          COUNT(*)::int AS "totalUsers",
          COUNT(*) FILTER (WHERE order_count > 1)::int AS "repeatUsers"
        FROM (
          SELECT user_id, COUNT(*)::int AS order_count
          FROM "order"
          WHERE clinic_id = $1
            AND status = $2
          GROUP BY user_id
        ) AS order_summary;
      `,
      [clinicId, OrderStatus.Confirmed],
    );
    const totalUsers = Number(rows[0]?.totalUsers ?? 0);
    const repeatUsers = Number(rows[0]?.repeatUsers ?? 0);

    if (totalUsers <= 0) {
      return 0;
    }

    return repeatUsers / totalUsers;
  }

  private async loadRecommendationFactor(clinicId: number) {
    const rows = await this.dataSource.query<ReferralRawRow[]>(
      `
        SELECT
          referrer_user_id AS "referrerUserId",
          COUNT(*)::int AS "referralCount"
        FROM user_referral
        WHERE clinic_id = $1
        GROUP BY referrer_user_id;
      `,
      [clinicId],
    );

    const weightedReferralCount = rows.reduce((sum, row) => {
      const referralCount = Number(row.referralCount);

      if (referralCount <= 0) {
        return sum;
      }

      if (referralCount === 1) {
        return sum + 1;
      }

      if (referralCount === 2) {
        return sum + 1.5;
      }

      return sum + 1.5 + (referralCount - 2) * 0.2;
    }, 0);

    return Math.min(1, weightedReferralCount / 20);
  }

  private async loadActiveUserRate(clinicId: number) {
    const rows = await this.dataSource.query<ActiveUserRawRow[]>(
      `
        SELECT
          COUNT(DISTINCT utl.user_id)::int AS "totalUsers",
          COUNT(DISTINCT CASE
            WHEN utl.created_at >= NOW() - INTERVAL '30 days' THEN utl.user_id
          END)::int AS "activeUsers"
        FROM user_tag_log AS utl
        WHERE utl.clinic_id = $1;
      `,
      [clinicId],
    );
    const totalUsers = Number(rows[0]?.totalUsers ?? 0);
    const activeUsers = Number(rows[0]?.activeUsers ?? 0);

    if (totalUsers <= 0) {
      return 0;
    }

    return activeUsers / totalUsers;
  }

  private resolveTimeDecayFactor(lastTaggedAt: Date | string | null) {
    const date = this.toDate(lastTaggedAt);

    if (!date) {
      return 0.2;
    }

    const diffInDays = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)),
    );

    if (diffInDays <= 30) {
      return 1;
    }

    if (diffInDays <= 60) {
      return 0.7;
    }

    if (diffInDays <= 90) {
      return 0.4;
    }

    return 0.2;
  }

  private getWeightedCount(stat: EffectiveTagStatRow) {
    return Number(stat.count) * Number(stat.tagWeight ?? 1);
  }

  private applyConfidence(rawScore: number, confidenceFactor: number) {
    return this.roundToTwo(
      rawScore * confidenceFactor + BASE_SCORE * (1 - confidenceFactor),
    );
  }

  private roundToTwo(value: number) {
    return Math.round(value * 100) / 100;
  }

  private toDate(value: Date | string | null) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
