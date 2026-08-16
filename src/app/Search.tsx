// ─── SEARCH / DISCOVER ───────────────────────────────────────────────────────
//
// The screen behind the magnifier and the Discover tab. It has two modes and
// they are both the point:
//
//   • Nothing typed → discovery. Recent searches, trending hashtags, creators
//     who are open to collab, and the way into Trending Sounds. An empty search
//     box that shows nothing is a wasted screen.
//   • Something typed → results, in four kinds (creators, posts, sounds, tags),
//     filtered by a tab rather than a second request. "Top" mixes them, because
//     that is what someone who typed two words actually wants.
//
// Typing is debounced and responses are sequenced, so a slow request for "no"
// can never overwrite the results for "nova" — the bug every search box has
// until it is written down.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Clock, Flame, Hash, Music2, Play, RefreshCw, Search as SearchIcon,
  SearchX, Sparkles, TrendingUp, Users, WifiOff, X,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { ACCENT, EmptyState, useTokens } from "./settings-ui";
import { ContentGrid, CreatorRow, SegmentedTabs, Thumb, formatCount } from "./profile-ui";
import {
  type HashtagResult, type SearchResults, EMPTY_RESULTS,
  clearSearches, forgetSearch, recentSearches, rememberSearch, search,
  suggestedCreators, totalResults, trendingHashtags,
} from "./search";
import { type Sound } from "./TrendingSounds";

type Status = "idle" | "loading" | "ready" | "error";
type Tab = "top" | "creators" | "videos" | "sounds" | "tags";

const DEBOUNCE_MS = 280;

export function SearchScreen({
  onBack, onOpenProfile, onOpenPost, canOpenPost, onOpenSounds,
}: {
  onBack: () => void;
  onOpenProfile?: (username: string) => void;
  onOpenPost?: (postId: string) => void;
  canOpenPost?: (postId: string) => boolean;
  /** Opens Trending Sounds, on a specific sound when one was tapped. */
  onOpenSounds?: (soundId?: string) => void;
}) {
  const isDark = useTheme();
  const t = useTokens(isDark);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("top");
  const [recents, setRecents] = useState<string[]>(() => recentSearches());

  const inputRef = useRef<HTMLInputElement | null>(null);
  // Monotonic request id — only the newest response is allowed to land.
  const requestId = useRef(0);

  const runSearch = useCallback(async (value: string) => {
    const id = ++requestId.current;
    if (!value.trim()) {
      setStatus("idle");
      setResults(EMPTY_RESULTS);
      return;
    }
    setStatus("loading");
    setError("");
    const result = await search(value);
    if (id !== requestId.current) return; // A newer query is already in flight.
    if (!result.ok) { setError(result.error); setStatus("error"); return; }
    setResults(result.value);
    setStatus("ready");
  }, []);

  // Debounced: one request per pause, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { void runSearch(query); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const submit = () => {
    if (!query.trim()) return;
    setRecents(rememberSearch(query));
    void runSearch(query);
  };

  const pick = (value: string) => {
    setQuery(value);
    setRecents(rememberSearch(value));
    setTab("top");
    inputRef.current?.focus();
  };

  const counts = useMemo(() => ({
    top: totalResults(results),
    creators: results.creators.length,
    videos: results.videos.length,
    sounds: results.sounds.length,
    tags: results.hashtags.length,
  }), [results]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "top", label: "Top", count: counts.top },
    { id: "creators", label: "Creators", count: counts.creators },
    { id: "videos", label: "Posts", count: counts.videos },
    { id: "sounds", label: "Sounds", count: counts.sounds },
    { id: "tags", label: "Tags", count: counts.tags },
  ];

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ background: t.bg }}>
      {/* ── Search bar ── */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.divider}` }}>
        <button onClick={onBack} aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-70"
          style={{ background: t.backBtnBg, border: t.cardBorder }}>
          <ArrowLeft className="w-4 h-4" style={{ color: t.heading }} />
        </button>
        <div className="flex-1 flex items-center gap-2 rounded-full px-4 h-11"
          style={{ background: t.fieldBg, border: t.fieldBorder }}>
          <SearchIcon className="w-4 h-4 flex-shrink-0" style={{ color: t.sub }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTab("top"); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Search creators, posts, sounds"
            aria-label="Search creators, posts and sounds"
            autoFocus
            className="flex-1 bg-transparent text-[15px] outline-none min-w-0"
            style={{ color: t.heading }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setStatus("idle"); setResults(EMPTY_RESULTS); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: t.chipBg }}>
              <X className="w-3 h-3" style={{ color: t.sub }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Result tabs ── only meaningful once something has been searched ── */}
      {status === "ready" && counts.top > 0 && (
        <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} layoutId="search-tabs" />
      )}

      <div className="flex-1 overflow-y-auto pb-12" style={{ scrollbarWidth: "none" }}>
        {/* ── Discovery ── */}
        {status === "idle" && (
          <DiscoverPanel
            t={t} recents={recents}
            onPick={pick}
            onForget={(value) => setRecents(forgetSearch(value))}
            onClearRecents={() => setRecents(clearSearches())}
            onOpenProfile={onOpenProfile}
            onOpenSounds={onOpenSounds}
          />
        )}

        {status === "loading" && <SearchSkeleton t={t} />}

        {status === "error" && (
          <div className="flex flex-col items-center text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171" }}>
              <WifiOff className="w-7 h-7" />
            </div>
            <p className="font-bold text-[16px]" style={{ color: t.heading }}>Search didn't go through</p>
            <p className="text-[13px] mt-1.5 leading-relaxed max-w-[270px]" style={{ color: t.sub }}>{error}</p>
            <button onClick={() => void runSearch(query)}
              className="mt-5 px-5 py-2.5 rounded-full text-[13px] font-bold text-white flex items-center gap-2"
              style={{ background: `linear-gradient(135deg,${ACCENT},#0077cc)`, boxShadow: "0 6px 18px rgba(0,174,239,0.35)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}

        {status === "ready" && counts.top === 0 && (
          <EmptyState icon={<SearchX className="w-7 h-7" />} t={t}
            title={`No results for “${query.trim()}”`}
            body="Check the spelling, or try a shorter search — a name, a city or a hashtag all work." />
        )}

        {status === "ready" && counts.top > 0 && (
          <>
            <p className="text-[12px] px-5 pt-3 pb-1" style={{ color: t.sub }}>
              {counts.top} result{counts.top === 1 ? "" : "s"} for “{query.trim()}”
            </p>

            {(tab === "top" || tab === "creators") && results.creators.length > 0 && (
              <Section title="Creators" icon={<Users className="w-3.5 h-3.5" />} t={t}
                more={tab === "top" && results.creators.length > 3 ? () => setTab("creators") : undefined}>
                {(tab === "top" ? results.creators.slice(0, 3) : results.creators).map((creator, i, list) => (
                  <CreatorRow key={creator.id} creator={creator} onOpen={onOpenProfile} last={i === list.length - 1} />
                ))}
              </Section>
            )}

            {(tab === "top" || tab === "videos") && results.videos.length > 0 && (
              <Section title="Posts" icon={<Play className="w-3.5 h-3.5" />} t={t}
                more={tab === "top" && results.videos.length > 6 ? () => setTab("videos") : undefined}>
                <div className="px-0.5">
                  <ContentGrid
                    items={tab === "top" ? results.videos.slice(0, 6) : results.videos}
                    onOpen={onOpenPost}
                    canOpen={canOpenPost}
                  />
                </div>
              </Section>
            )}

            {(tab === "top" || tab === "sounds") && results.sounds.length > 0 && (
              <Section title="Sounds" icon={<Music2 className="w-3.5 h-3.5" />} t={t}
                more={tab === "top" && results.sounds.length > 2 ? () => setTab("sounds") : undefined}>
                {(tab === "top" ? results.sounds.slice(0, 2) : results.sounds).map((sound) => (
                  <SoundRow key={sound.id} sound={sound} t={t} onOpen={() => onOpenSounds?.(sound.id)} />
                ))}
              </Section>
            )}

            {(tab === "top" || tab === "tags") && results.hashtags.length > 0 && (
              <Section title="Hashtags" icon={<Hash className="w-3.5 h-3.5" />} t={t}>
                {(tab === "top" ? results.hashtags.slice(0, 3) : results.hashtags).map((hashtag) => (
                  <HashtagRow key={hashtag.tag} hashtag={hashtag} t={t} onOpen={() => pick(hashtag.tag)} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── DISCOVERY ───────────────────────────────────────────────────────────────

function DiscoverPanel({
  t, recents, onPick, onForget, onClearRecents, onOpenProfile, onOpenSounds,
}: {
  t: ReturnType<typeof useTokens>;
  recents: string[];
  onPick: (value: string) => void;
  onForget: (value: string) => void;
  onClearRecents: () => void;
  onOpenProfile?: (username: string) => void;
  onOpenSounds?: (soundId?: string) => void;
}) {
  const suggestions = useMemo(() => suggestedCreators(6), []);
  const tags = useMemo(() => trendingHashtags(), []);

  return (
    <div className="pt-2">
      {recents.length > 0 && (
        <Section title="Recent" icon={<Clock className="w-3.5 h-3.5" />} t={t}
          action={<button onClick={onClearRecents} className="text-[12px] font-semibold" style={{ color: ACCENT }}>Clear</button>}>
          {recents.map((value) => (
            <div key={value} className="flex items-center gap-3 px-5 py-2.5">
              <SearchIcon className="w-4 h-4 flex-shrink-0" style={{ color: t.chevron }} />
              <button onClick={() => onPick(value)} className="flex-1 text-left text-[14px] truncate"
                style={{ color: t.body }}>{value}</button>
              <button onClick={() => onForget(value)} aria-label={`Remove ${value}`}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.chipBg }}>
                <X className="w-3 h-3" style={{ color: t.sub }} />
              </button>
            </div>
          ))}
        </Section>
      )}

      <Section title="Trending hashtags" icon={<Flame className="w-3.5 h-3.5" />} t={t}>
        <div className="flex flex-wrap gap-2 px-5 pt-1">
          {tags.map((tag) => (
            <button key={tag.tag} onClick={() => onPick(tag.tag)}
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5"
              style={{ background: t.chipBg, border: t.chipBorder, color: t.body }}>
              {tag.tag}
              <span className="text-[11px]" style={{ color: t.sub }}>{formatCount(tag.views)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Open to collab" icon={<Sparkles className="w-3.5 h-3.5" />} t={t}>
        {suggestions.map((creator, i) => (
          <CreatorRow key={creator.id} creator={creator} onOpen={onOpenProfile} last={i === suggestions.length - 1} />
        ))}
      </Section>

      {onOpenSounds && (
        <div className="px-5 pt-1 pb-6">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => onOpenSounds()}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ background: t.cardBg, border: t.cardBorder }}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,174,239,0.16)", color: ACCENT }}>
              <TrendingUp className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[14px]" style={{ color: t.heading }}>Trending sounds</span>
              <span className="block text-[12px] mt-0.5" style={{ color: t.sub }}>
                The charts, updated hourly — and who is posting with them
              </span>
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ─── ROWS ────────────────────────────────────────────────────────────────────

function SoundRow({ sound, t, onOpen }: { sound: Sound; t: ReturnType<typeof useTokens>; onOpen: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.99 }} onClick={onOpen}
      className="w-full flex items-center gap-3 px-5 py-3 text-left">
      <Thumb src={sound.artwork} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[14px] truncate" style={{ color: t.heading }}>{sound.title}</span>
        <span className="block text-[12px] truncate" style={{ color: t.sub }}>
          @{sound.creator} · {sound.genre} · {formatCount(sound.videoCount)} posts
        </span>
      </span>
      <Music2 className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
    </motion.button>
  );
}

function HashtagRow({ hashtag, t, onOpen }: { hashtag: HashtagResult; t: ReturnType<typeof useTokens>; onOpen: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.99 }} onClick={onOpen}
      className="w-full flex items-center gap-3 px-5 py-3 text-left">
      <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: t.chipBg, border: t.chipBorder, color: ACCENT }}>
        <Hash className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[14px] truncate" style={{ color: t.heading }}>{hashtag.tag}</span>
        <span className="block text-[12px]" style={{ color: t.sub }}>
          {hashtag.posts} post{hashtag.posts === 1 ? "" : "s"} · {formatCount(hashtag.views)} views
        </span>
      </span>
    </motion.button>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────

function Section({
  title, icon, t, children, more, action,
}: {
  title: string;
  icon: React.ReactNode;
  t: ReturnType<typeof useTokens>;
  children: React.ReactNode;
  /** "See all" — only offered when there is more behind the fold. */
  more?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="pb-3">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: t.sectionLbl }}>
          {icon} {title}
        </p>
        {action}
        {more && (
          <button onClick={more} className="text-[12px] font-semibold" style={{ color: ACCENT }}>See all</button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── LOADING ─────────────────────────────────────────────────────────────────

function SearchSkeleton({ t }: { t: ReturnType<typeof useTokens> }) {
  return (
    <div className="pt-4" aria-busy="true" aria-label="Searching">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <motion.span animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
            className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: t.chipBg }} />
          <div className="flex-1 space-y-2">
            <motion.span animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 + 0.05 }}
              className="block h-3 rounded-full" style={{ background: t.chipBg, width: `${40 + (i % 3) * 15}%` }} />
            <motion.span animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 + 0.1 }}
              className="block h-3 rounded-full" style={{ background: t.chipBg, width: `${65 + (i % 2) * 10}%` }} />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-1 px-0.5 mt-3">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
            style={{ aspectRatio: "9 / 14", background: t.chipBg }} />
        ))}
      </div>
    </div>
  );
}
