import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, ExternalLink, Globe2, Heart, Play, Share2, Users, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";

import { CauseCardImage } from "@/components/cause-card-image";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useCauses } from "@/hooks/use-causes";
import { useAddDiscoveryCause, useDiscoveryCauses } from "@/hooks/use-discovery";
import { useToast } from "@/hooks/use-toast";
import { APP_ROUTES } from "@/lib/app-routes";
import { getCategoryBadgeClass, getExternalHref, getScopeBadgeClass, getTypeBadgeClass } from "@/lib/cause-ui";
import { type DiscoveryCauseTemplate } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";

type AddModalState = {
  type: "donation" | "volunteer" | "either";
  tier: 1 | 2 | 3;
};

type DetailPanel =
  | { kind: "highlight"; title: string; description: string }
  | { kind: "action"; title: string; description: string }
  | { kind: "about"; title: string; description: string };

type CauseProfileModel = {
  tagline: string;
  highlights: Array<{ id: string; title: string; value: string; details: string }>;
  helpActions: Array<{ id: string; title: string; summary: string; details: string; icon: "donate" | "volunteer" | "share" | "fundraise" }>;
  stories: Array<{ id: string; title: string; summary: string; url?: string; label?: string }>;
  photos: Array<{ src: string; alt: string }>;
  videos: Array<{ id: string; title: string; source: string; url: string; embedUrl: string; thumbnailUrl: string }>;
  about: string;
  links: Array<{ label: string; url: string }>;
};

type HelpIcon = CauseProfileModel["helpActions"][number]["icon"];

function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    url.protocol = "https:";
    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
      "ref_src",
    ].forEach((key) => url.searchParams.delete(key));
    const cleanedPath = url.pathname.replace(/\/+$/, "") || "/";
    url.pathname = cleanedPath;
    const search = url.searchParams.toString();
    return `${url.origin.toLowerCase()}${url.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return null;
  }
}

function dedupeLinks(cause: DiscoveryCauseTemplate) {
  const sourceLinks = [
    cause.websiteUrl ? { label: "Official website", url: cause.websiteUrl } : null,
    ...(cause.additionalLinks ?? []),
  ].filter(Boolean) as Array<{ label: string; url: string }>;

  const seen = new Map<string, { label: string; url: string }>();

  sourceLinks.forEach((link) => {
    const normalized = normalizeUrl(link.url);
    if (!normalized) return;
    const current = seen.get(normalized);
    if (!current || link.label === "Official website") {
      seen.set(normalized, {
        label: current?.label === "Official website" ? current.label : link.label,
        url: normalized,
      });
    }
  });

  return Array.from(seen.values()).sort((a, b) => Number(b.label === "Official website") - Number(a.label === "Official website"));
}

function buildCauseProfileModel(cause: DiscoveryCauseTemplate): CauseProfileModel {
  const defaultHighlights = [
    {
      id: "move",
      title: "Best next move",
      value: cause.type === "either" ? "Choose your lane" : cause.type === "donation" ? "Donate" : "Volunteer",
      details: cause.type === "either"
        ? "This cause works well for either funding or hands-on service, so your Giving Space can match the next step to capacity."
        : cause.type === "donation"
          ? "This cause has a strong money-in, impact-out pattern, so it fits best when your Giving Space wants a clear donation action."
          : "This cause becomes more compelling when people show up with time, consistency, and a specific role to play.",
    },
    {
      id: "focus",
      title: "Impact focus",
      value: (cause.categories?.[0] ?? cause.scope).replace(/-/g, " "),
      details: cause.bio ?? cause.description,
    },
    {
      id: "where",
      title: "Where they work",
      value: cause.scope === "local" ? "Local / regional" : "Global",
      details: cause.scope === "local"
        ? "This cause is better when your Giving Space wants a nearby relationship, visible service, or local referrals."
        : "This cause is better when your Giving Space wants broader reach and global or distributed impact.",
    },
  ];

  const defaultHelpActions: CauseProfileModel["helpActions"] = [
    {
      id: "donate",
      title: "Donate",
      summary: cause.donationDetails ? "Support the mission directly." : "Fuel the work financially.",
      details: cause.donationDetails ?? "Direct gifts help this organization keep core programs running and increase capacity where the need is highest.",
      icon: "donate" as HelpIcon,
    },
    {
      id: "volunteer",
      title: "Volunteer",
      summary: cause.volunteerDetails ? "Show up with time and skills." : "Offer hands-on support.",
      details: cause.volunteerDetails ?? "Hands-on help can include event support, operations, outreach, tutoring, logistics, or community-facing service.",
      icon: "volunteer" as HelpIcon,
    },
    {
      id: "share",
      title: "Share",
      summary: "Bring others into the story.",
      details: "This cause becomes easier to support when your Giving Space shares one clear story, one clear ask, and one clear next step.",
      icon: "share" as HelpIcon,
    },
  ].filter((item) => (
    item.id === "donate" ? cause.type !== "volunteer" :
      item.id === "volunteer" ? cause.type !== "donation" :
        true
  ));

  const helpActions: CauseProfileModel["helpActions"] = (cause.helpActions ?? defaultHelpActions).map((action) => ({
    ...action,
    icon: action.icon ?? (
      action.id.includes("donat") ? "donate" :
        action.id.includes("volunteer") ? "volunteer" :
          action.id.includes("fund") ? "fundraise" :
            "share"
    ) as HelpIcon,
  }));

  const photos = [
    cause.imageUrl ? { src: cause.imageUrl, alt: cause.imageAlt ?? cause.name } : null,
    ...(cause.galleryImages ?? []),
  ].filter(Boolean) as Array<{ src: string; alt: string }>;

  const photoMap = new Map<string, { src: string; alt: string }>();
  photos.forEach((photo) => {
    const normalized = normalizeUrl(photo.src) ?? photo.src;
    if (!photoMap.has(normalized)) {
      photoMap.set(normalized, photo);
    }
  });

  const videos = (cause.videos ?? [])
    .filter((video) => Boolean(video.embedId && video.thumbnailUrl))
    .map((video) => ({
      id: video.id,
      title: video.title,
      source: video.source,
      url: video.url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${video.embedId}?rel=0&modestbranding=1&playsinline=1`,
      thumbnailUrl: video.thumbnailUrl!,
    }));

  return {
    tagline: cause.tagline ?? cause.description,
    highlights: cause.highlights ?? defaultHighlights,
    helpActions,
    stories: cause.stories ?? [],
    photos: Array.from(photoMap.values()),
    videos,
    about: cause.bio ?? cause.description,
    links: dedupeLinks(cause),
  };
}

function iconForAction(kind: CauseProfileModel["helpActions"][number]["icon"]) {
  switch (kind) {
    case "donate":
      return Heart;
    case "volunteer":
      return Users;
    case "fundraise":
      return Globe2;
    default:
      return Share2;
  }
}

export default function CauseProfilePage() {
  const [, params] = useRoute<{ id: string }>("/cause/:id");
  const [, setLocation] = useLocation();
  const { data: discoveryCauses = [] } = useDiscoveryCauses();
  const { data: givingSpaceCauses = [] } = useCauses();
  const addMutation = useAddDiscoveryCause();
  const { activeWorkspace, canManageCauses } = useUser();
  const { toast } = useToast();
  const [modalState, setModalState] = useState<AddModalState | null>(null);
  const [modalStatus, setModalStatus] = useState<"idle" | "saving" | "success">("idle");
  const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  const cause = useMemo(
    () => discoveryCauses.find((entry) => entry.id === params?.id) ?? null,
    [discoveryCauses, params?.id],
  );

  const profile = useMemo(
    () => (cause ? buildCauseProfileModel(cause) : null),
    [cause],
  );

  const existingCause = useMemo(() => {
    if (!cause) return null;
    return givingSpaceCauses.find((entry) => (
      entry.name.trim().toLowerCase() === cause.name.trim().toLowerCase()
      && (entry.link ?? "").trim().toLowerCase() === (cause.websiteUrl ?? "").trim().toLowerCase()
    )) ?? null;
  }, [cause, givingSpaceCauses]);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    setActiveVideoId(profile?.videos[0]?.id ?? null);
  }, [profile?.videos]);

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

  if (!cause || !profile) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <button type="button" onClick={() => setLocation(APP_ROUTES.discover)} className="mb-6 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="mr-2 inline h-4 w-4" />
          Back to Discover
        </button>
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <h1 className="text-2xl font-display font-bold text-foreground">Cause not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This cause is no longer available in Discover.</p>
        </div>
      </div>
    );
  }

  const activeVideo = profile.videos.find((video) => video.id === activeVideoId) ?? profile.videos[0] ?? null;
  const visibleLinks = profile.links.slice(0, 3);
  const hiddenLinks = profile.links.slice(3);

  const openAddSheet = () => {
    if (existingCause) {
      setLocation(APP_ROUTES.causes);
      return;
    }
    if (!canManageCauses) {
      toast({
        title: "Admin required",
        description: "Only Giving Space owners and admins can add causes.",
      });
      return;
    }
    setModalStatus("idle");
    setModalState({ type: cause.type, tier: cause.tier });
  };

  const handleConfirmAdd = async () => {
    if (!modalState) return;
    setModalStatus("saving");

    try {
      await addMutation.mutateAsync({
        templateId: cause.id,
        type: modalState.type,
        tier: modalState.tier,
        scope: cause.scope,
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

  return (
    <div className="mx-auto max-w-5xl pb-[calc(106px+var(--safe-area-bottom))] pt-4 md:pt-6">
      <button type="button" onClick={() => setLocation(APP_ROUTES.discover)} className="mb-4 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="mr-2 inline h-4 w-4" />
        Back to Discover
      </button>

      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
        <div className="p-3">
          <CauseCardImage
            imageUrl={cause.imageUrl}
            imageAlt={cause.imageAlt}
            title={cause.name}
            categories={cause.categories}
            mediaTheme={cause.mediaTheme}
            profile
          />
        </div>

        <div className="px-4 pb-5 pt-1 md:px-5">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getScopeBadgeClass(cause.scope)}`}>{cause.scope}</span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getTypeBadgeClass(cause.type)}`}>{cause.type}</span>
            {(cause.categories ?? []).slice(0, 3).map((category) => (
              <span key={category} className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getCategoryBadgeClass(category)}`}>
                {category.replace(/-/g, " ")}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-[2rem] font-display font-bold leading-tight text-foreground">{cause.name}</h1>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{profile.tagline}</p>
            </div>

            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={openAddSheet}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${existingCause ? "border border-border bg-card text-foreground" : "bg-primary text-white shadow-bouncy"}`}
              >
                {existingCause ? "Added" : "Add to Giving Space"}
              </button>
              {getExternalHref(cause.websiteUrl) ? (
                <a
                  href={getExternalHref(cause.websiteUrl)!}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
                >
                  <ExternalLink className="mr-2 inline h-4 w-4" />
                  Visit website
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex gap-3">
            {profile.highlights.map((highlight) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => setDetailPanel({ kind: "highlight", title: highlight.title, description: highlight.details })}
                className="w-[13.5rem] shrink-0 rounded-[1.5rem] border border-border bg-card px-4 py-4 text-left shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{highlight.title}</p>
                <p className="mt-2 text-lg font-display font-bold text-foreground">{highlight.value}</p>
                <p className="mt-3 text-xs font-semibold text-primary">Tap for details</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeVideo ? (
        <section className="mt-4 rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground">Videos</h2>
            <p className="text-xs font-medium text-muted-foreground">{profile.videos.length} available</p>
          </div>

          <div className="overflow-hidden rounded-[1.35rem] border border-border bg-black">
            <div className="aspect-video">
              <iframe
                key={activeVideo.id}
                src={activeVideo.embedUrl}
                title={activeVideo.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <div className="mt-3 -mx-1 overflow-x-auto px-1">
            <div className="flex gap-3">
              {profile.videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setActiveVideoId(video.id)}
                  className={`w-[14rem] shrink-0 overflow-hidden rounded-[1.25rem] border bg-card text-left transition-all ${video.id === activeVideo.id ? "border-primary shadow-bouncy" : "border-border shadow-soft"}`}
                >
                  <div className="relative aspect-video bg-muted">
                    <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-foreground shadow-soft">
                        <Play className="ml-0.5 h-4.5 w-4.5" />
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-3">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{video.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{video.source}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {profile.photos.length > 0 ? (
        <section className="mt-4 rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground">Photos</h2>
            <p className="text-xs font-medium text-muted-foreground">{profile.photos.length} images</p>
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex gap-3">
              {profile.photos.map((photo, index) => (
                <div key={`${photo.src}-${index}`} className="w-[15.5rem] shrink-0 overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-soft">
                  <img src={photo.src} alt={photo.alt} className="aspect-[4/3] h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {profile.stories.length > 0 ? (
        <section className="mt-4 rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground">Updates & Stories</h2>
            <p className="text-xs font-medium text-muted-foreground">Explore the mission</p>
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex gap-3">
              {profile.stories.map((story) => (
                <div key={story.id} className="w-[16rem] shrink-0 rounded-[1.25rem] border border-border bg-muted/20 px-4 py-4 shadow-soft">
                  <p className="text-sm font-semibold text-foreground">{story.title}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{story.summary}</p>
                  {story.url ? (
                    <a href={story.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
                      {story.label ?? "Open link"}
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-display font-bold text-foreground">About</h2>
            <button
              type="button"
              onClick={() => setDetailPanel({ kind: "about", title: `About ${cause.name}`, description: profile.about })}
              className="text-sm font-semibold text-primary"
            >
              Read more
            </button>
          </div>
          <p className={`mt-3 text-sm leading-6 text-muted-foreground ${isAboutExpanded ? "" : "line-clamp-3"}`}>
            {profile.about}
          </p>
          <button type="button" onClick={() => setIsAboutExpanded((current) => !current)} className="mt-3 text-sm font-semibold text-primary">
            {isAboutExpanded ? "Show less" : "Read more"}
          </button>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <h2 className="text-lg font-display font-bold text-foreground">How you can help</h2>
          <div className="mt-3 grid gap-3">
            {profile.helpActions.map((action) => {
              const Icon = iconForAction(action.icon);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setDetailPanel({ kind: "action", title: action.title, description: action.details })}
                  className="flex items-center justify-between rounded-[1.15rem] border border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/35"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.summary}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {profile.links.length > 0 ? (
        <section className="mt-4 rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground">Links</h2>
            <p className="text-xs font-medium text-muted-foreground">{profile.links.length} destinations</p>
          </div>
          <div className="grid gap-2">
            {visibleLinks.map((link) => (
              <LinkRow key={link.url} label={link.label} url={link.url} />
            ))}
          </div>
          {hiddenLinks.length > 0 ? (
            <button
              type="button"
              onClick={() => setDetailPanel({
                kind: "highlight",
                title: "More links",
                description: hiddenLinks.map((link) => `${link.label}: ${link.url}`).join("\n"),
              })}
              className="mt-3 text-sm font-semibold text-primary"
            >
              More links
            </button>
          ) : null}
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(16px,calc(var(--safe-area-bottom)+16px))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-3">
          <button
            type="button"
            onClick={openAddSheet}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${existingCause ? "border border-border bg-card text-foreground" : "bg-primary text-white shadow-bouncy"}`}
          >
            {existingCause ? "Added" : "Add to Giving Space"}
          </button>
          {existingCause ? (
            <button
              type="button"
              onClick={() => setLocation(APP_ROUTES.causes)}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
            >
              View in Library
            </button>
          ) : null}
        </div>
      </div>

      <DetailDrawer panel={detailPanel} onOpenChange={(open) => !open && setDetailPanel(null)} />

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
              className="fixed inset-x-4 bottom-4 z-[73] mx-auto flex max-h-[min(82dvh,44rem)] w-auto max-w-lg flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active Giving Space</p>
                  <h2 className="mt-1 text-xl font-display font-bold text-foreground">Add to Giving Space</h2>
                  <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? "No Giving Space selected"}</p>
                </div>
                <button type="button" onClick={() => setModalState(null)} className="rounded-full bg-muted p-2 text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                <p className="text-base font-semibold text-foreground">{cause.name}</p>
                <div className="mt-6 space-y-5">
                  <SheetField label="Type">
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
                  </SheetField>
                  <SheetField label="Tier">
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
                  </SheetField>
                </div>
              </div>

              <div className="border-t border-border bg-background/95 px-5 pb-[max(16px,calc(var(--safe-area-bottom)+16px))] pt-4 backdrop-blur">
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModalState(null)} className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAdd}
                    disabled={modalStatus === "saving" || modalStatus === "success"}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-bouncy ${modalStatus === "success" ? "bg-emerald-600" : "bg-primary"} disabled:opacity-90`}
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

function DetailDrawer({
  panel,
  onOpenChange,
}: {
  panel: DetailPanel | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={Boolean(panel)} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[82dvh] rounded-t-[2rem] border-border/70 bg-card px-0 pb-0 shadow-soft">
        {panel ? (
          <>
            <DrawerHeader className="px-5 pb-3 pt-2 text-left">
              <DrawerTitle>{panel.title}</DrawerTitle>
              <DrawerDescription>
                {panel.kind === "about" ? "Expanded profile" : panel.kind === "action" ? "Ways your Giving Space can engage" : "Cause highlight"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-5 pb-[max(20px,calc(var(--safe-area-bottom)+20px))] text-sm leading-7 text-muted-foreground whitespace-pre-line">
              {panel.description}
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-[1.15rem] border border-border bg-muted/20 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/35"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Globe2 className="h-4 w-4" />
        </div>
        <span>{label}</span>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
