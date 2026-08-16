// ─── SEARCH ──────────────────────────────────────────────────────────────────
//
// One query, four kinds of answer: creators, posts, sounds and hashtags. They
// are searched together and returned together, because "who or what is this?"
// is one question to the person typing — the tabs on the results screen filter
// an answer that already exists rather than firing four different requests.
//
// Matching is deliberately forgiving: the query is normalised (case, leading @
// and #, punctuation), and a creator matches on handle, name, bio, location or
// collab status. A search that only matched handles would fail the thing people
// actually type, which is a vibe ("photographer", "berlin", "open to collab").
//
// ⚠️  PROTOTYPE — this searches the seeded directory in memory.
//
// ── Replacing this with a real backend ──────────────────────────────────────
//   search() → GET /search?q=…            (one response, four result sets)
// The shape below is what the screen renders, so an API returning it needs no
// changes here. Recent queries stay client-side either way.

import { type Result } from "./auth-store";
import { CREATORS, FEED, type Creator, type FeedVideo, creatorById } from "./creators";
import { SOUNDS, type Sound } from "./TrendingSounds";
import { ownFeedVideos } from "./posts-store";

const RECENTS_KEY = "connextionz.recentSearches";
const MAX_RECENTS = 8;

// ─── SHAPES ──────────────────────────────────────────────────────────────────

export interface HashtagResult {
  tag: string;
  /** How many posts carry it — the only number a tag row can honestly show. */
  posts: number;
  views: number;
}

export interface SearchResults {
  creators: Creator[];
  videos: FeedVideo[];
  sounds: Sound[];
  hashtags: HashtagResult[];
}

export const EMPTY_RESULTS: SearchResults = { creators: [], videos: [], sounds: [], hashtags: [] };

export const totalResults = (r: SearchResults) =>
  r.creators.length + r.videos.length + r.sounds.length + r.hashtags.length;

// ─── NORMALISING ─────────────────────────────────────────────────────────────

const normalise = (value: string) =>
  value.trim().toLowerCase().replace(/^[@#]+/, "").replace(/[^a-z0-9\s._-]/g, "");

/** Every term has to appear somewhere, so "berlin dj" is narrower than "dj". */
const terms = (query: string) => normalise(query).split(/\s+/).filter(Boolean);

const matches = (haystack: string, words: string[]) => {
  const hay = haystack.toLowerCase();
  return words.every((word) => hay.includes(word));
};

// ─── HASHTAG INDEX ───────────────────────────────────────────────────────────

/** Built once from the feed — every tag anybody has posted, with its reach. */
const HASHTAG_INDEX: HashtagResult[] = (() => {
  const byTag = new Map<string, HashtagResult>();
  for (const video of FEED) {
    for (const tag of video.hashtags) {
      const key = tag.toLowerCase();
      const current = byTag.get(key) ?? { tag: key, posts: 0, views: 0 };
      byTag.set(key, { tag: key, posts: current.posts + 1, views: current.views + video.views });
    }
  }
  return [...byTag.values()].sort((a, b) => b.views - a.views);
})();

/** The chips shown before anything is typed. */
export const trendingHashtags = (): HashtagResult[] => HASHTAG_INDEX.slice(0, 8);

/** Creators worth suggesting on an empty query: open to collab, best scores. */
export const suggestedCreators = (limit = 6): Creator[] =>
  [...CREATORS]
    .filter((c) => c.openToCollab)
    .sort((a, b) => b.collabScore - a.collabScore || b.followers - a.followers)
    .slice(0, limit);

// ─── SEARCHING ───────────────────────────────────────────────────────────────

/** Posts the viewer published are searchable too — they are in the same feed. */
const searchableVideos = (): FeedVideo[] => [...ownFeedVideos(), ...FEED];

function run(query: string): SearchResults {
  const words = terms(query);
  if (!words.length) return EMPTY_RESULTS;

  const creators = CREATORS.filter((c) =>
    matches(`${c.username} ${c.displayName} ${c.bio} ${c.location} ${c.collabStatus}`, words),
  ).sort((a, b) => {
    // An exact handle beats a bio mention, however popular the bio's owner is.
    const exact = (c: Creator) => (normalise(c.username) === words.join(" ") ? 1 : 0);
    return exact(b) - exact(a) || b.followers - a.followers;
  });

  const videos = searchableVideos().filter((v) => {
    const creator = creatorById(v.creatorId);
    const who = creator ? `${creator.username} ${creator.displayName}` : "";
    return matches(`${v.caption} ${v.hashtags.join(" ")} ${v.audio} ${who}`, words);
  }).sort((a, b) => b.views - a.views);

  const sounds = SOUNDS.filter((s) =>
    matches(`${s.title} ${s.creator} ${s.genre}`, words),
  ).sort((a, b) => a.rank - b.rank);

  const hashtags = HASHTAG_INDEX.filter((h) => matches(h.tag, words));

  return { creators, videos, sounds, hashtags };
}

/**
 * The network seam. Latency is real enough for the screen's loading state to be
 * worth having, and an offline browser fails the way a fetch would.
 */
export async function search(query: string): Promise<Result<SearchResults>> {
  await new Promise((r) => setTimeout(r, 320));
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "You're offline. Reconnect to search creators and posts." };
  }
  if (!normalise(query)) return { ok: true, value: EMPTY_RESULTS };
  return { ok: true, value: run(query) };
}

// ─── RECENT QUERIES ──────────────────────────────────────────────────────────

export function recentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeRecents(values: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(values.slice(0, MAX_RECENTS)));
  } catch {
    // Recents are a convenience — a full quota must not break searching.
  }
}

/** Most recent first, no duplicates. Returns the new list so state can follow. */
export function rememberSearch(query: string): string[] {
  const value = query.trim();
  if (!value) return recentSearches();
  const next = [value, ...recentSearches().filter((v) => v.toLowerCase() !== value.toLowerCase())];
  writeRecents(next);
  return next.slice(0, MAX_RECENTS);
}

export function forgetSearch(query: string): string[] {
  const next = recentSearches().filter((v) => v !== query);
  writeRecents(next);
  return next;
}

export function clearSearches(): string[] {
  writeRecents([]);
  return [];
}
