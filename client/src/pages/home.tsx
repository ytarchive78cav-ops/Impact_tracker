import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  Gift,
  Info,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";

import { CauseCardImage } from "@/components/cause-card-image";
import { GlobeMascot } from "@/components/globe-mascot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useCauses } from "@/hooks/use-causes";
import { useDiscoveryCauses } from "@/hooks/use-discovery";
import { useLinkPreview } from "@/hooks/use-link-preview";
import { useMonthlyLog, useRevealMonthlyLog, useCompleteMonthlyLog, useDeleteMonthlyLog } from "@/hooks/use-monthly-logs";
import { useSettings } from "@/hooks/use-settings";
import { APP_ROUTES } from "@/lib/app-routes";
import {
  coerceCadence,
  coerceGivingDayOfWeek,
  formatPeriodLabel,
  formatScheduledGivingDate,
  getCadenceCopy,
  getCurrentPeriodKey,
  getNextScheduledGivingDate,
} from "@/lib/cadence";
import {
  getCategoryBadgeClass,
  getExternalHref,
  getScopeBadgeClass,
  getTierBadgeClass,
  getTypeBadgeClass,
} from "@/lib/cause-ui";

type DetailPanel =
  | { title: string; description: string }
  | null;

type GuideMotionState = "idle" | "revealing" | "celebrate";

function normalizeUrl(raw?: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    url.protocol = "https:";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.origin.toLowerCase()}${url.pathname}`;
  } catch {
    return null;
  }
}

function getTagline(description?: string | null) {
  if (!description) return "A meaningful impact for your Giving Space.";
  const sentence = description.split(".").find((part) => part.trim().length > 0)?.trim() ?? description.trim();
  return sentence.length > 86 ? `${sentence.slice(0, 83).trim()}...` : sentence;
}

function getCategoryFromCause(tags?: string | null) {
  if (!tags) return null;
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .find(Boolean) ?? null;
}

function getRevealCelebrationKey(monthKey: string) {
  return `impact_reveal_celebrated:${monthKey}`;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { data: settings } = useSettings();
  const cadence = coerceCadence(settings?.cadence);
  const givingDayOfWeek = coerceGivingDayOfWeek(settings?.givingDayOfWeek);
  const cadenceCopy = getCadenceCopy(cadence);
  const currentPeriodKey = getCurrentPeriodKey(cadence, new Date(), {
    givingDayOfWeek,
    biweeklyAnchorDate: settings?.biweeklyAnchorDate ?? null,
  });
  const periodLabel = formatPeriodLabel(currentPeriodKey, cadence);
  const nextScheduledGivingDate = getNextScheduledGivingDate(cadence, givingDayOfWeek, settings?.biweeklyAnchorDate ?? null);

  const { data: logs = [], isLoading: logsLoading } = useMonthlyLog(currentPeriodKey);
  const { data: causes = [], isLoading: causesLoading } = useCauses();
  const { data: discoveryCauses = [] } = useDiscoveryCauses();

  const revealMutation = useRevealMonthlyLog();
  const deleteMutation = useDeleteMonthlyLog();
  const completeMutation = useCompleteMonthlyLog();

  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [hasResetThisPeriod, setHasResetThisPeriod] = useState(false);
  const [isRevealSuspense, setIsRevealSuspense] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideBubbleVisible, setIsGuideBubbleVisible] = useState(false);
  const [guideBubbleSide, setGuideBubbleSide] = useState<"left" | "right">("right");
  const [guideMotionState, setGuideMotionState] = useState<GuideMotionState>("idle");
  const previousLogIdRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setHasResetThisPeriod(false);
  }, [currentPeriodKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncBubbleSide = () => {
      setGuideBubbleSide(window.innerWidth < 390 ? "left" : "right");
    };
    syncBubbleSide();
    window.addEventListener("resize", syncBubbleSide);
    return () => window.removeEventListener("resize", syncBubbleSide);
  }, []);

  useEffect(() => {
    if (isRevealSuspense) {
      setGuideMotionState("revealing");
      return;
    }
    if (prefersReducedMotion) {
      setGuideMotionState("idle");
    }
  }, [isRevealSuspense, prefersReducedMotion]);

  const activeLog = useMemo(
    () => logs.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
    [logs],
  );

  const activeCause = useMemo(
    () => (activeLog ? causes.find((cause) => cause.id === activeLog.causeId) ?? null : null),
    [activeLog, causes],
  );

  const matchedDiscoveryCause = useMemo(() => {
    if (!activeCause) return null;
    const normalizedCauseUrl = normalizeUrl(activeCause.link);
    return discoveryCauses.find((entry) => (
      entry.name.trim().toLowerCase() === activeCause.name.trim().toLowerCase()
      || (normalizedCauseUrl && normalizeUrl(entry.websiteUrl) === normalizedCauseUrl)
    )) ?? null;
  }, [activeCause, discoveryCauses]);

  const { data: linkPreview } = useLinkPreview(activeCause && !activeCause.photoUrl ? activeCause.link : null);

  const heroImageUrl = activeCause?.photoUrl ?? matchedDiscoveryCause?.imageUrl ?? linkPreview?.imageUrl ?? null;
  const heroImageAlt = matchedDiscoveryCause?.imageAlt ?? activeCause?.name ?? "Cause image";
  const tagline = matchedDiscoveryCause?.tagline ?? getTagline(activeCause?.description);
  const categoryLabel = matchedDiscoveryCause?.categories?.[0] ?? getCategoryFromCause(activeCause?.tags);
  const causeProfileHref = matchedDiscoveryCause ? `${APP_ROUTES.cause}/${matchedDiscoveryCause.id}` : null;
  const externalHref = getExternalHref(activeCause?.link);
  const whyItMatters = matchedDiscoveryCause?.bio ?? activeCause?.description ?? "";
  const howYouCanHelp = activeLog?.type === "donation"
    ? (matchedDiscoveryCause?.donationDetails ?? cadenceCopy.impactDescription)
    : activeLog?.type === "volunteer"
      ? (matchedDiscoveryCause?.volunteerDetails ?? "Time, consistency, and hands-on help make this impact real.")
      : (matchedDiscoveryCause?.donationDetails ?? matchedDiscoveryCause?.volunteerDetails ?? "Support this cause in the way that best fits your Giving Space.");

  const probabilityMessage = useMemo(() => {
    if (!activeCause || !settings) {
      return cadenceCopy.priorityDescription;
    }
    const tierWeight = activeCause.tier === 1
      ? settings.tier1Weight
      : activeCause.tier === 2
        ? settings.tier2Weight
        : settings.tier3Weight;
    const totalWeight = settings.tier1Weight + settings.tier2Weight + settings.tier3Weight;
    const percentage = totalWeight > 0 ? Math.round((tierWeight / totalWeight) * 100) : null;
    return percentage
      ? `Selected based on your Giving Space priorities. Tier ${activeCause.tier} currently carries about ${percentage}% of the tier weighting.`
      : cadenceCopy.priorityDescription;
  }, [activeCause, cadenceCopy.priorityDescription, settings]);

  const openProgress = () => {
    if (!activeLog) return;
    setAmount(activeLog.amount ? String(activeLog.amount) : "");
    setHours(activeLog.hours ? String(activeLog.hours) : "");
    setNote(activeLog.note ?? "");
    setIsProgressOpen(true);
  };

  const handleReveal = () => {
    if (activeLog) return;
    setIsRevealSuspense(true);
    window.setTimeout(() => {
      revealMutation.mutate(currentPeriodKey, {
        onSuccess: () => {
          setHasResetThisPeriod(false);
          setIsRevealSuspense(false);
          const celebrationKey = getRevealCelebrationKey(currentPeriodKey);
          if (!window.localStorage.getItem(celebrationKey)) {
            window.localStorage.setItem(celebrationKey, "1");
            window.setTimeout(() => {
              confetti({
                particleCount: 160,
                spread: 84,
                origin: { y: 0.58 },
                colors: ["#4ADE80", "#FCD34D", "#60A5FA"],
              });
            }, 160);
          }
        },
        onError: () => setIsRevealSuspense(false),
      });
    }, 520);
  };

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (activeLog && previousLogIdRef.current !== activeLog.id) {
      previousLogIdRef.current = activeLog.id;
      setGuideMotionState("celebrate");
      const timeoutId = window.setTimeout(() => setGuideMotionState("idle"), 900);
      return () => window.clearTimeout(timeoutId);
    }
    if (!activeLog) {
      previousLogIdRef.current = null;
      setGuideMotionState("idle");
    }
  }, [activeLog, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeLog || isGuideOpen) {
      setIsGuideBubbleVisible(false);
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
      return;
    }

    const armIdleTimer = () => {
      setIsGuideBubbleVisible(false);
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = window.setTimeout(() => {
        setIsGuideBubbleVisible(true);
      }, 5000);
    };

    const handleActivity = () => {
      armIdleTimer();
    };

    armIdleTimer();

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("wheel", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);

    return () => {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("wheel", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [activeLog, isGuideOpen]);

  const openGuide = () => {
    setIsGuideBubbleVisible(false);
    setIsGuideOpen(true);
  };

  const handleDelete = () => {
    if (!activeLog) return;
    deleteMutation.mutate(activeLog.id, {
      onSuccess: () => {
        setHasResetThisPeriod(true);
        setIsDeleteOpen(false);
      },
    });
  };

  const handleSaveProgress = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeLog) return;
    completeMutation.mutate({
      id: activeLog.id,
      data: {
        amount: amount ? Number(amount) : undefined,
        hours: hours ? Number(hours) : undefined,
        note,
        dateCompleted: new Date().toISOString(),
      },
    }, {
      onSuccess: () => {
        setIsProgressOpen(false);
      },
    });
  };

  if (logsLoading || causesLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <motion.div animate={{ opacity: [0.45, 1, 0.45] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-[calc(112px+var(--safe-area-bottom))] pt-2 md:pt-6">
      <AnimatePresence mode="wait">
      {activeLog && activeCause ? (
        <motion.div
          key={`revealed-${activeLog.id}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-4"
        >
          <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
            <div className="relative p-3">
              <CauseCardImage
                imageUrl={heroImageUrl}
                imageAlt={heroImageAlt}
                title={activeCause.name}
                categories={matchedDiscoveryCause?.categories}
                mediaTheme={matchedDiscoveryCause?.mediaTheme}
                profile
              />

              <div className="absolute right-6 top-6 flex items-center gap-2">
                {activeLog.isCompleted ? (
                  <div className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-soft">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                    Completed
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600/92 text-white shadow-[0_10px_24px_rgba(136,19,55,0.35)] backdrop-blur"
                  aria-label={cadenceCopy.resetTitle}
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="px-4 pb-5 pt-1 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {periodLabel}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getTypeBadgeClass(activeLog.type)}`}>
                  {activeLog.type}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getTierBadgeClass(activeCause.tier)}`}>
                  Tier {activeCause.tier}
                </span>
                {activeCause.location ? (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getScopeBadgeClass(activeCause.location)}`}>
                    {activeCause.location}
                  </span>
                ) : null}
                {categoryLabel ? (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getCategoryBadgeClass(categoryLabel)}`}>
                    {categoryLabel.replace(/-/g, " ")}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-3 text-[2rem] font-display font-bold leading-tight text-foreground">{activeCause.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={openProgress} className="rounded-xl px-5 py-3 font-semibold shadow-bouncy">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Log Progress
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (causeProfileHref) {
                      setLocation(causeProfileHref);
                      return;
                    }
                    setLocation(APP_ROUTES.causes);
                  }}
                  className="rounded-xl px-5 py-3 font-semibold"
                >
                  View in Discover
                </Button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setDetailPanel({ title: "Why this cause?", description: probabilityMessage })}
                  className="inline-flex items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="mr-2 h-4 w-4" />
                  Why this cause?
                </button>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{cadenceCopy.activeFocusMessage}</p>
              <p className="mt-1 text-sm text-muted-foreground">Next giving day: {formatScheduledGivingDate(nextScheduledGivingDate)}</p>

              {activeLog.isCompleted ? (
                <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <div className="font-semibold">Impact logged</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-emerald-800">
                    {activeLog.amount ? <span>${activeLog.amount} donated</span> : null}
                    {activeLog.hours ? <span>{activeLog.hours} hours volunteered</span> : null}
                    {activeLog.dateCompleted ? <span>{new Date(activeLog.dateCompleted).toLocaleDateString()}</span> : null}
                  </div>
                  {activeLog.note ? <p className="mt-2 text-emerald-800/90">"{activeLog.note}"</p> : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <ActionPanel
              title="Why it matters"
              description="See the bigger reason behind this pick."
              onClick={() => setDetailPanel({ title: "Why it matters", description: whyItMatters })}
            />
            <ActionPanel
              title="How you can help"
              description="Open a focused summary of the best next step."
              onClick={() => setDetailPanel({ title: "How you can help", description: howYouCanHelp })}
            />
            <ActionPanel
              title="Full Cause Profile"
              description={causeProfileHref ? "Explore the full media-rich profile." : externalHref ? "Open the cause website." : "No extra profile available."}
              onClick={() => {
                if (causeProfileHref) {
                  setLocation(causeProfileHref);
                  return;
                }
                if (externalHref) {
                  window.open(externalHref, "_blank", "noopener,noreferrer");
                }
              }}
              disabled={!causeProfileHref && !externalHref}
            />
          </section>
        </motion.div>
      ) : (
        <motion.section
          key={hasResetThisPeriod ? "reset" : "empty"}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-12 shadow-soft md:px-8 md:py-14"
        >
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{periodLabel}</p>
            <h2 className="mt-3 text-4xl font-display font-bold tracking-tight text-foreground">Reveal your cause</h2>

            <motion.div whileTap={{ scale: 0.985 }} className="mt-7">
              <Button
                onClick={handleReveal}
                disabled={revealMutation.isPending || isRevealSuspense || causes.length === 0}
                className="h-[4.5rem] min-w-[18rem] rounded-[1.35rem] px-10 text-lg font-semibold shadow-[0_18px_42px_rgba(34,197,94,0.28)]"
              >
                {isRevealSuspense ? (
                  <motion.span
                    animate={{ opacity: [0.55, 1, 0.55] }}
                    transition={{ repeat: Infinity, duration: 1.15 }}
                    className="inline-flex items-center"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Revealing...
                  </motion.span>
                ) : (
                  <>
                    <Gift className="mr-2 h-5 w-5" />
                    Reveal Your Cause
                  </>
                )}
              </Button>
            </motion.div>
            <p className="mt-4 text-sm text-muted-foreground">
              {causes.length === 0
                ? "Add causes to your Giving Space first."
                : cadenceCopy.revealPrompt}
            </p>
            {causes.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">{cadenceCopy.cadenceSummary}</p>
                <p className="mt-1 text-sm text-muted-foreground">Next giving day: {formatScheduledGivingDate(nextScheduledGivingDate)}</p>
              </>
            ) : null}
          </div>
        </motion.section>
      )}
      </AnimatePresence>

      {!activeLog ? (
        <FloatingImpactGuide
          bubbleVisible={isGuideBubbleVisible}
          bubbleSide={guideBubbleSide}
          motionState={guideMotionState}
          paused={isGuideOpen || isRevealSuspense}
          reduceMotion={prefersReducedMotion}
          onClick={openGuide}
        />
      ) : null}

      <Drawer open={Boolean(detailPanel)} onOpenChange={(open) => !open && setDetailPanel(null)}>
        <DrawerContent className="max-h-[82dvh] rounded-t-[2rem] border-border/70 bg-card px-0 pb-0 shadow-soft">
          {detailPanel ? (
            <>
              <DrawerHeader className="px-5 pb-3 pt-2 text-left">
                <DrawerTitle>{detailPanel.title}</DrawerTitle>
                <DrawerDescription>Reveal details</DrawerDescription>
              </DrawerHeader>
              <div className="overflow-y-auto px-5 pb-[max(20px,calc(var(--safe-area-bottom)+20px))] text-sm leading-7 text-muted-foreground">
                {detailPanel.description}
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DrawerContent className="max-h-[70dvh] rounded-t-[2rem] border-border/70 bg-card px-0 pb-0 shadow-soft">
          <DrawerHeader className="px-5 pb-3 pt-2 text-left">
            <DrawerTitle>{activeLog ? "Nice pick 🌎" : "Hey! I'm your Impact Guide 🌎"}</DrawerTitle>
            <DrawerDescription>{activeLog ? "Here's what to do next." : "A quick note before you reveal."}</DrawerDescription>
          </DrawerHeader>
          <div className="px-5 pb-[max(20px,calc(var(--safe-area-bottom)+20px))]">
            <div className="rounded-[1.5rem] border border-border/70 bg-muted/35 p-4">
              <div className="space-y-2 text-sm leading-6 text-foreground">
                {activeLog ? (
                  <>
                    <p>Open the cause page and browse the media.</p>
                    <p>Choose your next step (donate or volunteer).</p>
                    <p>Log progress when you take action.</p>
                    <p>If it's not a fit, delete it to redraw.</p>
                  </>
                ) : (
                  <>
                    <p>Pick one thoughtful cause.</p>
                    <p>I'll choose from your Giving Space using your priorities.</p>
                    <p>Explore it, log progress, and make it count.</p>
                    <p>Small actions compound.</p>
                  </>
                )}
              </div>
            </div>
            <Button onClick={() => setIsGuideOpen(false)} className="mt-4 h-11 w-full rounded-xl font-semibold">
              {activeLog ? "Let's go" : "Got it"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DrawerContent className="max-h-[84dvh] rounded-t-[2rem] border-border/70 bg-card px-0 pb-0 shadow-soft">
          <DrawerHeader className="px-5 pb-3 pt-2 text-left">
            <DrawerTitle>Log Progress</DrawerTitle>
            <DrawerDescription>{cadenceCopy.progressDescription}</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSaveProgress} className="overflow-y-auto px-5 pb-[max(20px,calc(var(--safe-area-bottom)+20px))]">
            <div className="space-y-4">
              {activeLog?.type === "donation" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-foreground">Amount donated</span>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-4 text-sm outline-none"
                    />
                  </div>
                </label>
              ) : null}

              {activeLog?.type === "volunteer" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-foreground">Hours volunteered</span>
                  <div className="relative">
                    <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={hours}
                      onChange={(event) => setHours(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-4 text-sm outline-none"
                    />
                  </div>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-foreground">Notes</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={cadenceCopy.notePlaceholder}
                  className="min-h-[110px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setIsProgressOpen(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={completeMutation.isPending} className="flex-1 rounded-xl shadow-bouncy">
                {completeMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-[1.5rem] border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{cadenceCopy.resetTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your current selection and allow you to reveal a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionPanel({
  title,
  description,
  onClick,
  disabled = false,
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[1.4rem] border border-border bg-card px-4 py-4 text-left shadow-soft transition-transform hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-60"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-center text-sm font-semibold text-primary">
        Open
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

function ImpactGuideOrb({
  motionState,
  paused,
  reduceMotion,
  onClick,
}: {
  motionState: GuideMotionState;
  paused: boolean;
  reduceMotion: boolean;
  onClick: () => void;
}) {
  const isRevealSpin = motionState === "revealing" && !reduceMotion && !paused;
  const animate = paused
    ? { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1 }
    : motionState === "revealing"
      ? {
          x: [0, 3, -2, 0],
          y: [0, -4, 0],
          rotate: [0, 10, -8, 0],
          scale: [1, 1.03, 1],
        }
      : motionState === "celebrate"
        ? {
            x: [0, 5, -3, 0],
            y: [0, -8, 0],
            rotate: [0, -10, 10, 0],
            scale: [1, 1.08, 1],
          }
        : reduceMotion
          ? {
              x: [0, 0, 0],
              y: [0, -5, 0],
              rotate: [0, 0, 0],
              scale: [1, 1.02, 1],
              scaleX: [1, 1, 1],
              scaleY: [1, 1, 1],
            }
          : {
              x: [0, -10, 10, -6, 0, 14, 0, -4, 0],
              y: [0, -12, -6, -14, -4, -10, 0, -8, 0],
              rotate: [-5, 4, -4, 6, 0, 16, -16, 0, 0],
              scale: [1, 1.04, 1.01, 1.06, 1.02, 1.07, 1, 1.03, 1],
              scaleX: [1, 1, 1, 1, 1, 0.82, 0.82, 1, 1],
              scaleY: [1, 1, 1, 1, 1, 1.06, 1.06, 1, 1],
            };

  const transition = paused
    ? { duration: 0 }
    : motionState === "revealing"
      ? { duration: 1.18, repeat: Infinity, ease: "linear" as const }
      : motionState === "celebrate"
        ? { duration: 0.82, ease: "easeOut" as const }
        : reduceMotion
          ? { duration: 6.5, repeat: Infinity, ease: "easeInOut" as const, repeatDelay: 2.5 }
          : { duration: 3.9, repeat: Infinity, ease: "easeInOut" as const, repeatDelay: 0.45 };
  const orbSizeClass = "h-[5.4rem] w-[5.4rem] md:h-[6rem] md:w-[6rem]";
  const mascotSize = 72;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={animate}
      transition={transition}
      className={`pointer-events-auto relative flex items-center justify-center rounded-full bg-white/58 p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-transform hover:scale-[1.02] ${orbSizeClass}`}
      aria-label="Open Impact Guide"
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={reduceMotion || paused ? { opacity: 0.18, scale: 1 } : { opacity: [0.18, 0.32, 0.18], scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-1 rounded-full bg-primary/20"
      />
      {isRevealSpin ? (
        <>
          <motion.span
            aria-hidden="true"
            className="absolute -left-5 top-[42%] h-3 w-10 rounded-full bg-sky-200/70 blur-[2px]"
            animate={{ opacity: [0, 0.9, 0.25, 0], x: [0, -10, -22, -30], scaleX: [0.7, 1.25, 1.1, 0.85] }}
            transition={{ duration: 1.18, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute -right-5 top-[58%] h-2.5 w-8 rounded-full bg-white/80 blur-[2px]"
            animate={{ opacity: [0, 0.65, 0.2, 0], x: [0, 10, 20, 28], scaleX: [0.7, 1.1, 1, 0.8] }}
            transition={{ duration: 1.18, repeat: Infinity, ease: "linear", delay: 0.08 }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-[14%] rounded-full border border-white/25"
            animate={{
              opacity: [0, 0.22, 0.08, 0],
              scaleX: [1, 0.42, 0.24, 1],
              rotateY: [0, 180, 360, 360],
            }}
            transition={{ duration: 1.18, repeat: Infinity, ease: "linear" }}
            style={{ transformStyle: "preserve-3d" }}
          />
        </>
      ) : null}
      {motionState === "celebrate" && !reduceMotion && !paused ? (
        <>
          <motion.span
            initial={{ opacity: 0, scale: 0.6, y: 0 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1, 0.7], y: [-2, -12, -20] }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="absolute -right-1 top-1 text-sm"
          >
            ✦
          </motion.span>
          <motion.span
            initial={{ opacity: 0, scale: 0.6, y: 0 }}
            animate={{ opacity: [0, 0.75, 0], scale: [0.6, 0.95, 0.7], y: [2, -8, -14] }}
            transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
            className="absolute left-0 top-3 text-xs"
          >
            ✦
          </motion.span>
        </>
      ) : null}
      <motion.div
        className="relative z-[1]"
        animate={isRevealSpin ? {
          rotateY: [0, 360],
          scaleX: [1, 0.2, 1],
          rotateZ: [0, 4, -4, 0],
          filter: ["blur(0px)", "blur(0.4px)", "blur(0px)"],
        } : undefined}
        transition={isRevealSpin ? { duration: 1.18, repeat: Infinity, ease: "linear" } : undefined}
        style={{ transformStyle: "preserve-3d", willChange: isRevealSpin ? "transform, filter" : "auto" }}
      >
        <GlobeMascot mood={motionState === "celebrate" ? "excited" : "happy"} size={mascotSize} />
      </motion.div>
    </motion.button>
  );
}

function FloatingImpactGuide({
  bubbleVisible,
  bubbleSide,
  motionState,
  paused,
  reduceMotion,
  onClick,
}: {
  bubbleVisible: boolean;
  bubbleSide: "left" | "right";
  motionState: GuideMotionState;
  paused: boolean;
  reduceMotion: boolean;
  onClick: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(148px+var(--safe-area-bottom))] z-20 flex justify-center sm:bottom-[calc(164px+var(--safe-area-bottom))]">
      <div className="relative flex w-full max-w-4xl justify-center px-6 md:px-8">
        <div className="pointer-events-none relative translate-x-[6%] sm:translate-x-[10%]">
          <AnimatePresence>
            {bubbleVisible ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`pointer-events-auto absolute -top-9 ${bubbleSide === "left" ? "right-[calc(100%-0.5rem)]" : "left-[calc(100%-0.25rem)]"}`}
                onClick={onClick}
              >
                <div className="relative rounded-full bg-white/96 px-3 py-1 text-xs font-semibold lowercase text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                  tap me
                  <span
                    className={`absolute top-full h-2 w-2 -translate-y-1 rotate-45 bg-white/96 ${
                      bubbleSide === "left" ? "right-4" : "left-4"
                    }`}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <ImpactGuideOrb
            motionState={motionState}
            paused={paused}
            reduceMotion={reduceMotion}
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  );
}
