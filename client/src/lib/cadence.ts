export const CADENCE_VALUES = ["monthly", "biweekly", "weekly"] as const;

export type ImpactCadence = typeof CADENCE_VALUES[number];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const WEEKDAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"] as const;

export function coerceCadence(value?: string | null): ImpactCadence {
  return CADENCE_VALUES.includes(value as ImpactCadence) ? (value as ImpactCadence) : "monthly";
}

export function coerceGivingDayOfWeek(value?: number | null): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6 ? value : 5;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfWeekSunday(date: Date) {
  const normalized = startOfDay(date);
  return addDays(normalized, -normalized.getDay());
}

export function endOfWeekSaturday(date: Date) {
  const start = startOfWeekSunday(date);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return end;
}

function formatRangeLabel(start: Date, end: Date) {
  const startMonth = start.toLocaleString("default", { month: "short" });
  const endMonth = end.toLocaleString("default", { month: "short" });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }
  if (sameYear) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

export function formatWeekRange(date: Date) {
  return formatRangeLabel(startOfWeekSunday(date), endOfWeekSaturday(date));
}

export function getWeekdayLabel(day: number, format: "short" | "long" = "long") {
  const normalized = coerceGivingDayOfWeek(day);
  return format === "short" ? WEEKDAY_SHORT[normalized] : WEEKDAY_LONG[normalized];
}

export function getWeekdayPluralLabel(day: number) {
  return WEEKDAY_PLURAL[coerceGivingDayOfWeek(day)];
}

export function getFirstOccurrenceOfWeekdayInMonth(date: Date, dayOfWeek: number) {
  const normalized = coerceGivingDayOfWeek(dayOfWeek);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (normalized - first.getDay() + 7) % 7;
  return addDays(first, offset);
}

function getNextOccurrenceOfWeekday(date: Date, dayOfWeek: number) {
  const normalized = coerceGivingDayOfWeek(dayOfWeek);
  const current = startOfDay(date);
  const offset = (normalized - current.getDay() + 7) % 7;
  return addDays(current, offset);
}

export function ensureBiweeklyAnchorDate(
  cadence: ImpactCadence,
  dayOfWeek: number,
  anchorDate?: string | null,
  date = new Date(),
) {
  if (cadence !== "biweekly") return null;
  const parsed = parseIsoDate(anchorDate);
  if (parsed && parsed.getDay() === coerceGivingDayOfWeek(dayOfWeek)) {
    return toIsoDate(parsed);
  }
  return toIsoDate(getNextOccurrenceOfWeekday(date, dayOfWeek));
}

export function getNextScheduledGivingDate(
  cadence: ImpactCadence,
  dayOfWeek: number,
  biweeklyAnchorDate?: string | null,
  date = new Date(),
) {
  const normalizedDay = coerceGivingDayOfWeek(dayOfWeek);
  const today = startOfDay(date);

  if (cadence === "weekly") {
    return getNextOccurrenceOfWeekday(today, normalizedDay);
  }

  if (cadence === "monthly") {
    const currentMonth = getFirstOccurrenceOfWeekdayInMonth(today, normalizedDay);
    if (currentMonth.getTime() >= today.getTime()) {
      return currentMonth;
    }
    return getFirstOccurrenceOfWeekdayInMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1), normalizedDay);
  }

  const anchor = parseIsoDate(ensureBiweeklyAnchorDate(cadence, normalizedDay, biweeklyAnchorDate, today)) ?? getNextOccurrenceOfWeekday(today, normalizedDay);
  let candidate = startOfDay(anchor);
  while (candidate.getTime() < today.getTime()) {
    candidate = addDays(candidate, 14);
  }
  return candidate;
}

function getBiweeklyPeriodStart(date: Date, dayOfWeek: number, biweeklyAnchorDate?: string | null) {
  const anchorDate = parseIsoDate(ensureBiweeklyAnchorDate("biweekly", dayOfWeek, biweeklyAnchorDate, date))
    ?? getNextOccurrenceOfWeekday(date, dayOfWeek);
  const anchorStart = startOfWeekSunday(anchorDate);
  const target = startOfWeekSunday(date);
  const diffDays = Math.floor((target.getTime() - anchorStart.getTime()) / DAY_IN_MS);
  const periods = Math.floor(diffDays / 14);
  return addDays(anchorStart, periods * 14);
}

export function getCurrentPeriodKey(
  cadence: ImpactCadence,
  date = new Date(),
  options?: { givingDayOfWeek?: number | null; biweeklyAnchorDate?: string | null },
) {
  if (cadence === "weekly") {
    return `weekly:${toIsoDate(startOfWeekSunday(date))}`;
  }
  if (cadence === "biweekly") {
    return `biweekly:${toIsoDate(getBiweeklyPeriodStart(date, options?.givingDayOfWeek ?? 5, options?.biweeklyAnchorDate))}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getPeriodStartDate(periodKey: string) {
  if (periodKey.startsWith("weekly:")) {
    return parseIsoDate(periodKey.slice("weekly:".length)) ?? new Date();
  }
  if (periodKey.startsWith("biweekly:")) {
    return parseIsoDate(periodKey.slice("biweekly:".length)) ?? new Date();
  }
  const [year, month] = periodKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

export function getPeriodEndDate(periodKey: string, cadence: ImpactCadence) {
  const start = getPeriodStartDate(periodKey);
  if (cadence === "weekly") {
    return endOfWeekSaturday(start);
  }
  if (cadence === "biweekly") {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 13, 23, 59, 59, 999);
  }
  return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function formatPeriodLabel(periodKey: string, cadence: ImpactCadence) {
  const start = getPeriodStartDate(periodKey);
  if (cadence === "monthly") {
    return start.toLocaleString("default", { month: "long", year: "numeric" });
  }
  return formatRangeLabel(start, getPeriodEndDate(periodKey, cadence));
}

export function getPeriodMonthDistance(periodA: string, periodB: string) {
  const startA = getPeriodStartDate(periodA);
  const startB = getPeriodStartDate(periodB);
  return Math.abs((startA.getFullYear() - startB.getFullYear()) * 12 + (startA.getMonth() - startB.getMonth()));
}

export function getGivingDaySummary(cadence: ImpactCadence, dayOfWeek: number) {
  const day = getWeekdayLabel(dayOfWeek);
  if (cadence === "weekly") return `Scheduled every ${day}`;
  if (cadence === "biweekly") return `Scheduled every 2 ${getWeekdayPluralLabel(dayOfWeek)}`;
  return `Scheduled first ${day} of the month`;
}

export function formatScheduledGivingDate(date: Date) {
  return date.toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getPeriodExplanation(cadence: ImpactCadence) {
  if (cadence === "weekly") return "A period is Sunday through Saturday.";
  if (cadence === "biweekly") return "A period is two weeks at a time.";
  return "A period is the current month.";
}

export function getCadenceCopy(cadence: ImpactCadence) {
  if (cadence === "weekly") {
    return {
      periodLabel: "this week",
      frequencyLabel: "weekly",
      revealPrompt: "Impact will pick one cause from your Giving Space for this focus period.",
      cadenceSummary: "One focus per week (Sun-Sat).",
      activeFocusMessage: "Already revealed for this week.",
      progressDescription: "Save your Giving Space progress for this week.",
      notePlaceholder: "What happened this week?",
      priorityDescription: "Selected based on your Giving Space priorities for this focus period.",
      impactDescription: "A direct gift is the clearest next step for this week's impact.",
      resetTitle: "Reset this week's focus?",
    };
  }

  if (cadence === "biweekly") {
    return {
      periodLabel: "this period",
      frequencyLabel: "every 2 weeks",
      revealPrompt: "Impact will pick one cause from your Giving Space for this focus period.",
      cadenceSummary: "One focus every 2 weeks.",
      activeFocusMessage: "Already revealed for this period.",
      progressDescription: "Save your Giving Space progress for this period.",
      notePlaceholder: "What happened this period?",
      priorityDescription: "Selected based on your Giving Space priorities for this focus period.",
      impactDescription: "A direct gift is the clearest next step for this period's impact.",
      resetTitle: "Reset this period's focus?",
    };
  }

  return {
    periodLabel: "this month",
    frequencyLabel: "monthly",
    revealPrompt: "Impact will pick one cause from your Giving Space for this focus period.",
    cadenceSummary: "One focus per month.",
    activeFocusMessage: "Already revealed for this month.",
    progressDescription: "Save your Giving Space progress for this month.",
    notePlaceholder: "What happened this month?",
    priorityDescription: "Selected based on your Giving Space priorities for this focus period.",
    impactDescription: "A direct gift is the clearest next step for this month's impact.",
    resetTitle: "Reset this month's focus?",
  };
}
