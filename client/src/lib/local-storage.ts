import type { Cause, InsertCause, InsertSettings, MonthlyLog, Settings } from "@shared/routes";
import {
  coerceCadence,
  coerceGivingDayOfWeek,
  ensureBiweeklyAnchorDate,
  getPeriodMonthDistance,
  getPeriodStartDate,
} from "./cadence";

export const LOCAL_STORAGE_KEYS = {
  users: "impact_users_v2",
  session: "impact_session_v2",
  workspaces: "impact_workspaces_v2",
  memberships: "impact_memberships_v2",
  workspaceSettings: "impact_workspace_settings_v2",
  causes: "impact_causes_v2",
  monthlyRituals: "impact_monthly_rituals_v2",
  ritualEntries: "impact_ritual_entries_v2",
  impactLogs: "impact_impact_logs_v2",
  discovery: "impact_discovery_v1",
  activeWorkspacePrefix: "impact_active_workspace_v2",
  meta: "impact_storage_meta_v2",
  nextCauseIdPrefix: "impact_next_cause_id_v2",
  nextRitualEntryIdPrefix: "impact_next_ritual_entry_id_v2",
  nextImpactLogIdPrefix: "impact_next_impact_log_id_v2",
} as const;

const LEGACY_KEYS = {
  users: "impact_users_v1",
  session: "impact_session_v1",
  workspaces: "impact_workspaces_v1",
  memberships: "impact_memberships_v1",
  activeWorkspacePrefix: "impact_active_workspace_v1",
  causesPrefix: "impact_causes_v1",
  monthlyLogsPrefix: "impact_monthly_logs_v1",
  settingsPrefix: "impact_settings_v1",
  nextCauseId: "impact_next_cause_id_v1",
  nextMonthlyLogId: "impact_next_monthly_log_id_v1",
} as const;

const STORAGE_VERSION = 3;

export const DEV_AUTH_PRESETS = {
  david: {
    displayName: "David",
    username: "david",
    password: "david-dev-2026",
  },
  arlayna: {
    displayName: "Arlayna",
    username: "arlayna",
    password: "arlayna-dev-2026",
  },
} as const;

export type WorkspaceType =
  | "personal"
  | "relationship"
  | "family"
  | "group"
  | "church"
  | "organization";

export type MembershipRole = "owner" | "co-owner" | "admin" | "viewer";
export type MembershipStatus = "approved" | "pending" | "rejected";
export type CauseScope = "local" | "global";

export interface LocalLocation {
  country: string;
  region: string;
  city: string;
  postalCode?: string;
}

export interface LocalUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  defaultLocation?: LocalLocation | null;
  avatarDataUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSession {
  userId: string;
  createdAt: string;
}

export interface LocalWorkspace {
  id: string;
  name: string;
  type: WorkspaceType;
  createdByUserId: string;
  joinCode: string;
  avatarDataUrl?: string | null;
  location?: LocalLocation | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt: string;
  approvedAt?: string;
  approvedByUserId?: string;
}

export interface LocalWorkspaceSettings {
  workspaceId: string;
  cadence: "monthly" | "biweekly" | "weekly";
  givingDayOfWeek: number;
  biweeklyAnchorDate?: string | null;
  volunteerMonthsPerYear: number;
  tierWeights: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  preventRepeatsMonths: number;
  seasonalMode: boolean;
  updatedAt: string;
}

export interface LocalCauseRecord {
  workspaceId: string;
  causeId: number;
  name: string;
  type: "donation" | "volunteer" | "either";
  tier: 1 | 2 | 3;
  scope?: CauseScope;
  description: string;
  websiteUrl?: string | null;
  submittedByUserId: string;
  location?: string | null;
  tags?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMonthlyRitual {
  workspaceId: string;
  monthKey: string;
  revealedCauseIds: number[];
  chosenByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRitualEntry {
  id: number;
  workspaceId: string;
  monthKey: string;
  causeId: number;
  kind: "donation" | "volunteer";
  chosenByUserId: string;
  impactLogId?: number;
  amount?: number;
  hours?: number;
  date?: string;
  note?: string;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalImpactLog {
  logId: number;
  workspaceId: string;
  ritualEntryId?: number;
  monthKey: string;
  causeId: number;
  kind: "donation" | "volunteer";
  amount?: number;
  hours?: number;
  date: string;
  note?: string;
  photo?: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface DiscoveryCauseTemplate {
  id: string;
  scope: CauseScope;
  categories: string[];
  name: string;
  type: "donation" | "volunteer" | "either";
  tier: 1 | 2 | 3;
  description: string;
  websiteUrl?: string;
  location?: string;
  tags?: string;
  imageUrl?: string;
  imageAlt?: string;
  mediaTheme?: "water" | "food" | "education" | "environment" | "health" | "community" | "housing" | "finance";
  tagline?: string;
  highlights?: Array<{ id: string; title: string; value: string; details: string }>;
  galleryImages?: Array<{ src: string; alt: string }>;
  bio?: string;
  donationDetails?: string;
  volunteerDetails?: string;
  helpActions?: Array<{ id: string; title: string; summary: string; details: string; icon?: "donate" | "volunteer" | "share" | "fundraise" }>;
  stories?: Array<{ id: string; title: string; summary: string; url?: string; label?: string }>;
  additionalLinks?: Array<{ label: string; url: string }>;
  videos?: Array<{ id: string; title: string; url: string; source: string; embedId: string; thumbnailUrl?: string }>;
}

interface StorageMeta {
  schemaVersion: number;
  migratedAt: string;
}

interface LegacyUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

interface LegacyWorkspace {
  workspaceId: string;
  name: string;
  type: "personal" | "partnership" | "group";
  createdBy: string;
  createdAt: string;
}

interface LegacyMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "member";
  createdAt: string;
}

const DISCOVERY_SEED: DiscoveryCauseTemplate[] = [
  {
    id: "disc_food_bank",
    scope: "local",
    categories: ["community", "health"],
    name: "Neighborhood Food Bank",
    type: "donation",
    tier: 1,
    description: "Support pantry staples and emergency grocery programs in your city.",
    websiteUrl: "https://www.feedingamerica.org/find-your-local-foodbank",
    location: "Local",
    tags: "food, community, relief",
  },
  {
    id: "disc_cleanup",
    scope: "local",
    categories: ["environment", "community"],
    name: "Park Cleanup Crew",
    type: "volunteer",
    tier: 2,
    description: "Join a monthly cleanup for parks, trails, beaches, or neighborhood blocks.",
    websiteUrl: "https://kab.org/programs/great-american-cleanup/",
    location: "Local",
    tags: "environment, cleanup, community",
  },
  {
    id: "disc_literacy",
    scope: "local",
    categories: ["education", "community"],
    name: "Adult Literacy Tutors",
    type: "volunteer",
    tier: 2,
    description: "Volunteer with a literacy nonprofit helping adults build reading confidence.",
    websiteUrl: "https://www.proliteracy.org/",
    location: "Local",
    tags: "education, tutoring",
  },
  {
    id: "disc_shelter",
    scope: "local",
    categories: ["community", "health"],
    name: "Family Shelter Support",
    type: "either",
    tier: 1,
    description: "Donate supplies or volunteer time with a shelter serving families in crisis.",
    websiteUrl: "https://www.familypromise.org/",
    location: "Local",
    tags: "housing, relief, family",
  },
  {
    id: "disc_mutual_aid",
    scope: "local",
    categories: ["community", "health"],
    name: "Mutual Aid Network",
    type: "either",
    tier: 1,
    description: "Contribute funds or coordination time to a local mutual aid circle.",
    websiteUrl: "https://www.mutualaidhub.org/",
    location: "Regional",
    tags: "mutual-aid, relief",
  },
  {
    id: "disc_charity_water",
    scope: "global",
    categories: ["health", "global-high-impact"],
    name: "Clean Water Access",
    type: "donation",
    tier: 1,
    description: "Fund clean water infrastructure in communities without reliable access.",
    websiteUrl: "https://www.charitywater.org/",
    location: "Global",
    tags: "water, health",
  },
  {
    id: "disc_kiva",
    scope: "global",
    categories: ["community", "global-high-impact"],
    name: "Microloan Circle",
    type: "donation",
    tier: 2,
    description: "Pool funds to back small entrepreneurs through community lending.",
    websiteUrl: "https://www.kiva.org/",
    location: "Global",
    tags: "economic, lending",
  },
  {
    id: "disc_crisis_text",
    scope: "global",
    categories: ["health", "community"],
    name: "Crisis Text Support",
    type: "volunteer",
    tier: 2,
    description: "Train to volunteer for digital crisis support and compassionate response.",
    websiteUrl: "https://www.crisistextline.org/become-a-volunteer/",
    location: "Remote",
    tags: "mental-health, volunteer",
  },
  {
    id: "disc_refugee",
    scope: "global",
    categories: ["community", "global-high-impact"],
    name: "Refugee Family Support",
    type: "either",
    tier: 1,
    description: "Donate or volunteer with organizations helping refugee families resettle.",
    websiteUrl: "https://www.rescue.org/",
    location: "Global",
    tags: "refugee, relief",
  },
  {
    id: "disc_plant_trees",
    scope: "global",
    categories: ["environment"],
    name: "Reforestation Projects",
    type: "donation",
    tier: 3,
    description: "Support tree planting and land restoration in climate-vulnerable regions.",
    websiteUrl: "https://onetreeplanted.org/",
    location: "Global",
    tags: "climate, environment",
  },
  {
    id: "disc_clinic_van",
    scope: "local",
    categories: ["health", "community"],
    name: "Mobile Clinic Support",
    type: "either",
    tier: 2,
    description: "Back mobile health clinics that bring screenings and care into underserved neighborhoods.",
    websiteUrl: "https://www.mobilehealthmap.org/",
    location: "Local",
    tags: "health, community",
  },
  {
    id: "disc_classroom_supply",
    scope: "global",
    categories: ["education", "global-high-impact"],
    name: "Classroom Supply Fund",
    type: "donation",
    tier: 2,
    description: "Help teachers and schools secure the supplies students need to learn well.",
    websiteUrl: "https://www.donorschoose.org/",
    location: "Global",
    tags: "education, classroom",
  },
];

const DISCOVERY_DETAILS: Record<string, Partial<DiscoveryCauseTemplate>> = {
  disc_food_bank: {
    imageUrl: "https://www.feedingamerica.org/sites/default/files/styles/max_650x650/public/2022-07/FA_Overview_BrentStirton_001_1.png.webp?itok=KGLJr7z5",
    imageAlt: "Volunteers and families at a Feeding America food distribution event.",
    mediaTheme: "food",
    tagline: "Direct grocery support for families facing hunger.",
    highlights: [
      { id: "move", title: "Best next move", value: "Monthly giving", details: "Recurring donations help food banks plan pantry inventory, refrigeration, and local distribution with less volatility." },
      { id: "focus", title: "Impact focus", value: "Food security", details: "These programs center emergency groceries, pantry staples, and neighborhood pickup access." },
      { id: "where", title: "Where they work", value: "Local network", details: "Use the official finder to connect your Giving Space to a nearby member food bank." },
    ],
    bio: "Neighborhood food banks connect families to groceries, produce, and emergency staples through local distribution sites, mobile pantries, and school partnerships.",
    donationDetails: "Fund pantry staples, refrigeration, and emergency grocery boxes for households facing short-term food insecurity.",
    volunteerDetails: "Sort donations, stock shelves, pack family boxes, and help with community distribution days.",
    helpActions: [
      { id: "donate", title: "Donate", summary: "Keep pantry shelves stocked.", details: "Fund groceries, refrigeration, and seasonal demand spikes with direct support." },
      { id: "volunteer", title: "Volunteer", summary: "Pack and distribute food.", details: "Volunteer for sorting, intake, packing, and community distribution events." },
      { id: "share", title: "Share", summary: "Connect local families.", details: "Share the finder tool, volunteer dates, and urgent drive needs with your community." },
    ],
    additionalLinks: [{ label: "Find a local food bank", url: "https://www.feedingamerica.org/find-your-local-foodbank" }],
  },
  disc_cleanup: {
    mediaTheme: "environment",
    bio: "Cleanup crews strengthen parks, waterways, and neighborhoods by organizing recurring care days that are simple for new volunteers to join.",
    donationDetails: "Support gloves, bags, grabbers, native plants, and cleanup-day supplies.",
    volunteerDetails: "Join monthly cleanup crews, help coordinate routes, or support registration and sorting.",
    additionalLinks: [{ label: "Great American Cleanup", url: "https://kab.org/programs/great-american-cleanup/" }],
  },
  disc_literacy: {
    imageUrl: "https://www.proliteracy.org/wp-content/uploads/2022/09/ProLiteracy-Header-Image-NEW-1.jpg",
    imageAlt: "Adult learners and tutors in a ProLiteracy program setting.",
    mediaTheme: "education",
    bio: "Adult literacy programs pair learners with tutors, conversation partners, and practical coaching that improves confidence, employment access, and civic participation.",
    volunteerDetails: "Tutor reading, lead conversation practice, or support learner intake and scheduling.",
    additionalLinks: [{ label: "ProLiteracy", url: "https://www.proliteracy.org/" }],
  },
  disc_shelter: {
    imageUrl: "https://familypromise.org/wp-content/uploads/2023/12/Family-Promise-Brand-Story.jpg",
    imageAlt: "Family Promise volunteers and families in a home support setting.",
    mediaTheme: "housing",
    tagline: "Housing stability support for families in crisis.",
    highlights: [
      { id: "move", title: "Best next move", value: "Host + donate", details: "Family shelter support often works best when financial support and local volunteer help are paired." },
      { id: "focus", title: "Impact focus", value: "Prevention + shelter", details: "Programs span emergency shelter, homelessness prevention, and long-term family stability." },
      { id: "where", title: "Where they work", value: "National network", details: "Family Promise works through local affiliates, so your Giving Space can support a nearby chapter." },
    ],
    bio: "Family shelters provide immediate housing stability, case management, meals, and wraparound support while families move toward longer-term housing.",
    donationDetails: "Contribute hygiene kits, children’s items, meal support, or direct operating funds.",
    volunteerDetails: "Prepare meals, organize supply rooms, support children’s programming, or help with move-in readiness.",
    helpActions: [
      { id: "donate", title: "Donate", summary: "Cover family essentials.", details: "Funds support housing stability, prevention services, and practical needs like meals and supplies." },
      { id: "volunteer", title: "Volunteer", summary: "Support family hosting.", details: "Serve meals, welcome families, or help with local affiliate logistics." },
      { id: "fundraise", title: "Fundraise", summary: "Rally your network.", details: "A Giving Space can run a targeted drive for hygiene kits, children's items, or prevention funds." },
    ],
    stories: [
      { id: "story-network", title: "How the affiliate model works", summary: "Family Promise organizes support through local affiliates, making it easier to pair national credibility with neighborhood action.", url: "https://familypromise.org/", label: "Explore Family Promise" },
    ],
    additionalLinks: [{ label: "Family Promise", url: "https://www.familypromise.org/" }],
  },
  disc_mutual_aid: {
    mediaTheme: "community",
    bio: "Mutual aid networks coordinate direct neighbor-to-neighbor support for food, transit, emergency bills, and urgent needs that formal systems often miss.",
    donationDetails: "Fund direct relief requests, emergency transportation, medicine pickups, and short-term rent support.",
    volunteerDetails: "Help with intake, delivery coordination, outreach, and request triage.",
    additionalLinks: [{ label: "Mutual Aid Hub", url: "https://www.mutualaidhub.org/" }],
  },
  disc_charity_water: {
    imageUrl: "https://www.charitywater.org/vite/assets/hero-image-1-D-2QxYyl.jpg",
    imageAlt: "Community members gathered around clean water access supported by charity: water.",
    mediaTheme: "water",
    tagline: "Clean water projects with visible, story-driven impact.",
    highlights: [
      { id: "move", title: "Best next move", value: "Donation first", details: "This cause is strongest as a funding-focused Giving Space action because the core impact comes from completed water projects." },
      { id: "focus", title: "Impact focus", value: "Water access", details: "Funding supports wells, filtration, piping, monitoring, and long-term maintenance for communities without reliable clean water." },
      { id: "where", title: "Where they work", value: "Global field partners", details: "charity: water funds projects through vetted local partners in communities facing long-term water access challenges." },
      { id: "proof", title: "Why it stands out", value: "Story-rich", details: "This organization pairs strong visual storytelling with clear project-based giving, making it easy for a Giving Space to stay engaged." },
    ],
    galleryImages: [
      { src: "https://www.charitywater.org/vite/assets/hero-image-1-D-2QxYyl.jpg", alt: "charity: water field imagery showing community members around clean water access." },
    ],
    bio: "Clean water organizations fund wells, filtration systems, piping, and local maintenance models that improve health and economic stability.",
    donationDetails: "Support water infrastructure, maintenance training, and long-term community ownership.",
    helpActions: [
      { id: "donate", title: "Donate", summary: "Fund a water project.", details: "Direct gifts can support water systems, field partner implementation, and long-term upkeep." },
      { id: "share", title: "Share", summary: "Tell the story visually.", details: "This cause works well when your Giving Space shares project imagery and stories to build momentum." },
      { id: "fundraise", title: "Fundraise", summary: "Run a campaign", details: "A small Giving Space can build a focused campaign around one clear global need: clean water access." },
    ],
    stories: [
      { id: "story-projects", title: "Project-based giving", summary: "charity: water is known for framing support around tangible water projects that donors can emotionally follow and talk about.", url: "https://www.charitywater.org/", label: "See the mission" },
    ],
    videos: [
      { id: "cw-story", title: "charity: water story", url: "https://www.youtube.com/watch?v=ZGbPXHIxh4c", source: "charity: water", embedId: "ZGbPXHIxh4c", thumbnailUrl: "https://i.ytimg.com/vi/ZGbPXHIxh4c/hqdefault.jpg" },
      { id: "cw-mission", title: "Mission overview", url: "https://www.youtube.com/watch?v=taCK9RXvs3g", source: "charity: water", embedId: "taCK9RXvs3g", thumbnailUrl: "https://i.ytimg.com/vi/taCK9RXvs3g/hqdefault.jpg" },
    ],
    additionalLinks: [
      { label: "charity: water", url: "https://www.charitywater.org/" },
      { label: "Donate", url: "https://www.charitywater.org/donate" },
    ],
  },
  disc_kiva: {
    imageUrl: "https://www.kiva.org/cms/kiva-hp-og-image.jpg",
    imageAlt: "Kiva borrowers and community entrepreneurs featured by Kiva.",
    mediaTheme: "finance",
    bio: "Microloan platforms let communities back entrepreneurs and small business owners through accessible lending circles and peer support.",
    donationDetails: "Pool funds into small loans for entrepreneurs, farmers, and local business builders.",
    tagline: "Back entrepreneurs through community-powered microloans.",
    additionalLinks: [{ label: "Kiva", url: "https://www.kiva.org/" }],
  },
  disc_crisis_text: {
    mediaTheme: "health",
    bio: "Digital crisis support expands access to compassionate care by training volunteers to respond safely to people in moments of acute distress.",
    volunteerDetails: "Complete training, take remote shifts, and support texters using a structured intervention model.",
    additionalLinks: [{ label: "Become a volunteer", url: "https://www.crisistextline.org/become-a-volunteer/" }],
  },
  disc_refugee: {
    mediaTheme: "community",
    bio: "Refugee support programs help families with resettlement, housing, language access, legal navigation, and belonging in a new community.",
    donationDetails: "Support housing setup, case management, school enrollment, and emergency family relief.",
    volunteerDetails: "Help welcome families, furnish homes, mentor newcomers, or assist with transportation.",
    additionalLinks: [{ label: "International Rescue Committee", url: "https://www.rescue.org/" }],
  },
  disc_plant_trees: {
    mediaTheme: "environment",
    bio: "Reforestation efforts restore ecosystems, stabilize soil, improve watershed health, and create local resilience in climate-vulnerable regions.",
    donationDetails: "Fund nursery operations, land restoration, and long-term stewardship for reforestation sites.",
    additionalLinks: [{ label: "One Tree Planted", url: "https://onetreeplanted.org/" }],
  },
  disc_clinic_van: {
    mediaTheme: "health",
    bio: "Mobile clinics bring preventive screenings, primary care touchpoints, and health navigation directly into underserved neighborhoods.",
    donationDetails: "Support fuel, staffing, supplies, and community health outreach for mobile clinic days.",
    volunteerDetails: "Assist with intake, event setup, logistics, or community awareness campaigns.",
    additionalLinks: [{ label: "Mobile Health Map", url: "https://www.mobilehealthmap.org/" }],
  },
  disc_classroom_supply: {
    mediaTheme: "education",
    tagline: "Direct classroom needs, funded one teacher at a time.",
    bio: "Classroom supply funds help teachers meet real-time student needs with books, creative materials, science kits, and daily essentials.",
    donationDetails: "Back teacher-led supply requests and classroom projects with direct material impact.",
    additionalLinks: [{ label: "DonorsChoose", url: "https://www.donorschoose.org/" }],
  },
};

function requireWindow() {
  if (typeof window === "undefined") {
    throw new Error("Local storage is unavailable during server rendering.");
  }
}

function now() {
  return new Date().toISOString();
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getScopedKey(prefix: string, scope: string) {
  return `${prefix}:${scope}`;
}

function readArray<T>(key: string) {
  if (typeof window === "undefined") return [] as T[];
  return safeParse<T[]>(window.localStorage.getItem(key), []);
}

function writeValue<T>(key: string, value: T) {
  requireWindow();
  window.localStorage.setItem(key, JSON.stringify(value));
}

function asDate(value: string | Date | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function nextScopedId(prefix: string, scope: string) {
  requireWindow();
  const key = getScopedKey(prefix, scope);
  const current = Number(window.localStorage.getItem(key) ?? "1");
  window.localStorage.setItem(key, String(current + 1));
  return current;
}

function createPrefixedId(prefix: string) {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${prefix}_${token}`;
}

function createJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeLocationInput(location?: Partial<LocalLocation> | null) {
  if (!location) return null;
  const country = location.country?.trim() ?? "";
  const region = location.region?.trim() ?? "";
  const city = location.city?.trim() ?? "";
  const postalCode = location.postalCode?.trim() ?? "";

  if (!country && !region && !city && !postalCode) {
    return null;
  }

  return {
    country,
    region,
    city,
    postalCode: postalCode || undefined,
  } satisfies LocalLocation;
}

function inferScopeFromLocation(location?: string | null): CauseScope {
  return location?.toLowerCase().includes("local") ? "local" : "global";
}

function formatScopeLabel(scope?: CauseScope, location?: string | null) {
  if (scope === "local") return "Local";
  if (scope === "global") return "Global";
  return location ?? null;
}

function normalizeDiscoveryTemplate(template: DiscoveryCauseTemplate): DiscoveryCauseTemplate {
  const enrichedTemplate = {
    ...DISCOVERY_DETAILS[template.id],
    ...template,
  };
  const categories = Array.isArray(template.categories) ? template.categories : [];
  const fallbackCategories = [
    enrichedTemplate.tags?.toLowerCase().includes("environment") ? "environment" : null,
    enrichedTemplate.tags?.toLowerCase().includes("health") ? "health" : null,
    enrichedTemplate.tags?.toLowerCase().includes("education") ? "education" : null,
    enrichedTemplate.tags?.toLowerCase().includes("community") ? "community" : null,
  ].filter(Boolean) as string[];

  return {
    ...enrichedTemplate,
    scope: enrichedTemplate.scope ?? inferScopeFromLocation(enrichedTemplate.location),
    categories: categories.length > 0 ? categories : (fallbackCategories.length > 0 ? fallbackCategories : ["community"]),
  };
}

function titleCaseWorkspaceType(type: WorkspaceType) {
  switch (type) {
    case "personal":
      return "personal";
    case "relationship":
      return "relationship";
    case "family":
      return "family";
    case "group":
      return "group";
    case "church":
      return "church";
    case "organization":
      return "organization";
    default:
      return type;
  }
}

function normalizeWorkspaceType(type: string): WorkspaceType {
  if (type === "partnership") return "relationship";
  if (
    type === "personal" ||
    type === "relationship" ||
    type === "family" ||
    type === "group" ||
    type === "church" ||
    type === "organization"
  ) {
    return type;
  }
  return "group";
}

function normalizeMembershipRole(role: string | null | undefined): MembershipRole {
  switch (role) {
    case "owner":
      return "owner";
    case "co-owner":
      return "co-owner";
    case "admin":
      return "admin";
    case "viewer":
    case "member":
    default:
      return "viewer";
  }
}

function normalizeCauseRecord(record: LocalCauseRecord): Cause {
  const submittedBy = storage.getUserById(record.submittedByUserId)?.displayName ?? "Unknown";
  return {
    id: record.causeId,
    workspaceId: record.workspaceId as never,
    name: record.name,
    type: record.type,
    tier: record.tier,
    submittedBy,
    description: record.description,
    location: formatScopeLabel(record.scope, record.location) ?? null,
    link: record.websiteUrl ?? null,
    tags: record.tags ?? null,
    photoUrl: record.photoUrl ?? null,
    createdAt: asDate(record.createdAt) ?? new Date(),
  };
}

function normalizeMonthlyLogEntry(entry: LocalRitualEntry): MonthlyLog {
  return {
    id: entry.id,
    workspaceId: entry.workspaceId as never,
    monthKey: entry.monthKey,
    causeId: entry.causeId,
    type: entry.kind,
    isCompleted: Boolean(entry.date),
    amount: entry.amount === undefined ? null : String(entry.amount),
    hours: entry.hours === undefined ? null : String(entry.hours),
    dateCompleted: entry.date ? asDate(entry.date) ?? new Date(entry.date) : null,
    note: entry.note ?? null,
    photoUrl: entry.photo ?? null,
    createdAt: asDate(entry.createdAt) ?? new Date(),
  };
}

function normalizeSettings(workspaceId: string, record: LocalWorkspaceSettings): Settings {
  return {
    id: 1,
    workspaceId: workspaceId as never,
    cadence: coerceCadence(record.cadence),
    givingDayOfWeek: coerceGivingDayOfWeek(record.givingDayOfWeek),
    biweeklyAnchorDate: record.biweeklyAnchorDate ?? null,
    volunteerFrequency: record.volunteerMonthsPerYear,
    tier1Weight: record.tierWeights.tier1,
    tier2Weight: record.tierWeights.tier2,
    tier3Weight: record.tierWeights.tier3,
    preventRepeatsMonths: record.preventRepeatsMonths,
    seasonalMode: record.seasonalMode,
    createdAt: asDate(record.updatedAt) ?? new Date(),
  };
}

function defaultSettings(workspaceId: string): LocalWorkspaceSettings {
  return {
    workspaceId,
    cadence: "monthly",
    givingDayOfWeek: 5,
    biweeklyAnchorDate: null,
    volunteerMonthsPerYear: 3,
    tierWeights: {
      tier1: 60,
      tier2: 30,
      tier3: 10,
    },
    preventRepeatsMonths: 6,
    seasonalMode: false,
    updatedAt: now(),
  };
}

function createStarterCauses(workspaceId: string, userId: string): LocalCauseRecord[] {
  const timestamp = now();
  return [
    {
      workspaceId,
      causeId: nextScopedId(LOCAL_STORAGE_KEYS.nextCauseIdPrefix, workspaceId),
      name: "Local Food Pantry",
      type: "donation",
      tier: 1,
      description: "Support a nearby pantry with a direct monthly contribution.",
      websiteUrl: "https://www.feedingamerica.org/find-your-local-foodbank",
      submittedByUserId: userId,
      scope: "local",
      location: "Local",
      tags: "community, food",
      photoUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      workspaceId,
      causeId: nextScopedId(LOCAL_STORAGE_KEYS.nextCauseIdPrefix, workspaceId),
      name: "Neighborhood Cleanup",
      type: "volunteer",
      tier: 2,
      description: "Join a recurring cleanup to improve parks, sidewalks, or river paths.",
      websiteUrl: "https://kab.org/programs/great-american-cleanup/",
      submittedByUserId: userId,
      scope: "local",
      location: "Local",
      tags: "environment, community",
      photoUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      workspaceId,
      causeId: nextScopedId(LOCAL_STORAGE_KEYS.nextCauseIdPrefix, workspaceId),
      name: "Mutual Aid Fund",
      type: "either",
      tier: 1,
      description: "Contribute time or money to neighbors facing immediate needs.",
      websiteUrl: "https://www.mutualaidhub.org/",
      submittedByUserId: userId,
      scope: "global",
      location: "Global",
      tags: "mutual-aid, relief",
      photoUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function createPersonalWorkspaceForUser(user: LocalUser) {
  const timestamp = now();
  const workspace: LocalWorkspace = {
    id: createPrefixedId("ws"),
    name: "Personal",
    type: "personal",
    createdByUserId: user.id,
    joinCode: createJoinCode(),
    avatarDataUrl: null,
    location: user.defaultLocation ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const membership: LocalMembership = {
    id: createPrefixedId("mbr"),
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
    status: "approved",
    requestedAt: timestamp,
    approvedAt: timestamp,
    approvedByUserId: user.id,
  };

  return { workspace, membership };
}

function ensurePersonalWorkspace(user: LocalUser) {
  const existingPersonalWorkspace = storage.getWorkspaces().find((workspace) => (
    workspace.createdByUserId === user.id
    && workspace.type === "personal"
  )) ?? null;

  if (existingPersonalWorkspace) {
    const existingPersonalMembership = storage.getMemberships().find((membership) => (
      membership.workspaceId === existingPersonalWorkspace.id
      && membership.userId === user.id
      && membership.status === "approved"
      && membership.role === "owner"
    )) ?? null;

    if (existingPersonalMembership) {
      return { workspace: existingPersonalWorkspace, membership: existingPersonalMembership, created: false };
    }
  }

  const created = createPersonalWorkspaceForUser(user);
  storage.setWorkspaces([...storage.getWorkspaces(), created.workspace]);
  storage.setMemberships([...storage.getMemberships(), created.membership]);
  storage.setWorkspaceSettings([...storage.getWorkspaceSettings(), defaultSettings(created.workspace.id)]);
  storage.setCauseRecords([...storage.getCauseRecords(), ...createStarterCauses(created.workspace.id, user.id)]);

  return { ...created, created: true };
}

function resolveRitualKind(cause: LocalCauseRecord, settings: LocalWorkspaceSettings, monthKey: string): "donation" | "volunteer" {
  if (cause.type === "donation" || cause.type === "volunteer") return cause.type;
  const month = getPeriodStartDate(monthKey).getMonth() + 1;
  return month <= settings.volunteerMonthsPerYear ? "volunteer" : "donation";
}

function normalizeWorkspaceSettingRecord(record: LocalWorkspaceSettings): LocalWorkspaceSettings {
  return {
    ...record,
    cadence: coerceCadence(record.cadence),
    givingDayOfWeek: coerceGivingDayOfWeek(record.givingDayOfWeek),
    biweeklyAnchorDate: ensureBiweeklyAnchorDate(
      coerceCadence(record.cadence),
      coerceGivingDayOfWeek(record.givingDayOfWeek),
      record.biweeklyAnchorDate,
    ),
  };
}

function getWorkspaceMembership(workspaceId: string, userId: string) {
  return storage.getMemberships().find((entry) => entry.workspaceId === workspaceId && entry.userId === userId) ?? null;
}

function requireSessionUser() {
  const user = storage.getCurrentUser();
  if (!user) {
    throw new Error("Log in first.");
  }
  return user;
}

function requireApprovedMembership(workspaceId: string, userId: string) {
  const membership = getWorkspaceMembership(workspaceId, userId);
  if (!membership || membership.status !== "approved") {
    throw new Error("You do not have access to this Giving Space.");
  }
  return membership;
}

function canManageWorkspace(role: MembershipRole) {
  return role === "owner" || role === "co-owner" || role === "admin";
}

function canManageWorkspaceMembers(role: MembershipRole) {
  return role === "owner" || role === "co-owner";
}

function requireWorkspaceManager(workspaceId: string, userId: string) {
  const membership = requireApprovedMembership(workspaceId, userId);
  if (!canManageWorkspace(membership.role)) {
    throw new Error("Only Giving Space owners, co-owners, or admins can do that.");
  }
  return membership;
}

function requireWorkspaceMemberManager(workspaceId: string, userId: string) {
  const membership = requireApprovedMembership(workspaceId, userId);
  if (!canManageWorkspaceMembers(membership.role)) {
    throw new Error("Only Giving Space owners or co-owners can manage members.");
  }
  return membership;
}

function writeActiveWorkspace(userId: string, workspaceId: string | null) {
  requireWindow();
  const key = getScopedKey(LOCAL_STORAGE_KEYS.activeWorkspacePrefix, userId);
  if (!workspaceId) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, workspaceId);
}

function ensureDiscoverySeed() {
  if (typeof window === "undefined") return;
  const current = safeParse<DiscoveryCauseTemplate[] | null>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.discovery), null);
  if (current && current.length > 0) {
    writeValue(LOCAL_STORAGE_KEYS.discovery, current.map(normalizeDiscoveryTemplate));
    return;
  }
  writeValue(LOCAL_STORAGE_KEYS.discovery, DISCOVERY_SEED.map(normalizeDiscoveryTemplate));
}

function migrateLegacyDataIfNeeded() {
  if (typeof window === "undefined") return;
  const meta = safeParse<StorageMeta | null>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.meta), null);
  if (meta?.schemaVersion === STORAGE_VERSION) {
    ensureDiscoverySeed();
    return;
  }

  if (meta?.schemaVersion) {
    const currentUsers = safeParse<LocalUser[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.users), []);
    const currentSession = safeParse<LocalSession | null>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.session), null);
    const currentWorkspaces = safeParse<LocalWorkspace[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.workspaces), []);
    const currentMemberships = safeParse<LocalMembership[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.memberships), []);
    const currentSettings = safeParse<LocalWorkspaceSettings[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.workspaceSettings), []);
    const currentCauses = safeParse<LocalCauseRecord[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.causes), []);
    const currentRituals = safeParse<LocalMonthlyRitual[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.monthlyRituals), []);
    const currentEntries = safeParse<LocalRitualEntry[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.ritualEntries), []);
    const currentImpactLogs = safeParse<LocalImpactLog[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.impactLogs), []);

    writeValue(LOCAL_STORAGE_KEYS.users, currentUsers.map((user) => ({
      ...user,
      avatarDataUrl: user.avatarDataUrl ?? null,
    })));
    writeValue(LOCAL_STORAGE_KEYS.session, currentSession);
    writeValue(LOCAL_STORAGE_KEYS.workspaces, currentWorkspaces.map((workspace) => ({
      ...workspace,
      avatarDataUrl: workspace.avatarDataUrl ?? null,
    })));
    writeValue(LOCAL_STORAGE_KEYS.memberships, currentMemberships.map((membership) => ({
      ...membership,
      role: normalizeMembershipRole(membership.role),
    })));
    writeValue(LOCAL_STORAGE_KEYS.workspaceSettings, currentSettings);
    writeValue(LOCAL_STORAGE_KEYS.causes, currentCauses);
    writeValue(LOCAL_STORAGE_KEYS.monthlyRituals, currentRituals);
    writeValue(LOCAL_STORAGE_KEYS.ritualEntries, currentEntries);
    writeValue(LOCAL_STORAGE_KEYS.impactLogs, currentImpactLogs);
    ensureDiscoverySeed();
    writeValue<StorageMeta>(LOCAL_STORAGE_KEYS.meta, {
      schemaVersion: STORAGE_VERSION,
      migratedAt: now(),
    });
    return;
  }

  const legacyUsers = safeParse<LegacyUser[]>(window.localStorage.getItem(LEGACY_KEYS.users), []);
  const legacySession = safeParse<LocalSession | null>(window.localStorage.getItem(LEGACY_KEYS.session), null);
  const legacyWorkspaces = safeParse<LegacyWorkspace[]>(window.localStorage.getItem(LEGACY_KEYS.workspaces), []);
  const legacyMemberships = safeParse<LegacyMembership[]>(window.localStorage.getItem(LEGACY_KEYS.memberships), []);

  const users: LocalUser[] = legacyUsers.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    defaultLocation: null,
    avatarDataUrl: null,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  }));

  const workspaces: LocalWorkspace[] = legacyWorkspaces.map((workspace) => ({
    id: workspace.workspaceId,
    name: workspace.name,
    type: normalizeWorkspaceType(workspace.type),
    createdByUserId: workspace.createdBy,
    joinCode: createJoinCode(),
    avatarDataUrl: null,
    location: null,
    createdAt: workspace.createdAt,
    updatedAt: workspace.createdAt,
  }));

  const memberships: LocalMembership[] = legacyMemberships.map((membership) => ({
    id: membership.id,
    workspaceId: membership.workspaceId,
    userId: membership.userId,
    role: normalizeMembershipRole(membership.role),
    status: "approved",
    requestedAt: membership.createdAt,
    approvedAt: membership.createdAt,
    approvedByUserId: workspaces.find((workspace) => workspace.id === membership.workspaceId)?.createdByUserId,
  }));

  const settings = workspaces.map((workspace) => {
    const stored = safeParse<Settings | null>(
      window.localStorage.getItem(getScopedKey(LEGACY_KEYS.settingsPrefix, workspace.id)),
      null,
    );
    if (!stored) {
      return defaultSettings(workspace.id);
    }
    return {
      workspaceId: workspace.id,
      cadence: "monthly",
      givingDayOfWeek: 5,
      biweeklyAnchorDate: null,
      volunteerMonthsPerYear: stored.volunteerFrequency,
      tierWeights: {
        tier1: stored.tier1Weight,
        tier2: stored.tier2Weight,
        tier3: stored.tier3Weight,
      },
      preventRepeatsMonths: stored.preventRepeatsMonths,
      seasonalMode: stored.seasonalMode ?? false,
      updatedAt: stored.createdAt instanceof Date ? stored.createdAt.toISOString() : new Date(stored.createdAt).toISOString(),
    } satisfies LocalWorkspaceSettings;
  });

  const causes: LocalCauseRecord[] = [];
  const rituals: LocalMonthlyRitual[] = [];
  const ritualEntries: LocalRitualEntry[] = [];
  const impactLogs: LocalImpactLog[] = [];

  workspaces.forEach((workspace) => {
    const legacyCauses = safeParse<Cause[]>(
      window.localStorage.getItem(getScopedKey(LEGACY_KEYS.causesPrefix, workspace.id)),
      [],
    );
    legacyCauses.forEach((cause) => {
      causes.push({
        workspaceId: workspace.id,
        causeId: cause.id,
        name: cause.name,
        type: cause.type as LocalCauseRecord["type"],
        tier: cause.tier as 1 | 2 | 3,
        scope: inferScopeFromLocation(cause.location),
        description: cause.description,
        websiteUrl: cause.link ?? null,
        submittedByUserId: workspace.createdByUserId,
        location: cause.location ?? null,
        tags: cause.tags ?? null,
        photoUrl: cause.photoUrl ?? null,
        createdAt: cause.createdAt instanceof Date ? cause.createdAt.toISOString() : new Date(cause.createdAt).toISOString(),
        updatedAt: cause.createdAt instanceof Date ? cause.createdAt.toISOString() : new Date(cause.createdAt).toISOString(),
      });
    });

    const legacyLogs = safeParse<MonthlyLog[]>(
      window.localStorage.getItem(getScopedKey(LEGACY_KEYS.monthlyLogsPrefix, workspace.id)),
      [],
    );
    const ritualMap = new Map<string, LocalMonthlyRitual>();

    legacyLogs.forEach((log) => {
      const existingRitual = ritualMap.get(log.monthKey);
      if (!existingRitual) {
        ritualMap.set(log.monthKey, {
          workspaceId: workspace.id,
          monthKey: log.monthKey,
          revealedCauseIds: [log.causeId],
          chosenByUserId: workspace.createdByUserId,
          createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
          updatedAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
        });
      } else if (!existingRitual.revealedCauseIds.includes(log.causeId)) {
        existingRitual.revealedCauseIds.push(log.causeId);
      }

      ritualEntries.push({
        id: log.id,
        workspaceId: workspace.id,
        monthKey: log.monthKey,
        causeId: log.causeId,
        kind: log.type as LocalRitualEntry["kind"],
        chosenByUserId: workspace.createdByUserId,
        amount: log.amount == null ? undefined : Number(log.amount),
        hours: log.hours == null ? undefined : Number(log.hours),
        date: log.dateCompleted ? (log.dateCompleted instanceof Date ? log.dateCompleted.toISOString() : new Date(log.dateCompleted).toISOString()) : undefined,
        note: log.note ?? undefined,
        photo: log.photoUrl ?? null,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
        updatedAt: log.dateCompleted
          ? (log.dateCompleted instanceof Date ? log.dateCompleted.toISOString() : new Date(log.dateCompleted).toISOString())
          : (log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString()),
      });

      if (log.isCompleted && log.dateCompleted) {
        impactLogs.push({
          logId: nextScopedId(LOCAL_STORAGE_KEYS.nextImpactLogIdPrefix, workspace.id),
          workspaceId: workspace.id,
          ritualEntryId: log.id,
          monthKey: log.monthKey,
          causeId: log.causeId,
          kind: log.type as LocalImpactLog["kind"],
          amount: log.amount == null ? undefined : Number(log.amount),
          hours: log.hours == null ? undefined : Number(log.hours),
          date: log.dateCompleted instanceof Date ? log.dateCompleted.toISOString() : new Date(log.dateCompleted).toISOString(),
          note: log.note ?? undefined,
          photo: log.photoUrl ?? null,
          createdByUserId: workspace.createdByUserId,
          createdAt: log.dateCompleted instanceof Date ? log.dateCompleted.toISOString() : new Date(log.dateCompleted).toISOString(),
        });
      }
    });

    rituals.push(...Array.from(ritualMap.values()));
  });

  if (users.length > 0) {
    writeValue(LOCAL_STORAGE_KEYS.users, users);
    writeValue(LOCAL_STORAGE_KEYS.session, legacySession);
    writeValue(LOCAL_STORAGE_KEYS.workspaces, workspaces);
    writeValue(LOCAL_STORAGE_KEYS.memberships, memberships);
    writeValue(LOCAL_STORAGE_KEYS.workspaceSettings, settings);
    writeValue(LOCAL_STORAGE_KEYS.causes, causes);
    writeValue(LOCAL_STORAGE_KEYS.monthlyRituals, rituals);
    writeValue(LOCAL_STORAGE_KEYS.ritualEntries, ritualEntries);
    writeValue(LOCAL_STORAGE_KEYS.impactLogs, impactLogs);

    users.forEach((user) => {
      const legacyActiveWorkspaceId = window.localStorage.getItem(getScopedKey(LEGACY_KEYS.activeWorkspacePrefix, user.id));
      const approved = memberships.find((membership) => membership.userId === user.id && membership.status === "approved");
      writeActiveWorkspace(user.id, legacyActiveWorkspaceId ?? approved?.workspaceId ?? null);
    });
  } else {
    writeValue(LOCAL_STORAGE_KEYS.users, []);
    writeValue(LOCAL_STORAGE_KEYS.session, null);
    writeValue(LOCAL_STORAGE_KEYS.workspaces, []);
    writeValue(LOCAL_STORAGE_KEYS.memberships, []);
    writeValue(LOCAL_STORAGE_KEYS.workspaceSettings, []);
    writeValue(LOCAL_STORAGE_KEYS.causes, []);
    writeValue(LOCAL_STORAGE_KEYS.monthlyRituals, []);
    writeValue(LOCAL_STORAGE_KEYS.ritualEntries, []);
    writeValue(LOCAL_STORAGE_KEYS.impactLogs, []);
  }

  ensureDiscoverySeed();
  writeValue<StorageMeta>(LOCAL_STORAGE_KEYS.meta, {
    schemaVersion: STORAGE_VERSION,
    migratedAt: now(),
  });
}

function ensureStorageReady() {
  migrateLegacyDataIfNeeded();
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

export function validateUsername(username: string) {
  if (!username) return "Username is required.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (/\s/.test(username)) return "Username cannot contain spaces.";
  return null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, passwordHash: string) {
  return (await sha256(password)) === passwordHash;
}

export const storage = {
  getUsers() {
    ensureStorageReady();
    return readArray<LocalUser>(LOCAL_STORAGE_KEYS.users);
  },

  setUsers(users: LocalUser[]) {
    writeValue(LOCAL_STORAGE_KEYS.users, users);
  },

  getUserById(userId: string) {
    return this.getUsers().find((user) => user.id === userId) ?? null;
  },

  getUserByUsername(username: string) {
    const normalized = normalizeUsername(username);
    return this.getUsers().find((user) => user.username === normalized) ?? null;
  },

  getSession() {
    ensureStorageReady();
    if (typeof window === "undefined") return null as LocalSession | null;
    return safeParse<LocalSession | null>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.session), null);
  },

  setSession(session: LocalSession | null) {
    writeValue(LOCAL_STORAGE_KEYS.session, session);
  },

  clearSession() {
    requireWindow();
    window.localStorage.removeItem(LOCAL_STORAGE_KEYS.session);
  },

  getWorkspaces() {
    ensureStorageReady();
    return readArray<LocalWorkspace>(LOCAL_STORAGE_KEYS.workspaces);
  },

  setWorkspaces(workspaces: LocalWorkspace[]) {
    writeValue(LOCAL_STORAGE_KEYS.workspaces, workspaces);
  },

  getMemberships() {
    ensureStorageReady();
    return readArray<LocalMembership>(LOCAL_STORAGE_KEYS.memberships);
  },

  setMemberships(memberships: LocalMembership[]) {
    writeValue(LOCAL_STORAGE_KEYS.memberships, memberships);
  },

  getMembershipsForUser(userId: string) {
    return this.getMemberships().filter((membership) => membership.userId === userId);
  },

  getWorkspacesForUser(userId: string) {
    const membershipMap = new Map(this.getMembershipsForUser(userId).map((membership) => [membership.workspaceId, membership]));
    return this.getWorkspaces()
      .filter((workspace) => membershipMap.has(workspace.id))
      .map((workspace) => ({
        workspace,
        membership: membershipMap.get(workspace.id)!,
      }))
      .sort((a, b) => a.workspace.createdAt.localeCompare(b.workspace.createdAt));
  },

  getActiveWorkspaceId(userId: string) {
    ensureStorageReady();
    if (typeof window === "undefined") return null as string | null;
    return window.localStorage.getItem(getScopedKey(LOCAL_STORAGE_KEYS.activeWorkspacePrefix, userId));
  },

  setActiveWorkspaceId(userId: string, workspaceId: string | null) {
    const approved = workspaceId
      ? this.getMemberships().find((entry) => entry.userId === userId && entry.workspaceId === workspaceId && entry.status === "approved")
      : null;
    writeActiveWorkspace(userId, approved?.workspaceId ?? null);
  },

  ensureWorkspaceBootstrap(user: LocalUser) {
    ensureStorageReady();
    const personalWorkspace = ensurePersonalWorkspace(user);
    const existing = this.getWorkspacesForUser(user.id);
    const approved = existing.filter(({ membership }) => membership.status === "approved");
    const stored = this.getActiveWorkspaceId(user.id);
    const fallback = personalWorkspace.workspace.id ?? approved[0]?.workspace.id ?? null;
    const nextActive = approved.some(({ workspace }) => workspace.id === stored) ? stored : fallback;
    writeActiveWorkspace(user.id, nextActive);
    return existing;
  },

  async createAccount(input: { displayName: string; username: string; password: string }) {
    const normalizedUsername = normalizeUsername(input.username);
    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) throw new Error(usernameError);
    if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
    if (this.getUserByUsername(normalizedUsername)) throw new Error("That username is already taken.");

    const timestamp = now();
    const user: LocalUser = {
      id: createPrefixedId("usr"),
      username: normalizedUsername,
      displayName: input.displayName.trim(),
      passwordHash: await sha256(input.password),
      defaultLocation: null,
      avatarDataUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.setUsers([...this.getUsers(), user]);
    this.ensureWorkspaceBootstrap(user);
    this.setSession({ userId: user.id, createdAt: timestamp });
    return user;
  },

  async login(input: { username: string; password: string }) {
    const user = this.getUserByUsername(input.username);
    if (!user) throw new Error("We couldn’t find that account.");
    if (!(await verifyPassword(input.password, user.passwordHash))) {
      throw new Error("Incorrect username or password.");
    }
    this.ensureWorkspaceBootstrap(user);
    this.setSession({ userId: user.id, createdAt: now() });
    return user;
  },

  async loginWithDevPreset(presetKey: keyof typeof DEV_AUTH_PRESETS) {
    const preset = DEV_AUTH_PRESETS[presetKey];
    let user = this.getUserByUsername(preset.username);
    if (!user) {
      user = await this.createAccount({
        displayName: preset.displayName,
        username: preset.username,
        password: preset.password,
      });
      return user;
    }
    this.ensureWorkspaceBootstrap(user);
    this.setSession({ userId: user.id, createdAt: now() });
    return user;
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    return this.getUserById(session.userId);
  },

  updateUserDisplayName(userId: string, displayName: string) {
    const trimmed = displayName.trim();
    if (!trimmed) return null;
    let updatedUser: LocalUser | null = null;
    const nextUsers = this.getUsers().map((user) => {
      if (user.id !== userId) return user;
      updatedUser = {
        ...user,
        displayName: trimmed,
        updatedAt: now(),
      };
      return updatedUser;
    });
    this.setUsers(nextUsers);
    return updatedUser;
  },

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    if (nextPassword.length < 8) throw new Error("New password must be at least 8 characters.");
    const user = this.getUserById(userId);
    if (!user) throw new Error("Account not found.");
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("Current password is incorrect.");
    }
    const nextHash = await sha256(nextPassword);
    this.setUsers(this.getUsers().map((entry) => (
      entry.id === userId
        ? { ...entry, passwordHash: nextHash, updatedAt: now() }
        : entry
    )));
  },

  createWorkspace(input: { name: string; type: WorkspaceType; location?: Partial<LocalLocation> | null }) {
    const user = requireSessionUser();
    const timestamp = now();
    const location = normalizeLocationInput(input.location) ?? user.defaultLocation ?? null;
    const workspace: LocalWorkspace = {
      id: createPrefixedId("ws"),
      name: input.name.trim(),
      type: input.type,
      createdByUserId: user.id,
      joinCode: createJoinCode(),
      avatarDataUrl: null,
      location,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const membership: LocalMembership = {
      id: createPrefixedId("mbr"),
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      status: "approved",
      requestedAt: timestamp,
      approvedAt: timestamp,
      approvedByUserId: user.id,
    };

    this.setWorkspaces([...this.getWorkspaces(), workspace]);
    this.setMemberships([...this.getMemberships(), membership]);
    this.setWorkspaceSettings([...this.getWorkspaceSettings(), defaultSettings(workspace.id)]);
    writeActiveWorkspace(user.id, workspace.id);
    return { workspace, membership };
  },

  updateWorkspaceLocation(workspaceId: string, location: Partial<LocalLocation> | null) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    const nextLocation = normalizeLocationInput(location);
    let updatedWorkspace: LocalWorkspace | null = null;
    const nextWorkspaces = this.getWorkspaces().map((workspace) => {
      if (workspace.id !== workspaceId) return workspace;
      updatedWorkspace = {
        ...workspace,
        location: nextLocation,
        updatedAt: now(),
      };
      return updatedWorkspace;
    });
    this.setWorkspaces(nextWorkspaces);
    return updatedWorkspace;
  },

  updateWorkspaceAvatar(workspaceId: string, avatarDataUrl: string | null) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    let updatedWorkspace: LocalWorkspace | null = null;
    const nextWorkspaces = this.getWorkspaces().map((workspace) => {
      if (workspace.id !== workspaceId) return workspace;
      updatedWorkspace = {
        ...workspace,
        avatarDataUrl: avatarDataUrl?.trim() ? avatarDataUrl : null,
        updatedAt: now(),
      };
      return updatedWorkspace;
    });
    this.setWorkspaces(nextWorkspaces);
    return updatedWorkspace;
  },

  updateUserDefaultLocation(userId: string, location: Partial<LocalLocation> | null) {
    const nextLocation = normalizeLocationInput(location);
    let updatedUser: LocalUser | null = null;
    const nextUsers = this.getUsers().map((user) => {
      if (user.id !== userId) return user;
      updatedUser = {
        ...user,
        defaultLocation: nextLocation,
        updatedAt: now(),
      };
      return updatedUser;
    });
    this.setUsers(nextUsers);
    return updatedUser;
  },

  updateUserAvatar(userId: string, avatarDataUrl: string | null) {
    let updatedUser: LocalUser | null = null;
    const nextUsers = this.getUsers().map((user) => {
      if (user.id !== userId) return user;
      updatedUser = {
        ...user,
        avatarDataUrl: avatarDataUrl?.trim() ? avatarDataUrl : null,
        updatedAt: now(),
      };
      return updatedUser;
    });
    this.setUsers(nextUsers);
    return updatedUser;
  },

  requestJoinWorkspace(joinCode: string) {
    const user = requireSessionUser();
    const normalizedCode = joinCode.trim().toUpperCase();
    const workspace = this.getWorkspaces().find((entry) => entry.joinCode === normalizedCode);
    if (!workspace) {
      throw new Error("That join code doesn’t match a Giving Space on this device.");
    }

    const existingMembership = getWorkspaceMembership(workspace.id, user.id);
    if (existingMembership?.status === "approved") {
      throw new Error("You already belong to this Giving Space.");
    }

    const timestamp = now();
    const nextMembership: LocalMembership = {
      id: existingMembership?.id ?? createPrefixedId("mbr"),
      workspaceId: workspace.id,
      userId: user.id,
      role: existingMembership?.role ?? "viewer",
      status: "pending",
      requestedAt: timestamp,
    };

    const memberships = existingMembership
      ? this.getMemberships().map((entry) => (entry.id === existingMembership.id ? nextMembership : entry))
      : [...this.getMemberships(), nextMembership];

    this.setMemberships(memberships);
    return { workspace, membership: nextMembership };
  },

  getWorkspaceById(workspaceId: string) {
    return this.getWorkspaces().find((workspace) => workspace.id === workspaceId) ?? null;
  },

  getWorkspaceMembers(workspaceId: string) {
    return this.getMemberships()
      .filter((membership) => membership.workspaceId === workspaceId)
      .map((membership) => ({
        membership,
        user: this.getUserById(membership.userId),
      }))
      .filter((entry): entry is { membership: LocalMembership; user: LocalUser } => Boolean(entry.user));
  },

  approveMembership(workspaceId: string, membershipId: string, role: MembershipRole = "viewer") {
    const user = requireSessionUser();
    const actingMembership = requireWorkspaceMemberManager(workspaceId, user.id);
    const timestamp = now();
    let approvedMembership: LocalMembership | null = null;

    const nextMemberships = this.getMemberships().map((membership) => {
      if (membership.id !== membershipId || membership.workspaceId !== workspaceId) return membership;
      const nextRole = normalizeMembershipRole(role);
      if (actingMembership.role !== "owner" && (nextRole === "owner" || nextRole === "co-owner")) {
        throw new Error("Only the owner can approve co-owners or transfer ownership.");
      }
      approvedMembership = {
        ...membership,
        role: nextRole,
        status: "approved",
        approvedAt: timestamp,
        approvedByUserId: user.id,
      };
      return approvedMembership;
    });

    this.setMemberships(nextMemberships);
    return approvedMembership;
  },

  rejectMembership(workspaceId: string, membershipId: string) {
    const user = requireSessionUser();
    requireWorkspaceMemberManager(workspaceId, user.id);
    let rejectedMembership: LocalMembership | null = null;

    const nextMemberships = this.getMemberships().map((membership) => {
      if (membership.id !== membershipId || membership.workspaceId !== workspaceId) return membership;
      rejectedMembership = {
        ...membership,
        status: "rejected",
      };
      return rejectedMembership;
    });

    this.setMemberships(nextMemberships);
    return rejectedMembership;
  },

  updateMembershipRole(workspaceId: string, membershipId: string, role: MembershipRole) {
    const user = requireSessionUser();
    const actingMembership = requireWorkspaceMemberManager(workspaceId, user.id);
    let updatedMembership: LocalMembership | null = null;

    const nextMemberships = this.getMemberships().map((membership) => {
      if (membership.id !== membershipId || membership.workspaceId !== workspaceId) return membership;
      if (membership.role === "owner") {
        throw new Error("The owner role cannot be changed here.");
      }
      const nextRole = normalizeMembershipRole(role);
      if (actingMembership.role === "co-owner" && membership.role === "co-owner") {
        throw new Error("Co-owners cannot change another co-owner.");
      }
      if (actingMembership.role === "co-owner" && (nextRole === "co-owner" || nextRole === "owner")) {
        throw new Error("Only the owner can assign co-owner or owner roles.");
      }
      updatedMembership = {
        ...membership,
        role: nextRole,
      };
      return updatedMembership;
    });

    this.setMemberships(nextMemberships);
    return updatedMembership;
  },

  transferWorkspaceOwnership(workspaceId: string, membershipId: string, previousOwnerRole: Exclude<MembershipRole, "owner"> = "co-owner") {
    const user = requireSessionUser();
    const actingMembership = requireApprovedMembership(workspaceId, user.id);
    if (actingMembership.role !== "owner") {
      throw new Error("Only the current owner can transfer ownership.");
    }

    const targetMembership = this.getMemberships().find((entry) => entry.id === membershipId && entry.workspaceId === workspaceId);
    if (!targetMembership || targetMembership.status !== "approved") {
      throw new Error("Choose an approved member.");
    }
    if (targetMembership.userId === user.id) {
      throw new Error("Choose another member to transfer ownership.");
    }

    const nextMemberships = this.getMemberships().map((membership) => {
      if (membership.workspaceId !== workspaceId) return membership;
      if (membership.id === actingMembership.id) {
        return { ...membership, role: previousOwnerRole };
      }
      if (membership.id === membershipId) {
        return { ...membership, role: "owner" as const };
      }
      return membership;
    });

    this.setMemberships(nextMemberships);
  },

  removeMemberFromWorkspace(workspaceId: string, membershipId: string) {
    const user = requireSessionUser();
    const actingMembership = requireWorkspaceMemberManager(workspaceId, user.id);

    const membership = this.getMemberships().find((entry) => entry.id === membershipId && entry.workspaceId === workspaceId);
    if (!membership) throw new Error("Membership not found.");
    if (membership.role === "owner") throw new Error("The owner cannot be removed.");
    if (actingMembership.role === "co-owner" && membership.role === "co-owner") {
      throw new Error("Co-owners cannot remove another co-owner.");
    }

    this.setMemberships(this.getMemberships().filter((entry) => entry.id !== membershipId));

    const remainingApproved = this.getWorkspacesForUser(membership.userId)
      .filter((entry) => entry.membership.status === "approved" && entry.membership.id !== membershipId);
    const activeWorkspaceId = this.getActiveWorkspaceId(membership.userId);
    if (activeWorkspaceId === workspaceId) {
      writeActiveWorkspace(membership.userId, remainingApproved[0]?.workspace.id ?? null);
    }
  },

  leaveWorkspace(workspaceId: string) {
    const user = requireSessionUser();
    const membership = requireApprovedMembership(workspaceId, user.id);
    if (membership.role === "owner") {
      throw new Error("Owners cannot leave their Giving Space. Delete it or transfer ownership later.");
    }
    this.setMemberships(this.getMemberships().filter((entry) => entry.id !== membership.id));
    const remainingApproved = this.getWorkspacesForUser(user.id).filter((entry) => entry.workspace.id !== workspaceId && entry.membership.status === "approved");
    writeActiveWorkspace(user.id, remainingApproved[0]?.workspace.id ?? null);
  },

  deleteWorkspace(workspaceId: string) {
    const user = requireSessionUser();
    const membership = requireApprovedMembership(workspaceId, user.id);
    if (membership.role !== "owner") {
      throw new Error("Only the Giving Space owner can delete a Giving Space.");
    }
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("Giving Space not found.");
    }
    if (workspace.type === "personal" && workspace.createdByUserId === user.id) {
      throw new Error("Your Personal Giving Space cannot be deleted. Delete your account to remove it.");
    }

    const affectedUsers = this.getMembershipsForWorkspaceDeleted(workspaceId);

    this.setWorkspaces(this.getWorkspaces().filter((workspace) => workspace.id !== workspaceId));
    this.setMemberships(this.getMemberships().filter((entry) => entry.workspaceId !== workspaceId));
    this.setWorkspaceSettings(this.getWorkspaceSettings().filter((entry) => entry.workspaceId !== workspaceId));
    this.setCauseRecords(this.getCauseRecords().filter((entry) => entry.workspaceId !== workspaceId));
    this.setMonthlyRituals(this.getMonthlyRituals().filter((entry) => entry.workspaceId !== workspaceId));
    this.setRitualEntries(this.getRitualEntries().filter((entry) => entry.workspaceId !== workspaceId));
    this.setImpactLogs(this.getImpactLogs().filter((entry) => entry.workspaceId !== workspaceId));

    affectedUsers.forEach((userId) => {
      const approved = this.getWorkspacesForUser(userId).filter((entry) => entry.membership.status === "approved");
      const currentActive = this.getActiveWorkspaceId(userId);
      if (currentActive === workspaceId) {
        writeActiveWorkspace(userId, approved[0]?.workspace.id ?? null);
      }
    });
  },

  getMembershipsForWorkspaceDeleted(workspaceId: string) {
    return Array.from(new Set(this.getMemberships().filter((entry) => entry.workspaceId === workspaceId).map((entry) => entry.userId)));
  },

  getWorkspaceSettings() {
    ensureStorageReady();
    return readArray<LocalWorkspaceSettings>(LOCAL_STORAGE_KEYS.workspaceSettings);
  },

  setWorkspaceSettings(settings: LocalWorkspaceSettings[]) {
    writeValue(LOCAL_STORAGE_KEYS.workspaceSettings, settings);
  },

  getSettings(workspaceId: string) {
    const allSettings = this.getWorkspaceSettings();
    const existing = allSettings.find((entry) => entry.workspaceId === workspaceId);
    const settings = existing ? normalizeWorkspaceSettingRecord(existing) : defaultSettings(workspaceId);
    if (!existing) {
      this.setWorkspaceSettings([...allSettings, settings]);
    } else if (
      existing.cadence !== settings.cadence
      || existing.givingDayOfWeek !== settings.givingDayOfWeek
      || existing.biweeklyAnchorDate !== settings.biweeklyAnchorDate
    ) {
      this.setWorkspaceSettings(allSettings.map((entry) => (entry.workspaceId === workspaceId ? settings : entry)));
    }
    return normalizeSettings(workspaceId, settings);
  },

  updateSettings(workspaceId: string, updates: Partial<InsertSettings>) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    let nextSettings = defaultSettings(workspaceId);
    const existing = this.getWorkspaceSettings().find((entry) => entry.workspaceId === workspaceId);
    const record = existing ?? nextSettings;
    nextSettings = {
      ...record,
      cadence: coerceCadence(updates.cadence ?? record.cadence),
      givingDayOfWeek: coerceGivingDayOfWeek(updates.givingDayOfWeek ?? record.givingDayOfWeek),
      volunteerMonthsPerYear: updates.volunteerFrequency ?? record.volunteerMonthsPerYear,
      tierWeights: {
        tier1: updates.tier1Weight ?? record.tierWeights.tier1,
        tier2: updates.tier2Weight ?? record.tierWeights.tier2,
        tier3: updates.tier3Weight ?? record.tierWeights.tier3,
      },
      preventRepeatsMonths: updates.preventRepeatsMonths ?? record.preventRepeatsMonths,
      seasonalMode: updates.seasonalMode ?? record.seasonalMode,
      biweeklyAnchorDate: ensureBiweeklyAnchorDate(
        coerceCadence(updates.cadence ?? record.cadence),
        coerceGivingDayOfWeek(updates.givingDayOfWeek ?? record.givingDayOfWeek),
        updates.biweeklyAnchorDate ?? record.biweeklyAnchorDate ?? null,
      ),
      updatedAt: now(),
    };

    const nextAll = existing
      ? this.getWorkspaceSettings().map((entry) => (entry.workspaceId === workspaceId ? nextSettings : entry))
      : [...this.getWorkspaceSettings(), nextSettings];
    this.setWorkspaceSettings(nextAll);
    return normalizeSettings(workspaceId, nextSettings);
  },

  getCauseRecords() {
    ensureStorageReady();
    return readArray<LocalCauseRecord>(LOCAL_STORAGE_KEYS.causes);
  },

  setCauseRecords(causes: LocalCauseRecord[]) {
    writeValue(LOCAL_STORAGE_KEYS.causes, causes);
  },

  getCauses(workspaceId: string) {
    return this.getCauseRecords()
      .filter((cause) => cause.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(normalizeCauseRecord);
  },

  createCause(workspaceId: string, data: Omit<InsertCause, "workspaceId">) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    const timestamp = now();
    const cause: LocalCauseRecord = {
      workspaceId,
      causeId: nextScopedId(LOCAL_STORAGE_KEYS.nextCauseIdPrefix, workspaceId),
      name: data.name,
      type: data.type as LocalCauseRecord["type"],
      tier: data.tier as 1 | 2 | 3,
      scope: inferScopeFromLocation(data.location),
      description: data.description,
      websiteUrl: data.link ?? null,
      submittedByUserId: user.id,
      location: data.location ?? null,
      tags: data.tags ?? null,
      photoUrl: data.photoUrl ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.setCauseRecords([...this.getCauseRecords(), cause]);
    return normalizeCauseRecord(cause);
  },

  updateCause(workspaceId: string, id: number, updates: Partial<InsertCause>) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    let updatedCause: LocalCauseRecord | null = null;
    const nextCauses = this.getCauseRecords().map((cause) => {
      if (cause.workspaceId !== workspaceId || cause.causeId !== id) return cause;
      updatedCause = {
        ...cause,
        name: updates.name ?? cause.name,
        type: (updates.type as LocalCauseRecord["type"] | undefined) ?? cause.type,
        tier: (updates.tier as 1 | 2 | 3 | undefined) ?? cause.tier,
        scope: updates.location ? inferScopeFromLocation(updates.location) : cause.scope,
        description: updates.description ?? cause.description,
        websiteUrl: updates.link ?? cause.websiteUrl ?? null,
        location: updates.location ?? cause.location ?? null,
        tags: updates.tags ?? cause.tags ?? null,
        photoUrl: updates.photoUrl ?? cause.photoUrl ?? null,
        updatedAt: now(),
      };
      return updatedCause;
    });
    if (!updatedCause) throw new Error("Cause not found");
    this.setCauseRecords(nextCauses);
    return normalizeCauseRecord(updatedCause);
  },

  deleteCause(workspaceId: string, id: number) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    this.setCauseRecords(this.getCauseRecords().filter((cause) => !(cause.workspaceId === workspaceId && cause.causeId === id)));
  },

  getMonthlyRituals() {
    ensureStorageReady();
    return readArray<LocalMonthlyRitual>(LOCAL_STORAGE_KEYS.monthlyRituals);
  },

  setMonthlyRituals(rituals: LocalMonthlyRitual[]) {
    writeValue(LOCAL_STORAGE_KEYS.monthlyRituals, rituals);
  },

  getRitualEntries() {
    ensureStorageReady();
    return readArray<LocalRitualEntry>(LOCAL_STORAGE_KEYS.ritualEntries);
  },

  setRitualEntries(entries: LocalRitualEntry[]) {
    writeValue(LOCAL_STORAGE_KEYS.ritualEntries, entries);
  },

  getImpactLogs() {
    ensureStorageReady();
    return readArray<LocalImpactLog>(LOCAL_STORAGE_KEYS.impactLogs);
  },

  setImpactLogs(logs: LocalImpactLog[]) {
    writeValue(LOCAL_STORAGE_KEYS.impactLogs, logs);
  },

  getMonthlyLogs(workspaceId: string) {
    return this.getRitualEntries()
      .filter((entry) => entry.workspaceId === workspaceId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(normalizeMonthlyLogEntry);
  },

  revealMonthlyLog(workspaceId: string, monthKey: string) {
    const user = requireSessionUser();
    requireApprovedMembership(workspaceId, user.id);
    const existingEntry = this.getRitualEntries()
      .filter((entry) => entry.workspaceId === workspaceId && entry.monthKey === monthKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    if (existingEntry) {
      return normalizeMonthlyLogEntry(existingEntry);
    }
    const causes = this.getCauseRecords().filter((cause) => cause.workspaceId === workspaceId);
    if (causes.length === 0) {
      throw new Error("Add at least one cause before revealing this period.");
    }

    const settings = normalizeWorkspaceSettingRecord(
      this.getWorkspaceSettings().find((entry) => entry.workspaceId === workspaceId) ?? defaultSettings(workspaceId),
    );
    const ritual = this.getMonthlyRituals().find((entry) => entry.workspaceId === workspaceId && entry.monthKey === monthKey) ?? null;
    const revealedThisMonth = new Set(ritual?.revealedCauseIds ?? []);
    const completedLogs = this.getImpactLogs().filter((entry) => entry.workspaceId === workspaceId);
    const available = causes.filter((cause) => {
      if (revealedThisMonth.has(cause.causeId)) return false;
      const latestCompletion = completedLogs
        .filter((log) => log.causeId === cause.causeId)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!latestCompletion) return true;
      return getPeriodMonthDistance(monthKey, latestCompletion.monthKey) >= settings.preventRepeatsMonths;
    });
    const pool = available.length > 0 ? available : causes.filter((cause) => !revealedThisMonth.has(cause.causeId));
    const weighted: LocalCauseRecord[] = [];

    (pool.length > 0 ? pool : causes).forEach((cause) => {
      const weight = cause.tier === 1
        ? settings.tierWeights.tier1
        : cause.tier === 2
          ? settings.tierWeights.tier2
          : settings.tierWeights.tier3;
      const copies = Math.max(1, Math.round(weight / 10));
      for (let index = 0; index < copies; index += 1) {
        weighted.push(cause);
      }
    });

    const selected = weighted[Math.floor(Math.random() * weighted.length)] ?? pool[0] ?? causes[0];
    const timestamp = now();
    const ritualEntry: LocalRitualEntry = {
      id: nextScopedId(LOCAL_STORAGE_KEYS.nextRitualEntryIdPrefix, workspaceId),
      workspaceId,
      monthKey,
      causeId: selected.causeId,
      kind: resolveRitualKind(selected, settings, monthKey),
      chosenByUserId: user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.setRitualEntries([...this.getRitualEntries(), ritualEntry]);

    const nextRitual: LocalMonthlyRitual = ritual
      ? {
          ...ritual,
          revealedCauseIds: Array.from(new Set([...ritual.revealedCauseIds, selected.causeId])),
          chosenByUserId: user.id,
          updatedAt: timestamp,
        }
      : {
          workspaceId,
          monthKey,
          revealedCauseIds: [selected.causeId],
          chosenByUserId: user.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    const nextRituals = ritual
      ? this.getMonthlyRituals().map((entry) => (
          entry.workspaceId === workspaceId && entry.monthKey === monthKey ? nextRitual : entry
        ))
      : [...this.getMonthlyRituals(), nextRitual];
    this.setMonthlyRituals(nextRituals);

    return normalizeMonthlyLogEntry(ritualEntry);
  },

  completeMonthlyLog(
    workspaceId: string,
    id: number,
    updates: {
      amount?: number | string;
      hours?: number | string;
      dateCompleted?: string | Date;
      note?: string;
      photoUrl?: string;
    },
  ) {
    const user = requireSessionUser();
    requireApprovedMembership(workspaceId, user.id);
    const completedAt = updates.dateCompleted
      ? (updates.dateCompleted instanceof Date ? updates.dateCompleted.toISOString() : new Date(updates.dateCompleted).toISOString())
      : now();
    let updatedEntry: LocalRitualEntry | null = null;

    const nextEntries = this.getRitualEntries().map((entry) => {
      if (entry.workspaceId !== workspaceId || entry.id !== id) return entry;
      updatedEntry = {
        ...entry,
        amount: updates.amount === undefined ? entry.amount : Number(updates.amount),
        hours: updates.hours === undefined ? entry.hours : Number(updates.hours),
        date: completedAt,
        note: updates.note ?? entry.note,
        photo: updates.photoUrl ?? entry.photo ?? null,
        updatedAt: completedAt,
      };
      return updatedEntry;
    });
    if (!updatedEntry) throw new Error("Monthly log not found");
    this.setRitualEntries(nextEntries);

    const completedEntry = updatedEntry as LocalRitualEntry;
    const existingImpactLog = this.getImpactLogs().find((entry) => entry.ritualEntryId === id);
    const nextImpactLog: LocalImpactLog = existingImpactLog
      ? {
          ...existingImpactLog,
          amount: completedEntry.amount,
          hours: completedEntry.hours,
          date: completedAt,
          note: completedEntry.note,
          photo: completedEntry.photo ?? null,
        }
      : {
          logId: nextScopedId(LOCAL_STORAGE_KEYS.nextImpactLogIdPrefix, workspaceId),
          workspaceId,
          ritualEntryId: id,
          monthKey: completedEntry.monthKey,
          causeId: completedEntry.causeId,
          kind: completedEntry.kind,
          amount: completedEntry.amount,
          hours: completedEntry.hours,
          date: completedAt,
          note: completedEntry.note,
          photo: completedEntry.photo ?? null,
          createdByUserId: user.id,
          createdAt: completedAt,
        };

    const nextImpactLogs = existingImpactLog
      ? this.getImpactLogs().map((entry) => (entry.ritualEntryId === id ? nextImpactLog : entry))
      : [...this.getImpactLogs(), nextImpactLog];
    this.setImpactLogs(nextImpactLogs);

    return normalizeMonthlyLogEntry(updatedEntry);
  },

  deleteMonthlyLog(workspaceId: string, id: number) {
    const user = requireSessionUser();
    const membership = requireApprovedMembership(workspaceId, user.id);
    const ritualEntry = this.getRitualEntries().find((entry) => entry.workspaceId === workspaceId && entry.id === id);
    if (!ritualEntry) return;
    if (!canManageWorkspace(membership.role) && ritualEntry.chosenByUserId !== user.id) {
      throw new Error("You can only remove impact entries you created.");
    }
    const deletedEntryIds = new Set(
      this.getRitualEntries()
        .filter((entry) => entry.workspaceId === workspaceId && entry.monthKey === ritualEntry.monthKey)
        .map((entry) => entry.id),
    );
    const remainingEntries = this.getRitualEntries().filter((entry) => !(entry.workspaceId === workspaceId && entry.monthKey === ritualEntry.monthKey));
    this.setRitualEntries(remainingEntries);
    this.setImpactLogs(this.getImpactLogs().filter((entry) => !entry.ritualEntryId || !deletedEntryIds.has(entry.ritualEntryId)));

    const monthEntries = remainingEntries.filter((entry) => entry.workspaceId === workspaceId && entry.monthKey === ritualEntry.monthKey);
    const existingRituals = this.getMonthlyRituals();
    const monthRitual = existingRituals.find((entry) => entry.workspaceId === workspaceId && entry.monthKey === ritualEntry.monthKey) ?? null;

    if (!monthRitual) return;

    if (monthEntries.length === 0) {
      this.setMonthlyRituals(existingRituals.filter((entry) => !(entry.workspaceId === workspaceId && entry.monthKey === ritualEntry.monthKey)));
      return;
    }

    const updatedRitual = {
      ...monthRitual,
      revealedCauseIds: Array.from(new Set(monthEntries.map((entry) => entry.causeId))),
      updatedAt: now(),
    };
    this.setMonthlyRituals(existingRituals.map((entry) => (
      entry.workspaceId === workspaceId && entry.monthKey === ritualEntry.monthKey ? updatedRitual : entry
    )));
  },

  getDashboardStats(workspaceId: string) {
    const causes = this.getCauseRecords().filter((cause) => cause.workspaceId === workspaceId);
    const completedLogs = this.getImpactLogs().filter((entry) => entry.workspaceId === workspaceId);

    const donationByMonth: Record<string, number> = {};
    const volunteerByMonth: Record<string, number> = {};

    completedLogs.forEach((log) => {
      if (log.amount) {
        donationByMonth[log.monthKey] = (donationByMonth[log.monthKey] ?? 0) + Number(log.amount);
      }
      if (log.hours) {
        volunteerByMonth[log.monthKey] = (volunteerByMonth[log.monthKey] ?? 0) + Number(log.hours);
      }
    });

    return {
      totalDonated: completedLogs.reduce((sum, log) => sum + Number(log.amount ?? 0), 0),
      totalVolunteerHours: completedLogs.reduce((sum, log) => sum + Number(log.hours ?? 0), 0),
      donationByMonth,
      volunteerByMonth,
      causesByTier: {
        tier1: causes.filter((cause) => cause.tier === 1).length,
        tier2: causes.filter((cause) => cause.tier === 2).length,
        tier3: causes.filter((cause) => cause.tier === 3).length,
      },
      milestones: completedLogs.map((log) => {
        const cause = causes.find((entry) => entry.causeId === log.causeId);
        if (!cause) return `Completed a ${log.kind} impact in ${log.monthKey}`;
        return `Completed ${cause.name} in ${log.monthKey}`;
      }),
    };
  },

  getDiscoveryCauses() {
    ensureStorageReady();
    return safeParse<DiscoveryCauseTemplate[]>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.discovery), DISCOVERY_SEED)
      .map(normalizeDiscoveryTemplate);
  },

  getDiscoveryCauseById(templateId: string) {
    return this.getDiscoveryCauses().find((entry) => entry.id === templateId) ?? null;
  },

  getExistingWorkspaceCauseForDiscovery(workspaceId: string, templateId: string) {
    const template = this.getDiscoveryCauseById(templateId);
    if (!template) return null;
    return this.getCauseRecords().find((entry) => (
      entry.workspaceId === workspaceId
      && entry.name.trim().toLowerCase() === template.name.trim().toLowerCase()
      && (entry.websiteUrl ?? "").trim().toLowerCase() === (template.websiteUrl ?? "").trim().toLowerCase()
    )) ?? null;
  },

  addDiscoveryCauseToWorkspace(
    workspaceId: string,
    templateId: string,
    overrides?: {
      type: LocalCauseRecord["type"];
      tier: 1 | 2 | 3;
      scope: CauseScope;
    },
  ) {
    const user = requireSessionUser();
    requireWorkspaceManager(workspaceId, user.id);
    const template = this.getDiscoveryCauseById(templateId);
    if (!template) throw new Error("Discovery cause not found.");
    if (this.getExistingWorkspaceCauseForDiscovery(workspaceId, templateId)) {
      throw new Error("This cause is already in the Giving Space.");
    }
    return this.createCause(workspaceId, {
      name: template.name,
      type: overrides?.type ?? template.type,
      tier: overrides?.tier ?? template.tier,
      description: template.description,
      submittedBy: user.displayName,
      location: overrides?.scope === "local" ? "Local" : overrides?.scope === "global" ? "Global" : template.location ?? null,
      link: template.websiteUrl ?? null,
      tags: [...template.categories, template.tags].filter(Boolean).join(", "),
      photoUrl: template.imageUrl ?? null,
    });
  },
};
