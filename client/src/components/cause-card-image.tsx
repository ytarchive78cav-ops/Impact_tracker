import { useEffect, useState } from "react";
import { BookOpen, Droplets, Globe2, HeartHandshake, HelpingHand, Leaf, Trees } from "lucide-react";

type MediaTheme = "water" | "food" | "education" | "environment" | "health" | "community" | "housing" | "finance";

const THEME_STYLES: Record<MediaTheme, {
  icon: typeof Droplets;
  label: string;
  cardClassName: string;
  orbClassName: string;
}> = {
  water: {
    icon: Droplets,
    label: "Water access",
    cardClassName: "bg-[linear-gradient(135deg,#dff4ff_0%,#a7d9ff_100%)] text-sky-950",
    orbClassName: "bg-sky-100/80 border-sky-200/70",
  },
  food: {
    icon: HelpingHand,
    label: "Food support",
    cardClassName: "bg-[linear-gradient(135deg,#fff1d9_0%,#ffc98f_100%)] text-amber-950",
    orbClassName: "bg-amber-100/80 border-amber-200/70",
  },
  education: {
    icon: BookOpen,
    label: "Education",
    cardClassName: "bg-[linear-gradient(135deg,#ece9ff_0%,#b9b3ff_100%)] text-indigo-950",
    orbClassName: "bg-indigo-100/80 border-indigo-200/70",
  },
  environment: {
    icon: Trees,
    label: "Environment",
    cardClassName: "bg-[linear-gradient(135deg,#e4f7e6_0%,#9ad89e_100%)] text-emerald-950",
    orbClassName: "bg-emerald-100/80 border-emerald-200/70",
  },
  health: {
    icon: HeartHandshake,
    label: "Health",
    cardClassName: "bg-[linear-gradient(135deg,#ffe5ea_0%,#ffb4c4_100%)] text-rose-950",
    orbClassName: "bg-rose-100/80 border-rose-200/70",
  },
  community: {
    icon: Globe2,
    label: "Community",
    cardClassName: "bg-[linear-gradient(135deg,#f1ede5_0%,#d7c4aa_100%)] text-stone-950",
    orbClassName: "bg-stone-100/80 border-stone-200/70",
  },
  housing: {
    icon: HelpingHand,
    label: "Housing support",
    cardClassName: "bg-[linear-gradient(135deg,#fff1ec_0%,#ffc2ae_100%)] text-orange-950",
    orbClassName: "bg-orange-100/80 border-orange-200/70",
  },
  finance: {
    icon: Leaf,
    label: "Economic support",
    cardClassName: "bg-[linear-gradient(135deg,#ebf8e8_0%,#b7dfad_100%)] text-lime-950",
    orbClassName: "bg-lime-100/80 border-lime-200/70",
  },
};

function inferTheme(title: string, categories?: string[], mediaTheme?: MediaTheme): MediaTheme {
  if (mediaTheme) return mediaTheme;
  const haystack = `${title} ${(categories ?? []).join(" ")}`.toLowerCase();
  if (haystack.includes("water")) return "water";
  if (haystack.includes("food")) return "food";
  if (haystack.includes("education") || haystack.includes("literacy") || haystack.includes("classroom")) return "education";
  if (haystack.includes("environment") || haystack.includes("cleanup") || haystack.includes("tree")) return "environment";
  if (haystack.includes("health") || haystack.includes("clinic") || haystack.includes("crisis")) return "health";
  if (haystack.includes("shelter") || haystack.includes("housing")) return "housing";
  if (haystack.includes("loan") || haystack.includes("finance") || haystack.includes("economic")) return "finance";
  return "community";
}

export function CauseCardImage({
  imageUrl,
  imageAlt,
  title,
  categories,
  mediaTheme,
  compact = false,
  profile = false,
}: {
  imageUrl?: string | null;
  imageAlt?: string | null;
  title: string;
  categories?: string[];
  mediaTheme?: MediaTheme;
  compact?: boolean;
  profile?: boolean;
}) {
  const theme = THEME_STYLES[inferTheme(title, categories, mediaTheme)];
  const Icon = theme.icon;
  const heightClass = profile ? "aspect-[16/9]" : compact ? "h-40" : "h-44";
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  if (imageUrl && !hasImageError) {
    return (
      <div className={`relative overflow-hidden rounded-[1.5rem] bg-muted ${heightClass}`}>
        <img
          src={imageUrl}
          alt={imageAlt ?? title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
        {profile ? <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" /> : null}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border border-border/70 ${theme.cardClassName} ${heightClass}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_40%)]" />
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl" />
      <div className="relative flex h-full items-end justify-between px-5 py-5">
        <div className="max-w-[14rem]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">{theme.label}</p>
          <p className="mt-2 text-lg font-display font-bold leading-tight">{title}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border bg-white/60 shadow-sm ${theme.orbClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
