export function getTierBadgeClass(tier: number) {
  switch (tier) {
    case 1:
      return "bg-rose-100 text-rose-900 border border-rose-200";
    case 2:
      return "bg-amber-200 text-amber-950 border border-amber-300";
    case 3:
      return "bg-emerald-100 text-emerald-900 border border-emerald-200";
    default:
      return "bg-muted text-foreground border border-border";
  }
}

export function getExternalHref(link?: string | null) {
  if (!link) return null;

  const trimmed = link.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getScopeBadgeClass(scope?: string | null) {
  if (scope?.toLowerCase() === "local") {
    return "bg-sky-100 text-sky-900 border border-sky-200";
  }
  if (scope?.toLowerCase() === "global") {
    return "bg-slate-100 text-slate-900 border border-slate-200";
  }
  return "bg-muted text-muted-foreground border border-border";
}

export function getTypeBadgeClass(type?: string | null) {
  if (type === "volunteer") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }
  if (type === "donation") {
    return "bg-amber-50 text-amber-900 border border-amber-200";
  }
  return "bg-stone-100 text-stone-900 border border-stone-200";
}

export function getCategoryBadgeClass(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("environment")) return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (normalized.includes("health")) return "bg-rose-50 text-rose-800 border border-rose-200";
  if (normalized.includes("education")) return "bg-indigo-50 text-indigo-800 border border-indigo-200";
  if (normalized.includes("community")) return "bg-orange-50 text-orange-800 border border-orange-200";
  return "bg-muted text-muted-foreground border border-border";
}
