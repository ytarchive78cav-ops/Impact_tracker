import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";

import { type InsertSettings, type Settings } from "@shared/routes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMonthlyLog } from "@/hooks/use-monthly-logs";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import {
  coerceCadence,
  coerceGivingDayOfWeek,
  ensureBiweeklyAnchorDate,
  formatScheduledGivingDate,
  getCadenceCopy,
  getCurrentPeriodKey,
  getGivingDaySummary,
  getNextScheduledGivingDate,
  getPeriodExplanation,
  getWeekdayLabel,
  type ImpactCadence,
} from "@/lib/cadence";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";

const CADENCE_OPTIONS: Array<{ value: ImpactCadence; label: string; helper: string }> = [
  { value: "monthly", label: "Monthly", helper: "1 focus per month" },
  { value: "biweekly", label: "Bi-weekly", helper: "1 focus every 2 weeks" },
  { value: "weekly", label: "Weekly", helper: "1 focus per week" },
];

const GIVING_DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

type SaveState = "idle" | "saving" | "saved" | "retrying";

function segmentedPillClass(isSelected: boolean) {
  return cn(
    "rounded-[0.95rem] border px-2.5 py-2 text-sm transition-all duration-200 ease-out active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
    "disabled:cursor-not-allowed disabled:opacity-60",
    isSelected
      ? "border-primary/80 bg-white text-foreground shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
      : "border-transparent bg-white/30 text-muted-foreground shadow-none hover:bg-white/55 hover:text-foreground",
  );
}

function segmentedLabelClass(isSelected: boolean) {
  return cn(
    "flex w-full items-center justify-center leading-none",
    isSelected ? "font-bold text-foreground" : "font-medium",
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildDraft(settings: Settings): Partial<InsertSettings> {
  return {
    cadence: settings.cadence,
    givingDayOfWeek: settings.givingDayOfWeek,
    biweeklyAnchorDate: settings.biweeklyAnchorDate ?? null,
    volunteerFrequency: settings.volunteerFrequency,
    tier1Weight: settings.tier1Weight,
    tier2Weight: settings.tier2Weight,
    tier3Weight: settings.tier3Weight,
    preventRepeatsMonths: settings.preventRepeatsMonths,
    seasonalMode: settings.seasonalMode,
  };
}

function sanitizeSettings(input: Partial<InsertSettings>, fallback: Settings): Partial<InsertSettings> {
  const cadence = coerceCadence(input.cadence ?? fallback.cadence);
  const givingDayOfWeek = coerceGivingDayOfWeek(input.givingDayOfWeek ?? fallback.givingDayOfWeek);
  const preventRepeatsMonths = input.preventRepeatsMonths ?? fallback.preventRepeatsMonths;

  return {
    cadence,
    givingDayOfWeek,
    biweeklyAnchorDate: ensureBiweeklyAnchorDate(
      cadence,
      givingDayOfWeek,
      input.biweeklyAnchorDate ?? fallback.biweeklyAnchorDate ?? null,
    ),
    volunteerFrequency: clamp(Math.round(input.volunteerFrequency ?? fallback.volunteerFrequency), 1, 12),
    tier1Weight: clamp(Math.round(input.tier1Weight ?? fallback.tier1Weight), 0, 100),
    tier2Weight: clamp(Math.round(input.tier2Weight ?? fallback.tier2Weight), 0, 100),
    tier3Weight: clamp(Math.round(input.tier3Weight ?? fallback.tier3Weight), 0, 100),
    preventRepeatsMonths: [3, 6, 12].includes(preventRepeatsMonths ?? 6) ? preventRepeatsMonths : fallback.preventRepeatsMonths,
    seasonalMode: Boolean(input.seasonalMode ?? fallback.seasonalMode),
  };
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const { canManageSettings } = useUser();

  const [form, setForm] = useState<Partial<InsertSettings>>({});
  const [isCadenceHelpOpen, setIsCadenceHelpOpen] = useState(false);
  const [showPeriodMeaning, setShowPeriodMeaning] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const debounceTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const savePulseTimeoutRef = useRef<number | null>(null);
  const lastSavedPayloadRef = useRef<string | null>(null);
  const latestPayloadRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) window.clearTimeout(debounceTimeoutRef.current);
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
      if (savePulseTimeoutRef.current) window.clearTimeout(savePulseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const nextForm = buildDraft(settings);
    setForm(nextForm);
    lastSavedPayloadRef.current = JSON.stringify(nextForm);
    latestPayloadRef.current = JSON.stringify(nextForm);
    hasInitializedRef.current = true;
    setSaveState("idle");
  }, [settings]);

  const sanitizedForm = useMemo(() => (
    settings ? sanitizeSettings(form, settings) : form
  ), [form, settings]);

  const selectedCadence = coerceCadence((sanitizedForm.cadence ?? settings?.cadence ?? "monthly") as ImpactCadence);
  const selectedGivingDay = coerceGivingDayOfWeek(sanitizedForm.givingDayOfWeek ?? settings?.givingDayOfWeek ?? 5);
  const currentPeriodKey = getCurrentPeriodKey(selectedCadence, new Date(), {
    givingDayOfWeek: selectedGivingDay,
    biweeklyAnchorDate: sanitizedForm.biweeklyAnchorDate ?? settings?.biweeklyAnchorDate ?? null,
  });
  const { data: currentPeriodLogs = [] } = useMonthlyLog(currentPeriodKey);
  const hasActiveFocus = currentPeriodLogs.length > 0;

  useEffect(() => {
    if (!settings || !canManageSettings || !hasInitializedRef.current) return;

    const payload = sanitizeSettings(form, settings);
    const serialized = JSON.stringify(payload);
    latestPayloadRef.current = serialized;

    if (serialized === lastSavedPayloadRef.current) return;

    if (debounceTimeoutRef.current) window.clearTimeout(debounceTimeoutRef.current);
    if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);

    const persist = async (retrying: boolean) => {
      setSaveState(retrying ? "retrying" : "saving");
      try {
        await updateMutation.mutateAsync(payload);
        if (latestPayloadRef.current !== serialized) return;
        lastSavedPayloadRef.current = serialized;
        setSaveState("saved");
        if (savePulseTimeoutRef.current) window.clearTimeout(savePulseTimeoutRef.current);
        savePulseTimeoutRef.current = window.setTimeout(() => {
          if (latestPayloadRef.current === serialized) {
            setSaveState("idle");
          }
        }, 1400);
      } catch {
        if (latestPayloadRef.current !== serialized) return;
        setSaveState("retrying");
        retryTimeoutRef.current = window.setTimeout(() => {
          void persist(true);
        }, 1600);
      }
    };

    debounceTimeoutRef.current = window.setTimeout(() => {
      void persist(false);
    }, 450);

    return () => {
      if (debounceTimeoutRef.current) window.clearTimeout(debounceTimeoutRef.current);
    };
  }, [canManageSettings, form, settings, updateMutation]);

  if (isLoading || !settings) return <div className="p-8 text-center">Loading settings...</div>;

  const cadenceCopy = getCadenceCopy(selectedCadence);
  const nextGivingDate = getNextScheduledGivingDate(
    selectedCadence,
    selectedGivingDay,
    sanitizedForm.biweeklyAnchorDate ?? settings.biweeklyAnchorDate ?? null,
  );
  const statusMessage = saveState === "saving"
    ? "Saving..."
    : saveState === "saved"
      ? "Saved"
      : saveState === "retrying"
        ? "Couldn't save. Retrying..."
        : null;

  const statusIcon = saveState === "saving"
    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
    : saveState === "saved"
      ? <Check className="h-3.5 w-3.5" />
      : saveState === "retrying"
        ? <CircleAlert className="h-3.5 w-3.5" />
        : null;

  return (
    <>
      <div className="mx-auto max-w-2xl pb-12 pt-4 md:pt-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-3xl font-display font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Adjust app controls for how Impact chooses and manages each focus period.</p>
          </div>
          {statusMessage ? (
            <div
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                saveState === "retrying" ? "bg-amber-50 text-amber-900" : "bg-muted text-muted-foreground"
              }`}
            >
              {statusIcon}
              {statusMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-8 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          {!canManageSettings ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Members can view Giving Space settings, but only owners and admins can change them.
            </div>
          ) : null}

          <section className="rounded-[1.35rem] border border-border bg-emerald-50/45 px-4 py-3.5 md:px-5 md:py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Cadence</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">How often should Impact pick a new focus?</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPeriodMeaning(false);
                  setIsCadenceHelpOpen(true);
                }}
                className="mt-0.5 inline-flex h-6.5 w-6.5 items-center justify-center rounded-full border border-border/80 bg-white/80 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Learn more about cadence"
              >
                <span className="text-sm font-semibold leading-none">?</span>
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-[1.1rem] bg-white/65 p-1">
              {CADENCE_OPTIONS.map((option) => {
                const isSelected = selectedCadence === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, cadence: option.value }))}
                    disabled={!canManageSettings}
                    aria-pressed={isSelected}
                    className={cn(segmentedPillClass(isSelected), "flex items-center justify-center px-3")}
                  >
                    <span className={segmentedLabelClass(isSelected)}>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-2 inline-flex items-center gap-2 text-sm text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden="true" />
              {CADENCE_OPTIONS.find((option) => option.value === selectedCadence)?.helper}
            </p>
          </section>

          <section className="rounded-[1.35rem] border border-border bg-sky-50/45 px-4 py-3.5 md:px-5 md:py-4">
            <h2 className="text-lg font-display font-bold text-foreground">Giving day</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Helps Impact label your focus periods.</p>

            <div className="mt-2.5 grid grid-cols-7 gap-1 rounded-[1.1rem] bg-white/65 p-1">
              {GIVING_DAY_OPTIONS.map((day) => {
                const isSelected = selectedGivingDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, givingDayOfWeek: day }))}
                    disabled={!canManageSettings}
                    aria-pressed={isSelected}
                    className={cn(
                      segmentedPillClass(isSelected),
                      "rounded-[0.9rem] px-1.5 py-1.5 text-xs sm:text-sm",
                    )}
                  >
                    <span className="flex flex-col items-center gap-1 leading-none">
                      <span className={segmentedLabelClass(isSelected)}>{getWeekdayLabel(day, "short")}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1 w-1 rounded-full transition-opacity duration-200",
                          isSelected ? "bg-primary opacity-100" : "bg-transparent opacity-0",
                        )}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {getGivingDaySummary(selectedCadence, selectedGivingDay)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Next scheduled giving day: {formatScheduledGivingDate(nextGivingDate)}
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <h3 className="mb-4 text-lg font-bold">Volunteer Frequency</h3>
            <p className="mb-4 text-sm text-muted-foreground">How many months per year should prioritize volunteer tasks over donations?</p>
            <input
              type="range"
              min="1"
              max="12"
              value={sanitizedForm.volunteerFrequency || 3}
              onChange={(e) => setForm((current) => ({ ...current, volunteerFrequency: clamp(Number(e.target.value), 1, 12) }))}
              disabled={!canManageSettings}
              className="w-full accent-primary"
            />
            <div className="mt-2 text-center font-bold text-primary">
              {sanitizedForm.volunteerFrequency} months / year
            </div>
          </section>

          <hr className="border-border" />

          <section>
            <h3 className="mb-4 text-lg font-bold">Tier Weights</h3>
            <p className="mb-4 text-sm text-muted-foreground">Higher weight means higher chance of being drawn.</p>
            <div className="space-y-4">
              {["tier1", "tier2", "tier3"].map((tier, idx) => {
                const key = `${tier}Weight` as keyof typeof sanitizedForm;
                return (
                  <div key={tier} className="flex items-center">
                    <label className="w-24 text-sm font-bold">Tier {idx + 1}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(sanitizedForm[key] as number) || 0}
                      onChange={(e) => setForm((current) => ({ ...current, [key]: clamp(Number(e.target.value), 0, 100) }))}
                      disabled={!canManageSettings}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-sm font-bold">{sanitizedForm[key]}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="border-border" />

          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Prevent Repeats</h3>
                <p className="text-sm text-muted-foreground">Cooldown before a cause can be drawn again</p>
              </div>
              <select
                value={sanitizedForm.preventRepeatsMonths || 6}
                onChange={(e) => setForm((current) => ({ ...current, preventRepeatsMonths: Number(e.target.value) }))}
                disabled={!canManageSettings}
                className="rounded-xl border-2 border-transparent bg-input px-4 py-2 font-bold outline-none focus:border-primary"
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Seasonal Mode</h3>
                <p className="text-sm text-muted-foreground">Prioritize causes with matching tags to the current season</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, seasonalMode: !sanitizedForm.seasonalMode }))}
                disabled={!canManageSettings}
                className={`relative h-8 w-14 rounded-full transition-colors ${sanitizedForm.seasonalMode ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${sanitizedForm.seasonalMode ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={isCadenceHelpOpen} onOpenChange={setIsCadenceHelpOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-[1.75rem] border-border bg-card p-6 shadow-soft">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-display text-xl text-foreground">Cadence</DialogTitle>
            <DialogDescription className="leading-6">
              {hasActiveFocus
                ? "Cadence decides how long you stay focused on the current cause before picking a new one. You can still log progress anytime."
                : "Cadence decides how long you stay focused on the current cause before picking a new one. You can still log progress anytime."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm leading-6">
            <button
              type="button"
              onClick={() => setShowPeriodMeaning((current) => !current)}
              className="font-semibold text-primary"
            >
              What&apos;s a period?
            </button>
            {showPeriodMeaning ? (
              <p className="mt-2 text-muted-foreground">{getPeriodExplanation(selectedCadence)}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCadenceHelpOpen(false)} className="rounded-xl px-5 font-semibold shadow-bouncy">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
