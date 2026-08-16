// ─── DASHBOARD DATA ──────────────────────────────────────────────────────────
//
// The numbers behind the creator dashboard. Two rules shape this file:
//
//   • Deterministic. A dashboard whose bars jump on every re-render is unusable
//     and dishonest, so every series comes from a seeded generator keyed on the
//     day and the metric. The chart moves day to day, never mid-session.
//   • Derived from one source. Totals, per-day series and the top-content list
//     are all built from `OWN_STATS` and the viewer's real posts, so the profile
//     header, the feed and this screen can never disagree about a count.
//
// ⚠️  PROTOTYPE ANALYTICS — seeded, not measured.
//
// ── Replacing this with a real backend ──────────────────────────────────────
//   fetchDashboard(range) → GET /me/analytics?range=7d|30d|90d
// The returned `DashboardData` is exactly what the screen renders, so an API
// serving that shape needs no changes on the client.

import { type Result } from "./auth-store";
import { type ContentItem, OWN_POSTS, OWN_STATS } from "./creators";
import { type OwnPost, ownPosts } from "./posts-store";

// ─── SHAPES ──────────────────────────────────────────────────────────────────

export type Range = "7d" | "30d" | "90d";

export const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
];

export type MetricKey = "views" | "likes" | "comments" | "shares" | "followers";

export interface Metric {
  key: MetricKey;
  label: string;
  /** Total across the range. */
  value: number;
  /** Change against the previous range of the same length, as a percentage. */
  deltaPct: number;
  /** One point per day, oldest first — what the sparkline and bars draw. */
  series: number[];
}

export interface CollabStats {
  totalRequests: number;
  pending: number;
  accepted: number;
  completed: number;
  active: number;
  successRatePct: number;
  avgResponseHours: number;
  collabScore: number;
  repeatCollaborators: number;
  freelanceOpportunities: number;
  jobOffers: number;
  brandInvitations: number;
  adOpportunities: number;
}

/** A row in the content-management list. */
export interface ContentRow extends ContentItem {
  comments: number;
  shares: number;
  /** Present only for posts the viewer uploaded in this prototype. */
  own?: OwnPost;
  createdAt?: number;
}

export interface DashboardData {
  range: Range;
  days: number;
  metrics: Metric[];
  collab: CollabStats;
  content: ContentRow[];
  /** Best-performing post in the range — the "what worked" callout. */
  best?: ContentRow;
  generatedAt: number;
}

// ─── SEEDED GENERATOR ────────────────────────────────────────────────────────

/** mulberry32 — small, fast, and identical for the same seed on every device. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Days since epoch — the part of the seed that makes yesterday differ. */
const dayIndex = (now: number) => Math.floor(now / 86_400_000);

/**
 * A daily series that totals roughly `total`, with a weekly rhythm (weekends
 * dip) and enough noise to look measured rather than drawn.
 */
function series(total: number, days: number, seed: string, now: number): number[] {
  const random = rng(hash(seed) ^ dayIndex(now));
  const raw = Array.from({ length: days }, (_, i) => {
    const weekday = (i + dayIndex(now)) % 7;
    const rhythm = weekday === 5 || weekday === 6 ? 0.78 : 1;
    // A gentle upward drift, so a growing account reads as growing.
    const drift = 0.82 + (i / Math.max(1, days - 1)) * 0.36;
    return rhythm * drift * (0.7 + random() * 0.6);
  });
  const sum = raw.reduce((n, v) => n + v, 0) || 1;
  return raw.map((v) => Math.max(0, Math.round((v / sum) * total)));
}

// ─── BUILDING ────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<MetricKey, string> = {
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  followers: "New followers",
};

/** How much of an all-time total lands inside a window of `days`. */
const share = (days: number) => (days === 7 ? 0.09 : days === 30 ? 0.31 : 0.72);

function buildMetrics(days: number, content: ContentRow[], now: number): Metric[] {
  const totals: Record<MetricKey, number> = {
    views: Math.round(content.reduce((n, c) => n + c.views, 0) * share(days)) + Math.round(OWN_STATS.views * share(days) * 0.15),
    likes: Math.round(content.reduce((n, c) => n + c.likes, 0) * share(days)),
    comments: Math.round(content.reduce((n, c) => n + c.comments, 0) * share(days)),
    shares: Math.round(content.reduce((n, c) => n + c.shares, 0) * share(days)),
    followers: Math.round(OWN_STATS.followers * share(days) * 0.08),
  };

  return (Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => {
    const points = series(totals[key], days, `${key}-current`, now);
    // The previous window is a different size, not the same one re-rolled —
    // otherwise every delta lands on 0% and the comparison says nothing.
    const drift = 0.72 + rng(hash(`${key}-drift-${days}`) ^ dayIndex(now))() * 0.42;
    const previous = series(Math.round(totals[key] * drift), days, `${key}-previous`, now - days * 86_400_000);
    const currentSum = points.reduce((n, v) => n + v, 0);
    const previousSum = previous.reduce((n, v) => n + v, 0) || 1;
    return {
      key,
      label: METRIC_LABELS[key],
      value: currentSum,
      deltaPct: Math.round(((currentSum - previousSum) / previousSum) * 100),
      series: points,
    };
  });
}

function buildCollab(days: number, now: number): CollabStats {
  const random = rng(hash(`collab-${days}`) ^ dayIndex(now));
  const scale = days / 30;
  const totalRequests = Math.round((38 + random() * 14) * scale) + 6;
  const pending = Math.max(1, Math.round(totalRequests * (0.12 + random() * 0.08)));
  const accepted = Math.round(totalRequests * (0.44 + random() * 0.1));
  const completed = Math.round(accepted * (0.62 + random() * 0.12));
  return {
    totalRequests,
    pending,
    accepted,
    completed,
    active: Math.max(0, accepted - completed),
    successRatePct: Math.round((accepted / Math.max(1, totalRequests)) * 100),
    avgResponseHours: Math.round((2.4 + random() * 2.6) * 10) / 10,
    collabScore: OWN_STATS.collabScore,
    repeatCollaborators: Math.max(1, Math.round(completed * (0.3 + random() * 0.2))),
    freelanceOpportunities: Math.round((9 + random() * 6) * scale),
    jobOffers: Math.round((3 + random() * 3) * scale),
    brandInvitations: Math.round((6 + random() * 5) * scale),
    adOpportunities: Math.round((4 + random() * 4) * scale),
  };
}

/**
 * Every post the viewer owns, with per-post engagement. Uploaded posts carry
 * their real counters; the seeded back catalogue gets derived ones, so the list
 * is complete rather than showing only what happens to have numbers.
 */
function buildContent(now: number): ContentRow[] {
  const uploaded: ContentRow[] = ownPosts().map((post) => ({
    ...post,
    comments: post.comments,
    shares: post.shares,
    own: post,
    createdAt: post.createdAt,
  }));

  const seeded: ContentRow[] = OWN_POSTS.map((post, i) => {
    const random = rng(hash(post.id) ^ dayIndex(now));
    return {
      ...post,
      comments: Math.round(post.likes * (0.03 + random() * 0.02)),
      shares: Math.round(post.likes * (0.05 + random() * 0.03)),
      createdAt: now - (i + 1) * 6 * 86_400_000,
    };
  });

  return [...uploaded, ...seeded];
}

// ─── FETCH ───────────────────────────────────────────────────────────────────

/**
 * The network seam. Latency is real enough that the screen's skeleton is worth
 * having, and an offline browser fails the way a fetch would — the dashboard is
 * the screen where a silent stale number would be most misleading.
 */
export async function fetchDashboard(range: Range): Promise<Result<DashboardData>> {
  await new Promise((r) => setTimeout(r, 520));
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "You're offline. Reconnect to load your analytics." };
  }

  const now = Date.now();
  const days = RANGES.find((r) => r.id === range)!.days;
  const content = buildContent(now);
  const metrics = buildMetrics(days, content, now);
  const best = [...content].sort((a, b) => b.views - a.views)[0];

  return {
    ok: true,
    value: { range, days, metrics, collab: buildCollab(days, now), content, best, generatedAt: now },
  };
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────

/** Axis labels: "Mon", or a date once the window is longer than a fortnight. */
export function axisLabels(days: number, now = Date.now()): string[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now - (days - 1 - i) * 86_400_000);
    return days <= 14
      ? date.toLocaleDateString(undefined, { weekday: "short" })
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });
}

export const signed = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
