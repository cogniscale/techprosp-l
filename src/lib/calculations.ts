import { addMonths, startOfMonth, format } from "date-fns";
import type { CogniScaleActivity, CogniScaleFeeConfig } from "@/types";

/**
 * Calculate revenue spread across multiple months
 */
export function calculateRevenueSpread(
  totalValue: number,
  invoiceDate: Date,
  monthsToSpread: number
): Array<{ month: string; amount: number }> {
  const monthlyAmount = totalValue / monthsToSpread;
  const result: Array<{ month: string; amount: number }> = [];

  for (let i = 0; i < monthsToSpread; i++) {
    const month = startOfMonth(addMonths(invoiceDate, i));
    result.push({
      month: format(month, "yyyy-MM-dd"),
      amount: Math.round(monthlyAmount * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate CogniScale fees from activities
 */
export function calculateCogniScaleFees(
  activities: Pick<
    CogniScaleActivity,
    | "surveys_from_interviews"
    | "surveys_from_roundtables"
    | "surveys_from_clevel"
    | "clevel_meetings_completed"
  >,
  config: Pick<CogniScaleFeeConfig, "fixed_monthly_fee" | "survey_fee" | "meeting_fee">
): {
  fixed: number;
  surveys: number;
  meetings: number;
  total: number;
} {
  // Surveys from interviews and roundtables count as survey fees (£1,000 each)
  const surveyCount =
    activities.surveys_from_interviews + activities.surveys_from_roundtables;

  // C-level meetings AND surveys from C-level count as meeting fees (£700 each)
  const meetingCount =
    activities.clevel_meetings_completed + activities.surveys_from_clevel;

  const surveys = surveyCount * config.survey_fee;
  const meetings = meetingCount * config.meeting_fee;

  return {
    fixed: config.fixed_monthly_fee,
    surveys,
    meetings,
    total: config.fixed_monthly_fee + surveys + meetings,
  };
}

/**
 * Calculate profit pool and Taryn's share
 */
export function calculateProfitPool(
  totalRevenue: number,
  totalCosts: number,
  centralOverhead: number = 4200,
  tarynSharePercent: number = 12
): {
  grossProfit: number;
  profitPool: number;
  tarynShare: number;
} {
  const grossProfit = totalRevenue - totalCosts;
  const profitPool = Math.max(0, grossProfit - centralOverhead);
  const tarynShare = profitPool * (tarynSharePercent / 100);

  return {
    grossProfit: Math.round(grossProfit * 100) / 100,
    profitPool: Math.round(profitPool * 100) / 100,
    tarynShare: Math.round(tarynShare * 100) / 100,
  };
}

/**
 * Calculate total HR costs including bonus
 */
export function calculateHRCosts(
  baseCosts: number,
  bonusPercentage: number = 10
): number {
  return baseCosts * (1 + bonusPercentage / 100);
}

/**
 * Default fee configuration
 */
export const DEFAULT_FEE_CONFIG: CogniScaleFeeConfig = {
  id: "default",
  effective_from: "2026-01-01",
  effective_to: null,
  fixed_monthly_fee: 4236,
  survey_fee: 1000,
  meeting_fee: 700,
  created_at: new Date().toISOString(),
};

/**
 * Default central overhead
 */
export const CENTRAL_OVERHEAD = 4200;

/**
 * Taryn's profit share percentage
 */
export const TARYN_SHARE_PERCENT = 12;
