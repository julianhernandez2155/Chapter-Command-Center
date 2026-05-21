import type { Tier } from "@/src/types";

export type TierConfig = {
  goldAttendanceMinPct: number;
  garnetAttendanceMinPct: number;
  goldFormMinPct: number;
  garnetFormMinPct: number;
  goldScoreMin: number;
  garnetScoreMin: number;
  whiteScoreMin: number;
  duesRequiredAmount: number;
  lateAttendanceWeight: number;
  dimensionWeights: Record<string, number>;
};

export type TierInput = {
  mandatoryEvents: number;
  onTimeMandatory: number;
  lateMandatory: number;
  unexcusedAbsences: number;
  formsAssigned: number;
  formsCompleted: number;
  duesPaid: number;
  isOfficer: boolean;
  gpa?: number | null;
};

export type TierResult = {
  tier: Tier;
  scoreBasedTier: Tier;
  weightedScore: number;
  reasons: string[];
  breakdown: Record<string, { raw: number | null; score: number; weight: number; note: string }>;
};

function pct(numerator: number, denominator: number) {
  return denominator <= 0 ? null : numerator / denominator;
}

function scoreToTier(score: number, config: TierConfig): Tier {
  if (score >= config.goldScoreMin) return "gold";
  if (score >= config.garnetScoreMin) return "garnet";
  if (score >= config.whiteScoreMin) return "white";
  return "ineligible";
}

export function calculateTier(input: TierInput, config: TierConfig): TierResult {
  const reasons: string[] = [];
  const weightedDimensions: Array<{ key: string; raw: number | null; score: number; weight: number; note: string }> = [];

  const attendanceRaw = pct(
    input.onTimeMandatory + input.lateMandatory * config.lateAttendanceWeight,
    input.mandatoryEvents,
  );
  if (attendanceRaw !== null) {
    weightedDimensions.push({
      key: "mandatory_attendance",
      raw: attendanceRaw,
      score: Math.min(100, attendanceRaw * 100),
      weight: config.dimensionWeights.mandatory_attendance ?? 0,
      note: `${Math.round(attendanceRaw * 100)}% mandatory attendance credit`,
    });
  }

  const formsRaw = pct(input.formsCompleted, input.formsAssigned);
  if (formsRaw !== null) {
    weightedDimensions.push({
      key: "forms",
      raw: formsRaw,
      score: Math.min(100, formsRaw * 100),
      weight: config.dimensionWeights.forms ?? 0,
      note: `${input.formsCompleted}/${input.formsAssigned} mandatory forms complete`,
    });
  }

  weightedDimensions.push({
    key: "dues",
    raw: input.duesPaid,
    score: input.duesPaid >= config.duesRequiredAmount ? 100 : Math.max(0, (input.duesPaid / config.duesRequiredAmount) * 100),
    weight: config.dimensionWeights.dues ?? 0,
    note: `$${input.duesPaid} of $${config.duesRequiredAmount} paid`,
  });

  weightedDimensions.push({
    key: "officer_bonus",
    raw: input.isOfficer ? 1 : 0,
    score: input.isOfficer ? 100 : 0,
    weight: config.dimensionWeights.officer_bonus ?? 0,
    note: input.isOfficer ? "Officer responsibility credit" : "No officer bonus",
  });

  if (typeof input.gpa === "number") {
    weightedDimensions.push({
      key: "gpa",
      raw: input.gpa,
      score: Math.min(100, Math.max(0, (input.gpa / 4) * 100)),
      weight: config.dimensionWeights.gpa ?? 0,
      note: `${input.gpa.toFixed(2)} GPA`,
    });
  }

  const activeWeight = weightedDimensions.reduce((sum, dimension) => sum + dimension.weight, 0) || 1;
  const weightedScore = Math.round(
    weightedDimensions.reduce((sum, dimension) => sum + dimension.score * (dimension.weight / activeWeight), 0),
  );
  const scoreBasedTier = scoreToTier(weightedScore, config);

  if (input.unexcusedAbsences > 0) reasons.push("Unexcused mandatory absence");
  if (input.duesPaid < config.duesRequiredAmount) reasons.push("Dues unpaid past deadline");
  if (formsRaw !== null && formsRaw < config.garnetFormMinPct) reasons.push("Mandatory form compliance below threshold");

  const tier: Tier = reasons.length ? "ineligible" : scoreBasedTier;
  const breakdown = Object.fromEntries(
    weightedDimensions.map((dimension) => [
      dimension.key,
      {
        raw: dimension.raw,
        score: Math.round(dimension.score),
        weight: dimension.weight,
        note: dimension.note,
      },
    ]),
  );

  return { tier, scoreBasedTier, weightedScore, reasons, breakdown };
}
