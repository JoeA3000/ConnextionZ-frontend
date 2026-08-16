// ─── PROFILE SCREEN ──────────────────────────────────────────────────────────
//
// One screen renders both profiles — your own and someone else's. The only
// difference is `isOwner`, which decides the action bar (Edit Profile vs
// Follow / Message / Collab) and whether the counts open a connections list.
// Keeping it as one component is what stops the two from drifting: a change to
// the header, the tabs or the grid lands on both by construction.
//
// The owner's profile is assembled from the session rather than the directory —
// see `useOwnCreator` — so an edited bio or a new avatar shows up here the
// moment it is saved, with no refetch and no second copy of the identity.
//
// ── Replacing this with a real backend ──────────────────────────────────────
// The screen takes a `Creator` and handlers; it never fetches. Point the caller
// at `GET /creators/:handle` (and `GET /me` for the owner) and nothing here
// changes. Follow state already comes from `follow-store.ts`, which owns its own
// endpoint seam.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Clock, Film, Link2, ListMusic, MapPin, Sparkles, Users, X,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { ACCENT, useTokens, EmptyState } from "./settings-ui";
import { type Creator, OWN_PLAYLISTS, OWN_STATS, creatorById } from "./creators";
import { useOwnContent } from "./posts-store";
import {
  followingIds, ownFollowerCreators, useFollowerCount, useFollowingCount, useFollowingCreators,
} from "./follow-store";
import { useSession, useViewer } from "./session";
import { updateAvatar } from "./auth-store";
import {
  Avatar, ContentGrid, CollabScorePill, CreatorRow, ProfileActionBar, SegmentedTabs,
  StatCounts, Thumb, VerifiedBadge, formatCount, useScrolled,
} from "./profile-ui";
import { AvatarPicker } from "./avatar-picker";

type ProfileTab = "posts" | "playlists" | "collabs";

// ─── OWN PROFILE ─────────────────────────────────────────────────────────────

/**
 * The signed-in creator as a `Creator`, so the screen has one shape to render.
 * `following` is live from the follow store — unfollowing anyone, from anywhere,
 * moves this number.
 */
export function useOwnCreator(): Creator {
  const viewer = useViewer();
  const followingCount = useFollowingCount();
  // Posts the viewer has published in this session sit ahead of the seeded back
  // catalogue, so a new upload is the first tile on the grid.
  const posts = useOwnContent();

  return useMemo<Creator>(() => ({
    id: "me",
    username: viewer.username,
    displayName: viewer.displayName,
    avatarUrl: viewer.avatarUrl,
    avatarColor: viewer.avatarColor,
    bio: viewer.bio,
    location: viewer.location,
    website: viewer.website,
    verified: false,
    online: true,
    collabStatus: "Available for Collaboration",
    collabScore: OWN_STATS.collabScore,
    collabCount: OWN_STATS.collabCount,
    followers: OWN_STATS.followers,
    following: followingCount,
    openToCollab: true,
    responseTime: "< 4 hours",
    posts,
    playlists: OWN_PLAYLISTS,
  }), [viewer, followingCount, posts]);
}

// ─── SCREEN ──────────────────────────────────────────────────────────────────

export function ProfileScreen({
  creator, isOwner, onBack, onEditProfile, onOpenSettings, onOpenDashboard, onOpenProfile,
  onMessage, onCollab, onShare, onOpenPost, canOpenPost,
}: {
  creator: Creator;
  isOwner: boolean;
  /** Omitted on the tab-root own profile, where the bottom nav is the way out. */
  onBack?: () => void;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  /** Owner only — opens the analytics behind these numbers. */
  onOpenDashboard?: () => void;
  /** Opening another creator from a connections list. */
  onOpenProfile?: (username: string) => void;
  onMessage?: (creator: Creator) => void;
  onCollab?: (creator: Creator) => void;
  onShare?: (creator: Creator) => void;
  /** Opens a post — the app jumps the feed to it. */
  onOpenPost?: (postId: string) => void;
  /** Which posts have somewhere to open; the rest render as plain tiles. */
  canOpenPost?: (postId: string) => boolean;
}) {
  const isDark = useTheme();
  const t = useTokens(isDark);
  const { account, setAccount } = useSession();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [connections, setConnections] = useState<"followers" | "following" | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const { ref: scrollRef, scrolled } = useScrolled(90);

  // Own follower count is not affected by the viewer's own follow graph, so the
  // hook is only meaningful for other people's profiles.
  const followers = useFollowerCount(creator);
  const followerCount = isOwner ? creator.followers : followers;

  const collabPosts = useMemo(() => creator.posts.filter((p) => p.collabWith), [creator.posts]);

  const tabItems: { id: ProfileTab; label: string; count?: number }[] = [
    { id: "posts", label: "Posts", count: creator.posts.length },
    { id: "playlists", label: "Playlists", count: creator.playlists.length },
    { id: "collabs", label: "Collabs", count: collabPosts.length },
  ];

  /**
   * The owner can swap their photo straight from the header. It saves on
   * confirm — unlike Edit Profile, where the photo is staged with the rest of
   * the form — but both run the same picker, so validation, the crop and the
   * preview cannot diverge between the two entry points.
   */
  const saveAvatar = async (dataUrl: string) => {
    setAvatarError("");
    setAvatarSaving(true);
    const result = await updateAvatar(account.email, dataUrl);
    setAvatarSaving(false);
    if (!result.ok) { setAvatarError(result.error); return; }
    setAccount(result.value);
  };

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" style={{ background: t.bg }}>
      {/* Compact bar — transparent over the banner, frosted once scrolled. */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center gap-3 px-4 pt-12 pb-3 transition-colors"
        style={{
          background: scrolled ? (isDark ? "rgba(0,9,30,0.86)" : "rgba(242,245,251,0.9)") : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? `1px solid ${t.divider}` : "1px solid transparent",
        }}>
        {onBack && (
          <button onClick={onBack} aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-70"
            style={{ background: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.7)", border: t.cardBorder, backdropFilter: "blur(8px)" }}>
            <ArrowLeft className="w-4 h-4" style={{ color: t.heading }} />
          </button>
        )}
        <AnimatePresence>
          {scrolled && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="flex items-center gap-2 min-w-0">
              <Avatar src={creator.avatarUrl} name={creator.displayName} color={creator.avatarColor} size={28} />
              <span className="font-bold text-[15px] truncate" style={{ color: t.heading }}>@{creator.username}</span>
              {creator.verified && <VerifiedBadge size={13} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* ── Banner ── the creator's own colour, so profiles read differently
            from each other even before the avatar loads. */}
        <div className="h-[132px] w-full relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `linear-gradient(130deg, ${creator.avatarColor}55, ${ACCENT}33 55%, transparent)`,
          }} />
          {creator.avatarUrl && (
            <img src={creator.avatarUrl} alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(34px)", transform: "scale(1.6)", opacity: isDark ? 0.5 : 0.35 }} />
          )}
          <div className="absolute inset-0" style={{
            background: isDark
              ? "linear-gradient(to bottom, rgba(0,9,30,0.1), rgba(0,9,30,0.92))"
              : "linear-gradient(to bottom, rgba(242,245,251,0.1), rgba(242,245,251,0.92))",
          }} />
        </div>

        <div className="px-5 -mt-11 pb-28">
          {/* ── Identity ── */}
          <div className="flex items-end justify-between gap-3 mb-4">
            {isOwner ? (
              <div className="relative">
                <AvatarPicker
                  variant="avatarOnly"
                  avatarUrl={creator.avatarUrl}
                  name={creator.displayName || creator.username}
                  color={creator.avatarColor}
                  onChange={saveAvatar}
                  size={92}
                  disabled={avatarSaving}
                  busy={avatarSaving}
                />
              </div>
            ) : (
              <Avatar src={creator.avatarUrl} name={creator.displayName} color={creator.avatarColor}
                size={92} ring ringColor={ACCENT} online={creator.online} />
            )}
            <div className="pb-1">
              <CollabScorePill score={creator.collabScore} count={creator.collabCount} />
            </div>
          </div>

          {avatarError && (
            <p className="text-[12px] mb-3 leading-snug" style={{ color: "#f87171" }} role="alert">{avatarError}</p>
          )}

          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="font-extrabold text-[22px] leading-tight truncate" style={{ color: t.heading }}>
              {creator.displayName || creator.username}
            </h1>
            {creator.verified && <VerifiedBadge size={16} />}
          </div>
          <p className="text-[14px] font-semibold mb-2.5" style={{ color: ACCENT }}>@{creator.username}</p>

          {creator.collabStatus && creator.openToCollab && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3"
              style={{ background: "rgba(0,174,239,0.14)", border: `1px solid ${ACCENT}66`, color: ACCENT }}>
              <Sparkles className="w-3 h-3" /> {creator.collabStatus}
            </span>
          )}

          {creator.bio
            ? <p className="text-[14px] leading-relaxed mb-3" style={{ color: t.body }}>{creator.bio}</p>
            : isOwner && (
                <button onClick={onEditProfile} className="text-[14px] mb-3 text-left" style={{ color: t.sub }}>
                  Add a bio so creators know what you make →
                </button>
              )}

          {(creator.location || creator.website) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
              {creator.location && (
                <span className="flex items-center gap-1.5 text-[13px]" style={{ color: t.sub }}>
                  <MapPin className="w-3.5 h-3.5" /> {creator.location}
                </span>
              )}
              {creator.website && (
                <a href={`https://${creator.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: ACCENT }}>
                  <Link2 className="w-3.5 h-3.5" /> {creator.website}
                </a>
              )}
            </div>
          )}

          {/* ── Counts ── tappable only on your own profile: the prototype knows
              your graph, not somebody else's follower list. */}
          <div className="mb-5">
            <StatCounts items={[
              { label: "Followers", value: followerCount, onClick: isOwner ? () => setConnections("followers") : undefined },
              { label: "Following", value: creator.following, onClick: isOwner ? () => setConnections("following") : undefined },
              { label: "Collabs", value: creator.collabCount },
            ]} />
          </div>

          {/* ── Actions ── */}
          <ProfileActionBar
            creator={creator}
            isOwner={isOwner}
            onEdit={onEditProfile}
            onSettings={onOpenSettings}
            onDashboard={onOpenDashboard}
            onShare={onShare ? () => onShare(creator) : undefined}
            onMessage={onMessage ? () => onMessage(creator) : undefined}
            onCollab={onCollab ? () => onCollab(creator) : undefined}
          />

          {!isOwner && (
            <p className="flex items-center gap-1.5 text-[12px] mt-3" style={{ color: t.sub }}>
              <Clock className="w-3.5 h-3.5" /> Usually replies within {creator.responseTime.replace("<", "").trim()}
            </p>
          )}

          {/* ── Content ── */}
          <div className="mt-6 -mx-5">
            <SegmentedTabs tabs={tabItems} active={tab} onChange={setTab} layoutId={`profile-tabs-${creator.id}`} />

            <div className="pt-1">
              {tab === "posts" && (
                creator.posts.length
                  ? <ContentGrid items={creator.posts} onOpen={onOpenPost} canOpen={canOpenPost} />
                  : <EmptyState icon={<Film className="w-7 h-7" />} t={t}
                      title={isOwner ? "No posts yet" : "Nothing posted yet"}
                      body={isOwner ? "Your posts will show up here once you publish your first one." : "When this creator posts, it will show up here."} />
              )}

              {tab === "playlists" && (
                creator.playlists.length
                  ? (
                    <div className="px-5 pt-4 space-y-3">
                      {creator.playlists.map((list) => (
                        <motion.button key={list.id} whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                          style={{ background: t.groupBg, border: t.groupBorder }}>
                          <Thumb src={list.cover} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-[14px] truncate" style={{ color: t.heading }}>{list.title}</span>
                            <span className="block text-[12px] mt-0.5" style={{ color: t.sub }}>
                              {list.itemLabel} · {formatCount(list.plays)} plays
                            </span>
                          </span>
                          <ListMusic className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                        </motion.button>
                      ))}
                    </div>
                  )
                  : <EmptyState icon={<ListMusic className="w-7 h-7" />} t={t}
                      title="No playlists yet"
                      body={isOwner ? "Group your tracks or episodes into a playlist and it will appear here." : "This creator has not published any playlists."} />
              )}

              {tab === "collabs" && (
                collabPosts.length
                  ? <ContentGrid items={collabPosts} onOpen={onOpenPost} canOpen={canOpenPost} />
                  : <EmptyState icon={<Sparkles className="w-7 h-7" />} t={t}
                      title="No collabs yet"
                      body={isOwner ? "Accepted collab requests you publish together will land here." : "This creator has not published a collab yet."} />
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {connections && (
          <ConnectionsSheet key="connections" initialTab={connections}
            onClose={() => setConnections(null)} onOpenProfile={onOpenProfile} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CONNECTIONS SHEET ───────────────────────────────────────────────────────

/**
 * Followers and following, with a follow control on every row. The following
 * list is a snapshot taken when the sheet opens: unfollowing someone here should
 * flip their button and drop the count in the tab, not make the row vanish out
 * from under the finger that pressed it.
 */
function ConnectionsSheet({
  initialTab, onClose, onOpenProfile,
}: {
  initialTab: "followers" | "following";
  onClose: () => void;
  onOpenProfile?: (username: string) => void;
}) {
  const isDark = useTheme();
  const t = useTokens(isDark);
  const [tab, setTab] = useState(initialTab);

  const followingCount = useFollowingCount();
  const liveFollowing = useFollowingCreators();
  // Snapshot on open — see the note above. `liveFollowing` is still what seeds
  // it, so a creator followed after opening the sheet is picked up on reopen.
  const [snapshotIds] = useState<string[]>(() => followingIds());
  const followingRows = useMemo(() => {
    const seen = new Set<string>();
    const rows = [...snapshotIds, ...liveFollowing.map((c) => c.id)]
      .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
      .map(creatorById)
      .filter((c): c is Creator => !!c);
    return rows;
  }, [snapshotIds, liveFollowing]);

  const followerRows = useMemo(() => ownFollowerCreators(), []);
  const rows = tab === "following" ? followingRows : followerRows;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-40" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 34, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl flex flex-col"
        style={{ height: "76%", background: t.bg, border: t.groupBorder, borderBottom: "none" }}
        role="dialog" aria-modal="true" aria-label="Connections"
      >
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: t.chevron }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 flex-shrink-0">
          <p className="font-extrabold text-[17px]" style={{ color: t.heading }}>Connections</p>
          <button onClick={onClose} aria-label="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.chipBg }}>
            <X className="w-3.5 h-3.5" style={{ color: t.sub }} />
          </button>
        </div>

        <SegmentedTabs
          layoutId="connections-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "followers", label: "Followers", count: OWN_STATS.followers },
            { id: "following", label: "Following", count: followingCount },
          ]}
        />

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {rows.length === 0 ? (
            <EmptyState icon={<Users className="w-7 h-7" />} t={t}
              title="Not following anyone yet"
              body="Follow creators from the feed and they will collect here." />
          ) : (
            <div className="pb-8">
              {rows.map((creator, i) => (
                <CreatorRow key={creator.id} creator={creator} onOpen={onOpenProfile} last={i === rows.length - 1} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
