import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Plus, Search, X } from "lucide-react";
import { useLocation } from "wouter";

import { CauseCardImage } from "@/components/cause-card-image";
import { useCauses } from "@/hooks/use-causes";
import { useAddDiscoveryCause, useDiscoveryCauses } from "@/hooks/use-discovery";
import { useToast } from "@/hooks/use-toast";
import { APP_ROUTES } from "@/lib/app-routes";
import { getCategoryBadgeClass, getExternalHref, getScopeBadgeClass, getTypeBadgeClass } from "@/lib/cause-ui";
import { type DiscoveryCauseTemplate } from "@/lib/local-storage";
import { requestProfileEditOpen, setWorkspaceAdminReturnPath } from "@/lib/navigation-intents";
import { useUser } from "@/lib/user-context";

type FilterMode = "all" | "local" | "global";
type CategoryKey = "all" | "community" | "environment" | "health" | "education" | "poverty";

type AddModalState = {
  template: DiscoveryCauseTemplate;
  type: "donation" | "volunteer" | "either";
  tier: 1 | 2 | 3;
};

const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All categories" },
  { key: "health", label: "Health" },
  { key: "community", label: "Community" },
  { key: "environment", label: "Environment" },
  { key: "education", label: "Education" },
  { key: "poverty", label: "Poverty" },
];

function hasGivingSpaceLocation(template: DiscoveryCauseTemplate, filter: FilterMode, hasLocation: boolean) {
  if (filter !== "local") return true;
  return hasLocation;
}

export default function DiscoverPage() {
  const { data: discoveryCauses = [], isLoading } = useDiscoveryCauses();
  const { data: givingSpaceCauses = [] } = useCauses();
  const addMutation = useAddDiscoveryCause();
  const { activeUser, activeWorkspace, canManageCauses } = useUser();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [modalState, setModalState] = useState<AddModalState | null>(null);
  const [modalStatus, setModalStatus] = useState<"idle" | "saving" | "success">("idle");

  const activeLocation = activeWorkspace?.location ?? null;
  const hasActiveLocation = Boolean(activeLocation?.country || activeLocation?.region || activeLocation?.city || activeLocation?.postalCode);

  useEffect(() => {
    if (!modalState) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousPosition = style.position;
    const previousTop = style.top;
    const previousWidth = style.width;

    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      style.overflow = previousOverflow;
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [modalState]);

  const isAlreadyAdded = (template: DiscoveryCauseTemplate) => givingSpaceCauses.some((cause) => (
    cause.name.trim().toLowerCase() === template.name.trim().toLowerCase()
    && (cause.link ?? "").trim().toLowerCase() === (template.websiteUrl ?? "").trim().toLowerCase()
  ));

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();

    return discoveryCauses.filter((cause) => {
      const matchesScope = filter === "all" ? true : cause.scope === filter;
      const matchesLocation = hasGivingSpaceLocation(cause, filter, hasActiveLocation);
      const matchesSearch = !query
        || cause.name.toLowerCase().includes(query)
        || cause.description.toLowerCase().includes(query)
        || cause.tags?.toLowerCase().includes(query)
        || (cause.bio ?? "").toLowerCase().includes(query)
        || (cause.categories ?? []).some((category) => category.includes(query));
      const matchesCategory = activeCategory === "all" ? true : (cause.categories ?? []).includes(activeCategory);

      return matchesScope && matchesLocation && matchesSearch && matchesCategory;
    });
  }, [activeCategory, discoveryCauses, filter, hasActiveLocation, search]);

  const curatedRows = useMemo(() => {
    const rows = [
      {
        id: "recommended",
        title: "Recommended",
        description: "A clean shortlist for the active Giving Space.",
        items: filteredList
          .slice()
          .sort((a, b) => Number(isAlreadyAdded(a)) - Number(isAlreadyAdded(b)) || a.name.localeCompare(b.name))
          .slice(0, 8),
      },
      {
        id: "nearby",
        title: activeLocation?.city ? `Near ${activeLocation.city}` : "Local to your Giving Space",
        description: "Local causes that fit the current Giving Space context.",
        items: filteredList.filter((cause) => cause.scope === "local"),
      },
      {
        id: "donation-ready",
        title: "Donation Ready",
        description: "Strong fits when the next action is financial support.",
        items: filteredList.filter((cause) => cause.type === "donation" || cause.type === "either"),
      },
      {
        id: "volunteer-ready",
        title: "Volunteer Ready",
        description: "Hands-on opportunities for service and team participation.",
        items: filteredList.filter((cause) => cause.type === "volunteer" || cause.type === "either"),
      },
    ];

    return rows.filter((row) => row.items.length > 0);
  }, [activeLocation?.city, filteredList]);

  const handleAddIntent = (template: DiscoveryCauseTemplate) => {
    if (isAlreadyAdded(template)) return;
    if (!canManageCauses) {
      toast({
        title: "Admin required",
        description: "Only Giving Space owners and admins can add causes.",
      });
      return;
    }

    setModalStatus("idle");
    setModalState({
      template,
      type: template.type,
      tier: template.tier,
    });
  };

  const handleConfirmAdd = async () => {
    if (!modalState) return;
    setModalStatus("saving");

    try {
      await addMutation.mutateAsync({
        templateId: modalState.template.id,
        type: modalState.type,
        tier: modalState.tier,
        scope: modalState.template.scope,
      });
      setModalStatus("success");
      window.setTimeout(() => {
        setModalState(null);
        setModalStatus("idle");
      }, 700);
    } catch (error) {
      setModalStatus("idle");
      toast({
        title: "Could not add cause",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  const showLocationPrompt = filter === "local" && !hasActiveLocation;

  return (
    <div className="pb-[calc(104px+var(--safe-area-bottom))] pt-4 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Discover</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">Curated causes for the active Giving Space, with cleaner filters and faster add flow.</p>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search causes, tags, or categories..."
            className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 font-medium shadow-soft outline-none transition-all focus:border-primary"
          />
        </div>

        <div className="space-y-3">
          <div className="flex rounded-2xl border border-border bg-card p-1 shadow-soft">
            {(["all", "local", "global"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition-all ${filter === option ? "bg-primary text-white" : "text-muted-foreground"}`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setActiveCategory(category.key)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${activeCategory === category.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLocationPrompt ? (
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-display font-bold text-foreground">Set a location for this Giving Space to see nearby causes.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Local discovery uses the active Giving Space location, not your personal account location.</p>
          <button
            type="button"
            onClick={() => {
              if (activeWorkspace?.type === "personal" && activeWorkspace.createdByUserId === activeUser?.uid) {
                requestProfileEditOpen();
                setLocation(APP_ROUTES.profile);
                return;
              }

              setWorkspaceAdminReturnPath(location);
              setLocation(APP_ROUTES.workspaceAdmin);
            }}
            className="mt-4 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-bouncy"
          >
            Edit Giving Space Location
          </button>
        </section>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-60 animate-pulse rounded-[2rem] bg-card" />
          ))}
        </div>
      ) : (
        <>
          {curatedRows.map((row) => (
            <DiscoverRow
              key={row.id}
              id={row.id}
              title={row.title}
              description={row.description}
              items={row.items}
              isAlreadyAdded={isAlreadyAdded}
              onAdd={handleAddIntent}
              canManageCauses={canManageCauses}
            />
          ))}

          <section className="mt-10">
            <div className="mb-4">
              <h2 className="text-2xl font-display font-bold text-foreground">All causes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Filters only change the data shown here. They never move the page.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredList.map((cause) => (
                <DiscoverCard
                  key={cause.id}
                  cause={cause}
                  isAdded={isAlreadyAdded(cause)}
                  onAdd={handleAddIntent}
                  canManageCauses={canManageCauses}
                  vertical
                />
              ))}
            </div>
          </section>
        </>
      )}

      <AnimatePresence>
        {modalState ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[72] bg-black/30 backdrop-blur-sm"
              onClick={() => modalStatus !== "saving" && setModalState(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 bottom-4 z-[73] mx-auto flex max-h-[min(82dvh,44rem)] w-auto max-w-lg flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl md:inset-x-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active Giving Space</p>
                  <h2 className="mt-1 text-xl font-display font-bold text-foreground">Add to Giving Space</h2>
                  <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? "No Giving Space selected"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => modalStatus !== "saving" && setModalState(null)}
                  className="rounded-full bg-muted p-2 text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                <p className="text-base font-semibold text-foreground">{modalState.template.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{modalState.template.description}</p>

                <div className="mt-6 space-y-5">
                  <FieldBlock label="Type">
                    <div className="grid grid-cols-3 gap-2">
                      {(["donation", "volunteer", "either"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setModalState({ ...modalState, type: option })}
                          className={`rounded-xl border px-3 py-3 text-sm font-semibold capitalize ${modalState.type === option ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </FieldBlock>

                  <FieldBlock label="Tier">
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setModalState({ ...modalState, tier: tier as 1 | 2 | 3 })}
                          className={`rounded-xl border px-3 py-3 text-sm font-semibold ${modalState.tier === tier ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          Tier {tier}
                        </button>
                      ))}
                    </div>
                  </FieldBlock>
                </div>
              </div>

              <div className="border-t border-border bg-background/95 px-5 pb-[max(16px,calc(var(--safe-area-bottom)+16px))] pt-4 backdrop-blur">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => modalStatus !== "saving" && setModalState(null)}
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAdd}
                    disabled={modalStatus === "saving" || modalStatus === "success"}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-bouncy transition-all ${modalStatus === "success" ? "bg-emerald-600" : "bg-primary"} disabled:opacity-90`}
                  >
                    {modalStatus === "success" ? <Check className="mr-2 inline h-4 w-4" /> : null}
                    {modalStatus === "saving" ? "Adding..." : modalStatus === "success" ? "Added" : "Add"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DiscoverRow({
  id,
  title,
  description,
  items,
  isAlreadyAdded,
  onAdd,
  canManageCauses,
}: {
  id: string;
  title: string;
  description: string;
  items: DiscoveryCauseTemplate[];
  isAlreadyAdded: (template: DiscoveryCauseTemplate) => boolean;
  onAdd: (template: DiscoveryCauseTemplate) => void;
  canManageCauses: boolean;
}) {
  return (
    <section id={id} className="mt-10">
      <div className="mb-4">
        <h2 className="text-2xl font-display font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-4 snap-x snap-mandatory">
          {items.map((cause) => (
            <div key={cause.id} className="w-[18rem] shrink-0 snap-start md:w-[20rem]">
              <DiscoverCard
                cause={cause}
                isAdded={isAlreadyAdded(cause)}
                onAdd={onAdd}
                canManageCauses={canManageCauses}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiscoverCard({
  cause,
  isAdded,
  onAdd,
  canManageCauses,
  vertical = false,
}: {
  cause: DiscoveryCauseTemplate;
  isAdded: boolean;
  onAdd: (template: DiscoveryCauseTemplate) => void;
  canManageCauses: boolean;
  vertical?: boolean;
}) {
  const [, setLocation] = useLocation();
  const href = getExternalHref(cause.websiteUrl);
  const primaryLabel = isAdded ? "Added" : canManageCauses ? "Add" : "Admin required";
  const categories = cause.categories ?? [];

  return (
    <article
      className={`flex h-full cursor-pointer flex-col rounded-[2rem] border border-border bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5 ${vertical ? "md:p-5" : ""}`}
      onClick={() => setLocation(`/cause/${cause.id}`)}
    >
      <CauseCardImage
        imageUrl={cause.imageUrl}
        imageAlt={cause.imageAlt}
        title={cause.name}
        categories={cause.categories}
        mediaTheme={cause.mediaTheme}
        compact={!vertical}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getScopeBadgeClass(cause.scope)}`}>
          {cause.scope}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getTypeBadgeClass(cause.type)}`}>
          {cause.type}
        </span>
        {categories.slice(0, 1).map((category) => (
          <span key={category} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getCategoryBadgeClass(category)}`}>
            {category.replace(/-/g, " ")}
          </span>
        ))}
      </div>

      <div className="mt-4 flex-1">
        <h3 className="line-clamp-2 text-lg font-display font-bold text-foreground">{cause.name}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{cause.description}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="flex items-center gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-colors hover:bg-muted"
              aria-label={`Open ${cause.name} website`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        <button
          type="button"
          disabled={isAdded}
          onClick={(event) => {
            event.stopPropagation();
            onAdd(cause);
          }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${isAdded ? "bg-emerald-50 text-emerald-800" : canManageCauses ? "bg-primary text-white shadow-bouncy" : "border border-border bg-card text-muted-foreground"}`}
        >
          {isAdded ? <Check className="mr-2 inline h-4 w-4" /> : canManageCauses ? <Plus className="mr-2 inline h-4 w-4" /> : null}
          {primaryLabel}
        </button>
      </div>
    </article>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
