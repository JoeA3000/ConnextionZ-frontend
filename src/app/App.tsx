import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TrendingSounds } from "./TrendingSounds";
import { AuthFlow } from "./Auth";
import { SettingsScreen, DeleteProfileModal } from "./Settings";
import { type SettingsRoute } from "./SettingsPages";
import { type Account, getSession, endSession, profileOf } from "./auth-store";
import { GoLiveSetup, CreatorLiveView, ViewerLiveView, LiveBannerStrip } from "./LiveStream";
import { InboxScreen } from "./Inbox";
import { HoloProfile } from "./HoloProfile";
import { MetaverseHub } from "./Metaverse";
import { ThemeContext, useTheme } from "./ThemeContext";
import { FEED, type Creator, type FeedVideo, creatorById, creatorByUsername, identityOf } from "./creators";
import { activateFollowGraph, useFollow, useFollowingIds } from "./follow-store";
import { SessionProvider } from "./session";
import { ProfileScreen, useOwnCreator } from "./Profile";
import { Avatar, CollabScorePill, ViewerAvatar, VerifiedBadge, formatCount } from "./profile-ui";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart, MessageCircle, Bookmark, Music,
  Home, Search, Plus, Mail, User, X, Send, Check,
  ChevronUp, ChevronDown, Navigation, Globe,
} from "lucide-react";

// ─── DATA ────────────────────────────────────────────────────────────────────
//
// The feed's posts and the creators behind them both come from `creators.ts`, so
// the identity on a video, on the profile it opens, under its comments and in
// the inbox is the same record rather than four copies of it. Comments store a
// handle and resolve the rest at render time for the same reason.

const VIDEOS = FEED;

/** The creator behind a feed post — every post in `FEED` has one. */
const creatorOf = (video: FeedVideo): Creator => creatorById(video.creatorId)!;

// ─── COMMENTS DATA ───────────────────────────────────────────────────────────

interface Comment {
  id: string;
  /** Resolved to an avatar and display name by `identityOf` when rendered. */
  username: string;
  text: string;
  likes: number;
  time: string;
  /** Written by the signed-in user, so the row renders their live avatar. */
  mine?: boolean;
}

const SEED_COMMENTS: Record<string, Comment[]> = {
  "1": [
    { id: "c1", username: "beatsby.kai", text: "This is everything \ud83d\udd25 the vibe is immaculate", likes: 842, time: "2h" },
    { id: "c2", username: "sxundcloud", text: "Waiting for that Friday drop like \ud83d\udc40", likes: 391, time: "3h" },
    { id: "c3", username: "lofi.luna", text: "Late night sessions really do hit diff, no notes", likes: 217, time: "5h" },
    { id: "c4", username: "prod.gio", text: "Send me the stems I beg \ud83d\ude2d", likes: 188, time: "6h" },
  ],
  "2": [
    { id: "c1", username: "lens.ivy", text: "The golden hour did NOT miss today omg", likes: 1204, time: "1h" },
    { id: "c2", username: "raw.remi", text: "What camera settings were you on?? \ud83d\udc41\ufe0f", likes: 562, time: "2h" },
    { id: "c3", username: "aperture.ax", text: "Frame within a frame \ud83c\udfaf this is art", likes: 344, time: "4h" },
  ],
  "3": [
    { id: "c1", username: "drop.dani", text: "2:14 destroyed me completely I am not okay", likes: 3821, time: "30m" },
    { id: "c2", username: "subwoofer.sz", text: "My neighbours officially hate me because of this \ud83d\ude05", likes: 2109, time: "45m" },
    { id: "c3", username: "rave.rx", text: "Actually life changing as promised", likes: 987, time: "1h" },
    { id: "c4", username: "freq.faye", text: "Set this as my alarm and I've never been more awake", likes: 741, time: "2h" },
  ],
  "4": [
    { id: "c1", username: "devmo.rei", text: "No sleep + caffeine is literally the startup founder starter pack \ud83d\ude02", likes: 512, time: "1h" },
    { id: "c2", username: "build.bex", text: "What stack? I need the full tutorial NOW", likes: 430, time: "2h" },
    { id: "c3", username: "ship.syd", text: "Real builders ship. Respect \ud83e\udee1", likes: 298, time: "3h" },
  ],
  "5": [
    { id: "c1", username: "film.fee", text: "People really underestimate lighting and it shows", likes: 891, time: "1h" },
    { id: "c2", username: "cine.cam", text: "What camera is this? I'm genuinely shocked", likes: 654, time: "2h" },
    { id: "c3", username: "grade.gus", text: "The color grade alone \ud83e\udd0c chef's kiss", likes: 420, time: "3h" },
    { id: "c4", username: "reel.rin", text: "Tutorial please! I'll sub twice if I have to", likes: 311, time: "4h" },
  ],
};

// ─── COLLAB EXPLOSION SHARDS ──────────────────────────────────────────────────

const SHARDS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2 + (i % 4) * 0.22;
  const dist = 58 + (i % 5) * 20;
  return {
    id: i,
    tx: Math.cos(angle) * dist,
    ty: Math.sin(angle) * dist,
    rotate: (i * 83) % 360,
    w: 5 + (i % 5) * 3,
    h: 3 + (i % 4) * 3,
    delay: i * 0.012,
    color: ["#00AEEF", "#38bdf8", "#7dd3fc", "#0ea5e9", "#ffffff"][i % 5],
  };
});

// ─── COLLAB BUTTON ────────────────────────────────────────────────────────────

type CPhase = "idle" | "exploding" | "gone" | "reappearing";

function CollabButton({ onTap }: { onTap: () => void }) {
  const [phase, setPhase] = useState<CPhase>("idle");

  const fire = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("exploding");
    setTimeout(() => onTap(), 160);
    setTimeout(() => setPhase("gone"), 420);
    setTimeout(() => setPhase("reappearing"), 980);
    setTimeout(() => setPhase("idle"), 1500);
  }, [phase, onTap]);

  const exploding = phase === "exploding";
  const gone = phase === "gone";
  const reappearing = phase === "reappearing";
  const showMain = phase === "idle" || exploding;

  return (
    <button onClick={fire} className="flex flex-col items-center gap-1.5" aria-label="Collab">
      <div className="relative" style={{ width: 52, height: 52 }}>
        {SHARDS.map((s) => (
          <motion.div
            key={s.id}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
            animate={
              exploding
                ? { x: s.tx, y: s.ty, rotate: s.rotate, opacity: [0, 1, 1, 0], scale: [0.2, 1.3, 0.6, 0] }
                : { x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }
            }
            transition={{ duration: 0.65, delay: s.delay, ease: [0.1, 0.9, 0.2, 1] }}
            style={{
              position: "absolute", top: "50%", left: "50%",
              width: s.w, height: s.h,
              marginTop: -s.h / 2, marginLeft: -s.w / 2,
              borderRadius: 2, backgroundColor: s.color,
              boxShadow: `0 0 10px 3px ${s.color}80`,
            }}
          />
        ))}

        <AnimatePresence>
          {exploding && (
            <motion.div
              key="wave"
              initial={{ scale: 0.3, opacity: 1 }}
              animate={{ scale: 4.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid #00AEEF",
                boxShadow: "0 0 20px 6px rgba(0,174,239,0.5)",
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showMain && (
            <motion.div
              key="circle"
              initial={false}
              animate={
                exploding
                  ? { scale: [1, 1.45, 0], opacity: [1, 1, 0], filter: ["blur(0px)", "blur(0px)", "blur(10px)"] }
                  : { scale: [1, 1.07, 1], opacity: 1, filter: "blur(0px)" }
              }
              transition={
                exploding
                  ? { duration: 0.32, ease: "easeIn" }
                  : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              }
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #00AEEF 0%, #0077cc 100%)",
                boxShadow: "0 0 0 2.5px rgba(0,174,239,0.3), 0 0 22px rgba(0,174,239,0.45), 0 4px 18px rgba(0,0,0,0.6)",
              }}
            >
              <span className="text-white font-bold text-xl leading-none select-none">C</span>
            </motion.div>
          )}
          {reappearing && (
            <motion.div
              key="reappear"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.35, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.52, ease: [0.17, 0.89, 0.32, 1.35] }}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #00AEEF 0%, #0077cc 100%)",
                boxShadow: "0 0 0 2.5px rgba(0,174,239,0.3), 0 0 22px rgba(0,174,239,0.45), 0 4px 18px rgba(0,0,0,0.6)",
              }}
            >
              <span className="text-white font-bold text-xl leading-none select-none">C</span>
            </motion.div>
          )}
        </AnimatePresence>
        {gone && <div className="absolute inset-0" />}
      </div>
      <span className="text-white/90 text-[10px] font-semibold tracking-wide uppercase">Collab</span>
    </button>
  );
}

// ─── COMMENT SHEET ───────────────────────────────────────────────────────────

function CommentSheet({
  video, comments, onAddComment, onClose, onOpenProfile,
}: {
  video: FeedVideo; comments: Comment[];
  onAddComment: (text: string) => void; onClose: () => void;
  onOpenProfile: (username: string) => void;
}) {
  const isDark = useTheme();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAddComment(t);
    setText("");
    setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, 50);
  };

  const D = {
    sheetBg: isDark ? "linear-gradient(180deg,#1c1c24 0%,#14141a 100%)" : "linear-gradient(180deg,#ffffff 0%,#f7f9ff 100%)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    shadow: isDark ? "0 -20px 60px rgba(0,0,0,0.7)" : "0 -20px 60px rgba(0,0,0,0.12)",
    handle: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)",
    divider: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    heading: isDark ? "#fff" : "#0a0e1a",
    xBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    xIcon: isDark ? "rgba(255,255,255,0.7)" : "rgba(10,14,26,0.5)",
    inputColor: isDark ? "#fff" : "#0a0e1a",
  };

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 34, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl flex flex-col"
      style={{ height: "72%", background: D.sheetBg, border: D.border, borderBottom: "none", boxShadow: D.shadow }}
    >
      <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
        <div className="w-9 h-1 rounded-full" style={{ background: D.handle }} />
      </div>
      <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${D.divider}` }}>
        <span className="font-bold text-[15px]" style={{ color: D.heading }}>
          {formatCount(video.comments + comments.filter((c) => c.mine).length)} comments
        </span>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: D.xBg }}>
          <X className="w-3.5 h-3.5" style={{ color: D.xIcon }} />
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {comments.map((c) => <CommentRow key={c.id} comment={c} onOpenProfile={onOpenProfile} />)}
      </div>
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${D.divider}` }}>
        {/* The composer shows the viewer's own avatar, so a photo they just
            uploaded is visible in the place they are about to use it. */}
        <ViewerAvatar size={32} />
        <input
          ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Add a comment…" autoFocus
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: D.inputColor }}
        />
        <motion.button whileTap={{ scale: 0.88 }} onClick={submit} style={{ opacity: text.trim() ? 1 : 0.3 }}>
          <Send className="w-5 h-5" style={{ color: "#00AEEF" }} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function CommentRow({ comment, onOpenProfile }: { comment: Comment; onOpenProfile: (username: string) => void }) {
  const isDark = useTheme();
  const [liked, setLiked] = useState(false);
  const text1 = isDark ? "#fff" : "#0a0e1a";
  const text2 = isDark ? "rgba(255,255,255,0.35)" : "rgba(10,14,26,0.4)";
  const text3 = isDark ? "rgba(255,255,255,0.85)" : "rgba(10,14,26,0.75)";
  const text4 = isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.35)";
  // The commenter's identity, resolved from the directory rather than stored on
  // the comment — an avatar change is reflected on their old comments too.
  const who = identityOf(comment.username);
  return (
    <div className="flex gap-3">
      <div className="mt-0.5">
        {comment.mine
          ? <ViewerAvatar size={32} />
          : <Avatar src={who.avatarUrl} name={who.displayName} color={who.avatarColor} size={32}
              onClick={() => onOpenProfile(comment.username)} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <button onClick={() => !comment.mine && onOpenProfile(comment.username)}
            className="text-[13px] font-semibold" style={{ color: text1 }}>
            @{comment.username}
          </button>
          <span className="text-[11px]" style={{ color: text2 }}>{comment.time}</span>
        </div>
        <p className="text-[13px] leading-snug mt-0.5" style={{ color: text3 }}>{comment.text}</p>
        <button className="text-[11px] mt-1 font-medium" style={{ color: text2 }}>Reply</button>
      </div>
      <button onClick={() => setLiked((l) => !l)} className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
        <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} style={{ color: liked ? undefined : text4 }} />
        <span className="text-[10px]" style={{ color: text4 }}>{formatCount(comment.likes + (liked ? 1 : 0))}</span>
      </button>
    </div>
  );
}

// ─── SHARE SHEET ─────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "#E1306C", bg: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", icon: "IG" },
  { id: "twitter",   label: "X / Twitter", color: "#fff",  bg: "#000",    icon: "𝕏" },
  { id: "whatsapp",  label: "WhatsApp",  color: "#fff",    bg: "#25D366", icon: "W" },
  { id: "tiktok",    label: "TikTok",    color: "#fff",    bg: "#010101", icon: "TK" },
  { id: "snapchat",  label: "Snapchat",  color: "#000",    bg: "#FFFC00", icon: "👻" },
  { id: "facebook",  label: "Facebook",  color: "#fff",    bg: "#1877F2", icon: "f" },
  { id: "telegram",  label: "Telegram",  color: "#fff",    bg: "#229ED9", icon: "✈" },
  { id: "reddit",    label: "Reddit",    color: "#fff",    bg: "#FF4500", icon: "r/" },
];

/**
 * What is being shared, rather than which video: the same sheet now shares a
 * profile, so it takes a subtitle and a link instead of reaching into a post.
 */
interface ShareTarget {
  subtitle: string;
  url: string;
}

function ShareSheet({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const isDark = useTheme();
  const [copied, setCopied] = useState(false);
  const [sharedTo, setSharedTo] = useState<string | null>(null);
  const fakeUrl = target.url;

  const D = {
    sheetBg: isDark ? "linear-gradient(180deg,#1c1c24 0%,#14141a 100%)" : "linear-gradient(180deg,#ffffff 0%,#f7f9ff 100%)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    shadow: isDark ? "0 -20px 60px rgba(0,0,0,0.7)" : "0 -20px 60px rgba(0,0,0,0.12)",
    handle: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)",
    divider: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    heading: isDark ? "#fff" : "#0a0e1a",
    sub: isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.45)",
    xBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    xIcon: isDark ? "rgba(255,255,255,0.7)" : "rgba(10,14,26,0.5)",
    labelColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(10,14,26,0.5)",
    copyBarBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    copyBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    urlColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.4)",
  };

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 34, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl"
      style={{ background: D.sheetBg, border: D.border, borderBottom: "none", boxShadow: D.shadow }}
    >
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-9 h-1 rounded-full" style={{ background: D.handle }} />
      </div>
      <div className="flex items-center justify-between px-5 pb-4" style={{ borderBottom: `1px solid ${D.divider}` }}>
        <div>
          <p className="font-bold text-[15px]" style={{ color: D.heading }}>Share</p>
          <p className="text-[12px] mt-0.5" style={{ color: D.sub }}>{target.subtitle}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: D.xBg }}>
          <X className="w-3.5 h-3.5" style={{ color: D.xIcon }} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-5 px-5 py-5">
        {PLATFORMS.map((p) => (
          <motion.button key={p.id} whileTap={{ scale: 0.88 }}
            onClick={() => { setSharedTo(p.id); setTimeout(() => setSharedTo(null), 1500); }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold relative overflow-hidden"
              style={{ background: p.bg, color: p.color, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
              {sharedTo === p.id
                ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: "rgba(0,0,0,0.45)" }}>
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                : <span className="select-none">{p.icon}</span>}
            </div>
            <span className="text-[10px] font-medium" style={{ color: D.labelColor }}>{p.label}</span>
          </motion.button>
        ))}
      </div>
      <div className="px-5 pb-8">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: D.copyBarBg, border: D.copyBorder }}>
          <span className="flex-1 text-[12px] truncate" style={{ color: D.urlColor }}>{fakeUrl}</span>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { navigator.clipboard.writeText(fakeUrl).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="px-4 py-1.5 rounded-xl text-[12px] font-bold flex-shrink-0"
            style={{ background: copied ? "rgba(0,174,239,0.2)" : "rgba(0,174,239,0.15)", border: "1px solid rgba(0,174,239,0.4)", color: "#00AEEF" }}>
            {copied ? "Copied!" : "Copy Link"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── RAIL FOLLOW BADGE ────────────────────────────────────────────────────────

/**
 * The avatar badge in the action rail. One tap toggles the follow and the badge
 * answers on the spot: the `+` flips to a check, the fill drops from brand blue
 * to neutral glass, a ring pulses out of it and a "Following" chip slides in —
 * so the state change is confirmed before the network is.
 *
 * It is a second *presentation* of a follow, not a second implementation: state
 * and the optimistic write come from `useFollow`, the same hook behind the pill
 * on the profile screen, so the two can never disagree about who is followed.
 * The avatar itself opens that profile.
 */
function RailFollowBadge({
  creator, onOpenProfile,
}: {
  creator: Creator; onOpenProfile: (username: string) => void;
}) {
  const { following, pending, toggle } = useFollow(creator.id);
  // Bumped on each *follow* tap; drives the one-shot ring + chip, then resets.
  // A counter rather than a boolean so re-following replays the burst cleanly.
  const [burst, setBurst] = useState(0);
  const username = creator.username;

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(t);
  }, [burst]);

  const handleClick = (e: React.MouseEvent) => {
    // The slide behind the rail toggles play/pause on click — don't pause too.
    e.stopPropagation();
    if (pending) return;
    setBurst((b) => (following ? 0 : b + 1));
    toggle();
  };

  return (
    <div className="relative mb-1">
      <Avatar src={creator.avatarUrl} name={creator.displayName} color={creator.avatarColor}
        size={44} ring ringColor={following ? "#00AEEF" : "#fff"}
        onClick={() => onOpenProfile(username)} />

      {/* Badge anchor — the offset lives here so motion's transforms stay free. */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        {/* Shockwave confirming the tap */}
        <AnimatePresence>
          {burst > 0 && (
            <motion.span key={`ring-${burst}`} initial={{ scale: 0.5, opacity: 0.9 }} animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: "2px solid #00AEEF" }} />
          )}
        </AnimatePresence>

        <motion.button type="button" onClick={handleClick}
          aria-pressed={following}
          aria-label={following ? `Unfollow ${username}` : `Follow ${username}`}
          title={following ? "Following" : "Follow"}
          whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.8 }}
          transition={{ type: "spring", stiffness: 520, damping: 22 }}
          className="relative w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: following ? "rgba(255,255,255,0.18)" : "#00AEEF",
            border: following ? "1px solid rgba(255,255,255,0.6)" : "none",
            backdropFilter: following ? "blur(8px)" : "none",
            boxShadow: following ? "none" : "0 2px 8px rgba(0,174,239,0.5)",
            transitionProperty: "background, box-shadow, border-color",
            transitionDuration: "0.2s",
          }}>
          {/* Icons swap simultaneously (no `mode="wait"`) so the glyph turns over
              on the same frame as the tap rather than a beat behind it. */}
          <AnimatePresence initial={false}>
            <motion.span key={following ? "check" : "plus"}
              initial={{ scale: 0, rotate: following ? -120 : 120, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.17, 0.89, 0.32, 1.28] }}
              className="absolute inset-0 flex items-center justify-center">
              {following
                ? <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                : <Plus className="w-3 h-3 text-white" strokeWidth={3.5} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Word-level confirmation, left of the rail so it can't clip off-screen */}
        <AnimatePresence>
          {burst > 0 && following && (
            <motion.span key="chip" initial={{ opacity: 0, x: 10, scale: 0.85 }} animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.85 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="absolute whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold text-white pointer-events-none"
              style={{ right: "calc(100% + 8px)", top: 0, background: "#00AEEF", boxShadow: "0 2px 10px rgba(0,174,239,0.5)" }}>
              Following
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── ACTION RAIL ──────────────────────────────────────────────────────────────

function ActionRail({
  video, creator, liked, saved, onLike, onSave, onCollab, onComment, onShare, onOpenProfile,
}: {
  video: FeedVideo; creator: Creator; liked: boolean; saved: boolean;
  onLike: () => void; onSave: () => void; onCollab: () => void; onComment: () => void; onShare: () => void;
  onOpenProfile: (username: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 absolute right-3 bottom-28 z-10">
      <RailFollowBadge creator={creator} onOpenProfile={onOpenProfile} />
      <motion.button whileTap={{ scale: 0.85 }} onClick={onLike} className="flex flex-col items-center gap-1">
        <motion.div animate={liked ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.25 }}>
          <Heart className={`w-7 h-7 drop-shadow-lg ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
        </motion.div>
        <span className="text-white text-[11px] font-semibold">{formatCount(video.likes + (liked ? 1 : 0))}</span>
      </motion.button>
      <div className="flex flex-col items-center gap-1">
        <motion.button whileTap={{ scale: 0.85 }} onClick={onComment}>
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
        </motion.button>
        <span className="text-white text-[11px] font-semibold">{formatCount(video.comments)}</span>
      </div>
      <CollabButton onTap={onCollab} />
      <motion.button whileTap={{ scale: 0.85 }} onClick={onSave} className="flex flex-col items-center gap-1">
        <Bookmark className={`w-7 h-7 drop-shadow-lg ${saved ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
        <span className="text-white text-[11px] font-semibold">{formatCount(video.saves + (saved ? 1 : 0))}</span>
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={onShare} className="flex flex-col items-center gap-1">
        <Navigation className="w-7 h-7 text-white drop-shadow-lg" />
        <span className="text-white text-[11px] font-semibold">{formatCount(video.shares)}</span>
      </motion.button>
    </div>
  );
}

// ─── VIDEO INFO (BOTTOM LEFT) ─────────────────────────────────────────────────

function VideoInfo({
  video, creator, onOpenProfile,
}: {
  video: FeedVideo; creator: Creator; onOpenProfile: (username: string) => void;
}) {
  return (
    <div className="absolute left-4 bottom-28 right-20 z-10 space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onOpenProfile(creator.username); }}
          className="flex items-center gap-1.5">
          <span className="text-white font-bold text-[15px]">@{creator.username}</span>
          {creator.verified && <VerifiedBadge size={14} />}
        </button>
        {creator.collabStatus === "Available for Collaboration" && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,174,239,0.18)", border: "1px solid rgba(0,174,239,0.5)", color: "#00AEEF" }}>
            ✦ Open to Collab
          </span>
        )}
      </div>
      <p className="text-white/90 text-[13px] leading-snug line-clamp-2">{video.caption}</p>
      <p className="text-[13px] font-medium" style={{ color: "#00AEEF" }}>{video.hashtags.join(" ")}</p>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
          <Music className="w-2.5 h-2.5 text-white" />
        </div>
        <motion.span animate={{ x: [0, -60, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="text-white/75 text-[12px] whitespace-nowrap" style={{ display: "inline-block" }}>
          {video.audio}
        </motion.span>
      </div>
      {/* The same pill the profile header uses, reading the same creator record. */}
      <div className="flex items-center gap-2 mt-1">
        <CollabScorePill score={creator.collabScore} count={creator.collabCount} compact onMedia />
      </div>
    </div>
  );
}

// ─── COLLAB SHEET ─────────────────────────────────────────────────────────────

const COLLAB_TYPES = [
  { icon: "🎵", label: "Music" }, { icon: "📹", label: "Video" },
  { icon: "🎙", label: "Podcast" }, { icon: "📈", label: "Business" },
  { icon: "📸", label: "Photo" }, { icon: "🎮", label: "Gaming" },
  { icon: "💼", label: "Brand Deal" }, { icon: "✨", label: "Custom" },
];
const BUDGETS = ["Under $500", "$500–$2K", "$2K–$10K", "$10K+", "Open"];
const TIMELINES = ["ASAP", "1–2 weeks", "1 month", "3+ months"];

/**
 * Takes a creator, not a post: a collab request is addressed to a person, and
 * this sheet is now opened from the feed rail *and* from a profile.
 */
function CollabSheet({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const isDark = useTheme();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const D = {
    sheetBg: isDark ? "linear-gradient(180deg,#1a1a22 0%,#14141a 100%)" : "linear-gradient(180deg,#ffffff 0%,#f7f9ff 100%)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    handle: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)",
    heading: isDark ? "#fff" : "#0a0e1a",
    xBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    xIcon: isDark ? "rgba(255,255,255,0.7)" : "rgba(10,14,26,0.5)",
    label: isDark ? "rgba(255,255,255,0.5)" : "rgba(10,14,26,0.4)",
    tileUnselBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    tileUnselBorder: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)",
    tileText: isDark ? "rgba(255,255,255,0.8)" : "rgba(10,14,26,0.7)",
    areaBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    areaBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    areaColor: isDark ? "rgba(255,255,255,0.9)" : "#0a0e1a",
    chipUnsel: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    chipBorder: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
    chipColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(10,14,26,0.55)",
    btnDisBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    btnDisColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(10,14,26,0.3)",
  };

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden"
      style={{ background: D.sheetBg, border: D.border, borderBottom: "none", maxHeight: "88%", boxShadow: isDark ? "0 -20px 60px rgba(0,0,0,0.7)" : "0 -20px 60px rgba(0,0,0,0.12)" }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-9 h-1 rounded-full" style={{ background: D.handle }} />
      </div>
      <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "calc(88vh - 20px)" }}>
        <div className="flex items-center justify-between mb-5 pt-1">
          <div>
            <h2 className="font-bold text-lg" style={{ color: D.heading }}>Collaborate with</h2>
            <p className="font-bold text-base" style={{ color: "#00AEEF" }}>@{creator.username}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: D.xBg }}>
            <X className="w-4 h-4" style={{ color: D.xIcon }} />
          </button>
        </div>
        <p className="text-[11px] uppercase tracking-widest mb-3 font-semibold" style={{ color: D.label }}>Collaboration Type</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {COLLAB_TYPES.map((t) => (
            <motion.button key={t.label} whileTap={{ scale: 0.93 }} onClick={() => setSelectedType(t.label)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-colors"
              style={{
                background: selectedType === t.label ? "rgba(0,174,239,0.18)" : D.tileUnselBg,
                border: selectedType === t.label ? "1px solid rgba(0,174,239,0.55)" : D.tileUnselBorder,
              }}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-semibold" style={{ color: selectedType === t.label ? "#00AEEF" : D.tileText }}>{t.label}</span>
            </motion.button>
          ))}
        </div>
        <p className="text-[11px] uppercase tracking-widest mb-3 font-semibold" style={{ color: D.label }}>Message</p>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hey @${creator.username}, I'd love to collab on something 🔥`} rows={3}
          className="w-full rounded-2xl text-sm resize-none outline-none mb-5 p-4"
          style={{ background: D.areaBg, border: D.areaBorder, color: D.areaColor }} />
        <p className="text-[11px] uppercase tracking-widest mb-3 font-semibold" style={{ color: D.label }}>Budget</p>
        <div className="flex gap-2 flex-wrap mb-5">
          {BUDGETS.map((b) => (
            <button key={b} onClick={() => setBudget(b)} className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
              style={{ background: budget === b ? "rgba(0,174,239,0.2)" : D.chipUnsel, border: budget === b ? "1px solid rgba(0,174,239,0.55)" : D.chipBorder, color: budget === b ? "#00AEEF" : D.chipColor }}>
              {b}
            </button>
          ))}
        </div>
        <p className="text-[11px] uppercase tracking-widest mb-3 font-semibold" style={{ color: D.label }}>Timeline</p>
        <div className="flex gap-2 flex-wrap mb-7">
          {TIMELINES.map((t) => (
            <button key={t} onClick={() => setTimeline(t)} className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
              style={{ background: timeline === t ? "rgba(0,174,239,0.2)" : D.chipUnsel, border: timeline === t ? "1px solid rgba(0,174,239,0.55)" : D.chipBorder, color: timeline === t ? "#00AEEF" : D.chipColor }}>
              {t}
            </button>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (!selectedType) return; setSent(true); setTimeout(() => { setSent(false); onClose(); }, 1800); }}
          disabled={!selectedType || sent}
          className="w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-opacity"
          style={{ background: selectedType ? "linear-gradient(135deg,#00AEEF,#0077cc)" : D.btnDisBg, color: selectedType ? "#fff" : D.btnDisColor, opacity: sent ? 0.9 : 1, boxShadow: selectedType ? "0 8px 24px rgba(0,174,239,0.35)" : "none" }}>
          <AnimatePresence mode="wait">
            {sent
              ? <motion.span key="sent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2"><Check className="w-5 h-5" /> Request Sent!</motion.span>
              : <motion.span key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2"><Send className="w-4 h-4" /> Send Collab Request</motion.span>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

function BottomNav({ active, onNav }: { active: string; onNav: (id: string) => void }) {
  const isDark = useTheme();
  const items = [
    { id: "home", icon: Home, label: "Feed" },
    { id: "search", icon: Search, label: "Discover" },
    { id: "create", icon: Plus, label: "" },
    { id: "inbox", icon: Mail, label: "Inbox" },
    { id: "profile", icon: User, label: "Profile" },
  ];
  const navBg = isDark
    ? "linear-gradient(to top, rgba(12,12,15,0.96) 60%, transparent)"
    : "linear-gradient(to top, rgba(242,245,251,0.97) 60%, transparent)";
  const inactiveColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(10,14,26,0.35)";

  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-around px-2 pt-3 pb-5"
      style={{ background: navBg, backdropFilter: "blur(12px)" }}>
      {items.map((item) => {
        const isCreate = item.id === "create";
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <button key={item.id} onClick={() => onNav(item.id)} className="flex flex-col items-center gap-1 relative">
            {isCreate ? (
              <div className="w-11 h-8 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg,#00AEEF,#0077cc)", boxShadow: "0 4px 16px rgba(0,174,239,0.4)" }}>
                <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            ) : (
              <>
                <Icon className="w-6 h-6 transition-colors"
                  style={{ color: isActive ? "#00AEEF" : inactiveColor }}
                  strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label && (
                  <span className="text-[10px] font-semibold" style={{ color: isActive ? "#00AEEF" : inactiveColor }}>
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <motion.div layoutId="nav-dot" className="absolute -bottom-2 w-1 h-1 rounded-full" style={{ background: "#00AEEF" }} />
                )}
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

// Full-screen app surface — fills the whole viewport edge-to-edge on every screen size.
const FRAME = "relative overflow-hidden w-full h-full";

type Screen = "feed" | "discover" | "profile" | "settings" | "inbox" | "holoprofile" | "metaverse";

export default function App() {
  // The signed-in account, restored from the persisted session on load. The
  // follow graph is pointed at that account in the same breath, so the Following
  // feed and every follow button are correct on the first paint rather than
  // after an effect has run.
  const [account, setAccount] = useState<Account | null>(() => {
    const session = getSession();
    activateFollowGraph(session?.email ?? null);
    return session;
  });
  const [isDark, setIsDark] = useState(true);
  const [screen, setScreen] = useState<Screen>("feed");
  /**
   * Creator profiles opened on top of whatever screen you were on, newest last.
   * A stack because a profile can lead to another one — through a connections
   * list — and Back has to return to the profile you came from.
   */
  const [profileStack, setProfileStack] = useState<string[]>([]);
  /** Deep link into a Settings destination, e.g. Edit Profile from the profile. */
  const [settingsRoute, setSettingsRoute] = useState<SettingsRoute | null>(null);
  /** Handle to open a DM thread with when the Inbox mounts. */
  const [inboxThread, setInboxThread] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<"forYou" | "following">("forYou");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [liveMode, setLiveMode] = useState<"off" | "setup" | "creator" | "viewer">("off");
  const [liveTitle, setLiveTitle] = useState("");
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [collabTarget, setCollabTarget] = useState<Creator | null>(null);
  const [commentTarget, setCommentTarget] = useState<FeedVideo | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [userComments, setUserComments] = useState<Record<string, Comment[]>>(
    Object.fromEntries(VIDEOS.map((v) => [v.id, SEED_COMMENTS[v.id] ?? []]))
  );
  const [paused, setPaused] = useState(false);
  const touchStartY = useRef(0);

  // Follow state comes from the store, so the Following tab re-filters whether
  // the follow was toggled on the rail, on a profile or in a connections list.
  const followedIds = useFollowingIds();
  const followed = useMemo(() => new Set(followedIds), [followedIds]);

  // Sign-in, sign-out and account switches all re-point the graph.
  useEffect(() => { activateFollowGraph(account?.email ?? null); }, [account?.email]);

  // The two top-bar tabs are the same feed filtered, so switching them restarts
  // at the first video rather than leaving `idx` past the end of a shorter list.
  const feed = feedTab === "following" ? VIDEOS.filter((v) => followed.has(v.creatorId)) : VIDEOS;
  const video = feed.length > 0 ? feed[Math.min(idx, feed.length - 1)] : undefined;
  const videoCreator = video ? creatorOf(video) : undefined;

  // Unfollowing from the Following tab can shrink the feed out from under `idx`.
  useEffect(() => {
    if (feed.length > 0 && idx > feed.length - 1) setIdx(feed.length - 1);
  }, [feed.length, idx]);

  const viewerUsername = account ? profileOf(account).username : "";

  /**
   * The one way into a profile, from anywhere: the feed rail, a caption, a
   * comment, a connections list. Your own handle resolves to your own profile
   * tab rather than pushing a visitor's view of yourself onto the stack.
   */
  const openProfile = useCallback((username: string) => {
    if (username.toLowerCase() === viewerUsername.toLowerCase()) {
      setProfileStack([]);
      setScreen("profile");
      return;
    }
    // A handle with no profile behind it is not a navigable link.
    if (!creatorByUsername(username)) return;
    setProfileStack((stack) => (stack[stack.length - 1] === username ? stack : [...stack, username]));
  }, [viewerUsername]);

  const closeProfile = useCallback(() => setProfileStack((stack) => stack.slice(0, -1)), []);

  /** Messaging a creator leaves their profile and lands in the thread. */
  const messageCreator = useCallback((creator: Creator) => {
    setProfileStack([]);
    setInboxThread(creator.username);
    setScreen("inbox");
  }, []);

  const shareProfile = useCallback((creator: Creator) => {
    setShareTarget({ subtitle: `@${creator.username}'s profile`, url: `https://connexionz.app/@${creator.username}` });
  }, []);

  const openSettings = useCallback((route: SettingsRoute | null = null) => {
    setSettingsRoute(route);
    setScreen("settings");
  }, []);

  const visitedCreator = profileStack.length
    ? creatorByUsername(profileStack[profileStack.length - 1])
    : undefined;

  /**
   * A profile tile that is also a feed post jumps the feed to that slide. Back
   * catalogue tiles have no destination in the prototype, so `canOpenPost` keeps
   * them from being offered as taps at all.
   */
  const canOpenPost = useCallback((postId: string) => VIDEOS.some((v) => v.id === postId), []);

  const openPost = useCallback((postId: string) => {
    const index = VIDEOS.findIndex((v) => v.id === postId);
    if (index < 0) return;
    setProfileStack([]);
    setFeedTab("forYou");
    setDir(1);
    setIdx(index);
    setScreen("feed");
  }, []);

  const goNext = useCallback(() => { if (idx < feed.length - 1) { setDir(1); setIdx((i) => i + 1); } }, [idx, feed.length]);
  const goPrev = useCallback(() => { if (idx > 0) { setDir(-1); setIdx((i) => i - 1); } }, [idx]);

  const switchTab = useCallback((tab: "forYou" | "following") => {
    setFeedTab((current) => {
      if (current !== tab) { setDir(1); setIdx(0); }
      return tab;
    });
  }, []);

  const wheelLocked = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (wheelLocked.current) return;
    if (Math.abs(e.deltaY) < 20) return;
    wheelLocked.current = true;
    e.deltaY > 0 ? goNext() : goPrev();
    setTimeout(() => { wheelLocked.current = false; }, 700);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  /** Signing out has to clear pushed screens as well as the session. */
  const resetToFeed = useCallback(() => {
    setProfileStack([]);
    setSettingsRoute(null);
    setInboxThread(null);
    setScreen("feed");
  }, []);

  const handleLogout = useCallback(() => { endSession(); setAccount(null); resetToFeed(); }, [resetToFeed]);
  // `deleteAccount` has already ended the session by the time this runs.
  const handleDeleted = useCallback(() => { setShowDeleteModal(false); setAccount(null); resetToFeed(); }, [resetToFeed]);

  if (!account) {
    return (
      <ThemeContext.Provider value={true}>
        <div className="h-[100dvh] w-full overflow-hidden" style={{ background: "#000" }}>
          <div className={`${FRAME} bg-black`}>
            <AuthFlow onAuthenticated={setAccount} />
          </div>
        </div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={isDark}>
      {/* Everything below can read the signed-in identity — that is how one
          avatar change reaches the profile, the feed, comments and messages. */}
      <SessionProvider account={account} onAccountChange={setAccount}>
      <div
        className={`h-[100dvh] w-full overflow-hidden${isDark ? " dark" : ""}`}
        style={{ background: isDark ? "#000" : "#f2f5fb", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div
          className={FRAME}
          style={{ background: isDark ? "#000" : "#f2f5fb" }}
          onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => { const d = touchStartY.current - e.changedTouches[0].clientY; if (Math.abs(d) > 45) d > 0 ? goNext() : goPrev(); }}
          onWheel={handleWheel}
        >
          {/* ── Top bar ── sits above the slides so it survives an empty feed */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-12 z-20"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-5">
              {([
                { id: "following", label: "Following" },
                { id: "forYou", label: "For You" },
              ] as const).map((tab) => (
                <div key={tab.id} className="flex flex-col items-center">
                  <button onClick={() => switchTab(tab.id)}
                    className="text-[14px]"
                    style={{
                      color: feedTab === tab.id ? "#fff" : "rgba(255,255,255,0.6)",
                      fontWeight: feedTab === tab.id ? 700 : 600,
                    }}>
                    {tab.label}
                  </button>
                  {feedTab === tab.id && (
                    <motion.div layoutId="feed-tab-underline" className="w-5 h-0.5 rounded-full mt-0.5"
                      style={{ background: "#00AEEF" }} />
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setScreen("discover")} aria-label="Search"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* ── Empty Following feed — every creator has been unfollowed ── */}
          {!video && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 text-center z-10">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,174,239,0.15)", border: "1px solid rgba(0,174,239,0.4)" }}>
                <User className="w-6 h-6" style={{ color: "#00AEEF" }} />
              </div>
              <p className="font-bold text-[16px]" style={{ color: isDark ? "#fff" : "#0a0e1a" }}>Nothing here yet</p>
              <p className="text-[13px] leading-snug" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(10,14,26,0.55)" }}>
                Follow a few creators and their posts will show up in this tab.
              </p>
              <button onClick={() => switchTab("forYou")}
                className="mt-1 px-4 py-2 rounded-full text-[13px] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#00AEEF,#0077cc)", boxShadow: "0 6px 18px rgba(0,174,239,0.35)" }}>
                Browse For You
              </button>
            </div>
          )}

          {/* ── Video slides ── */}
          <AnimatePresence initial={false} custom={dir} mode="wait">
            {video && (
            <motion.div key={video.id} custom={dir}
              initial={{ y: dir > 0 ? "100%" : "-100%", opacity: 0.4 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: dir > 0 ? "-100%" : "100%", opacity: 0.4 }}
              transition={{ type: "spring", damping: 38, stiffness: 340 }}
              className="absolute inset-0"
              onClick={() => setPaused((p) => !p)}
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${video.thumbnail})` }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.25) 0%,transparent 25%,transparent 55%,rgba(0,0,0,0.65) 80%,rgba(0,0,0,0.85) 100%)" }} />

              <AnimatePresence>
                {paused && (
                  <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                    className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
                      <div className="flex gap-1.5"><div className="w-1.5 h-7 rounded-full bg-white" /><div className="w-1.5 h-7 rounded-full bg-white" /></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {idx < feed.length - 1 && (
                <div className="absolute bottom-36 right-1/2 translate-x-1/2 z-10 flex flex-col items-center gap-0.5 opacity-40">
                  <ChevronUp className="w-4 h-4 text-white" />
                </div>
              )}

              <ActionRail video={video} creator={videoCreator!} liked={!!liked[video.id]} saved={!!saved[video.id]}
                onLike={() => setLiked((l) => ({ ...l, [video.id]: !l[video.id] }))}
                onSave={() => setSaved((s) => ({ ...s, [video.id]: !s[video.id] }))}
                onCollab={() => setCollabTarget(videoCreator!)}
                onComment={() => setCommentTarget(video)}
                onShare={() => setShareTarget({
                  subtitle: `@${videoCreator!.username}'s video`,
                  url: `https://connexionz.app/v/${video.id}`,
                })}
                onOpenProfile={openProfile} />

              <VideoInfo video={video} creator={videoCreator!} onOpenProfile={openProfile} />

              {/* Progress dots */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                {feed.map((v, i) => (
                  <button key={v.id}
                    onClick={(e) => { e.stopPropagation(); setDir(i > idx ? 1 : -1); setIdx(i); }}
                    className="rounded-full transition-all"
                    style={{ width: 3, height: i === idx ? 20 : 6, background: i === idx ? "#00AEEF" : "rgba(255,255,255,0.3)" }} />
                ))}
              </div>
            </motion.div>
            )}
          </AnimatePresence>
          {/* ── Metaverse portal orb ── */}
          <AnimatePresence>
            {screen === "feed" && (
              <motion.button
                key="metaverse-orb"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setScreen("metaverse")}
                className="absolute z-20 flex flex-col items-center gap-1"
                style={{ bottom: 88, right: 16 }}
              >
                <motion.div
                  animate={{ boxShadow: ["0 0 14px rgba(124,58,237,0.5)", "0 0 28px rgba(0,174,239,0.7)", "0 0 14px rgba(124,58,237,0.5)"] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#00AEEF)" }}
                >
                  <Globe className="w-5 h-5 text-white" />
                </motion.div>
                <span className="text-[9px] font-bold tracking-wider" style={{ color: "#00AEEF" }}>METAVERSE</span>
              </motion.button>
            )}
          </AnimatePresence>
          {/* ── Bottom nav ── the feed and your own profile are tabs, so the bar
              stays visible on both (z-40 clears the profile at z-30). Pushed
              screens — inbox, settings, a creator's profile — cover it, since
              each one owns its own way back. */}
          {(screen === "feed" || screen === "profile") && profileStack.length === 0 && (
            <BottomNav
              active={screen === "profile" ? "profile" : "home"}
              onNav={(id) => {
                if (id === "search") setScreen("discover");
                else if (id === "profile") { setProfileStack([]); setScreen("profile"); }
                else if (id === "inbox") { setInboxThread(null); setScreen("inbox"); }
                else if (id === "create") setLiveMode("setup");
                else setScreen("feed");
              }}
            />
          )}

          {/* ── Trending Sounds ── */}
          <AnimatePresence>
            {screen === "discover" && <TrendingSounds key="sounds" onBack={() => setScreen("feed")} />}
          </AnimatePresence>

          {/* ── Inbox ── */}
          <AnimatePresence>
            {/* z-30 clears the feed's top bar, which is a positive-z sibling. */}
            {screen === "inbox" && (
              <motion.div key="inbox" className="absolute inset-0 z-30"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 34, stiffness: 300 }}>
                <InboxScreen
                  onBack={() => { setInboxThread(null); setScreen("feed"); }}
                  initialThreadWith={inboxThread}
                  onOpenProfile={openProfile}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Your own profile ── the Profile tab. Settings is now a screen it
              pushes rather than the thing the tab opened. */}
          <AnimatePresence>
            {screen === "profile" && (
              <motion.div key="own-profile" className="absolute inset-0 z-30"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}>
                <OwnProfile
                  onBack={() => setScreen("feed")}
                  onEditProfile={() => openSettings("editProfile")}
                  onOpenSettings={() => openSettings(null)}
                  onOpenProfile={openProfile}
                  onShare={shareProfile}
                  onOpenPost={openPost}
                  canOpenPost={canOpenPost}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── A creator's profile ── pushed over whatever opened it, so Back
              returns to the feed slide, comment sheet or list you came from. */}
          <AnimatePresence>
            {visitedCreator && (
              <motion.div key={`creator-${visitedCreator.id}`} className="absolute inset-0 z-40"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 34, stiffness: 300 }}>
                <ProfileScreen
                  creator={visitedCreator}
                  isOwner={false}
                  onBack={closeProfile}
                  onOpenProfile={openProfile}
                  onMessage={messageCreator}
                  onCollab={setCollabTarget}
                  onShare={shareProfile}
                  onOpenPost={openPost}
                  canOpenPost={canOpenPost}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Settings ── */}
          <AnimatePresence>
            {screen === "settings" && (
              <motion.div key="settings" className="absolute inset-0 z-30"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 34, stiffness: 300 }}>
                <SettingsScreen
                  account={account}
                  initialRoute={settingsRoute}
                  onBack={() => { setSettingsRoute(null); setScreen("profile"); }}
                  onLogout={handleLogout}
                  onDeleteProfile={() => setShowDeleteModal(true)}
                  onAccountChange={setAccount}
                  isDark={isDark}
                  onToggleTheme={() => setIsDark((d) => !d)}
                  onOpenHoloProfile={() => setScreen("holoprofile")}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Holo Profile ── pushed from Settings, so Back returns there */}
          <AnimatePresence>
            {screen === "holoprofile" && (
              <motion.div key="holoprofile" className="absolute inset-0 z-40 overflow-y-auto"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}>
                <HoloProfile onBack={() => setScreen("settings")} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Metaverse ── entered from the feed orb */}
          <AnimatePresence>
            {screen === "metaverse" && (
              <motion.div key="metaverse" className="absolute inset-0 z-40"
                initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.35 }}>
                <MetaverseHub onBack={() => setScreen("feed")} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Delete profile modal ── */}
          <AnimatePresence>
            {showDeleteModal && (
              <>
                <motion.div key="del-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
                  onClick={() => setShowDeleteModal(false)} />
                <DeleteProfileModal key="del-modal" account={account} onDeleted={handleDeleted} onCancel={() => setShowDeleteModal(false)} />
              </>
            )}
          </AnimatePresence>

          {/* ── Comment sheet ── */}
          <AnimatePresence>
            {commentTarget && (
              <>
                <motion.div key="comment-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setCommentTarget(null)} />
                <CommentSheet key="comment-sheet" video={commentTarget} comments={userComments[commentTarget.id] ?? []}
                  onAddComment={(text) => setUserComments((prev) => ({
                    ...prev,
                    // Posted under the viewer's real handle and marked as theirs,
                    // so the row renders their live avatar rather than a copy.
                    [commentTarget.id]: [
                      ...prev[commentTarget.id],
                      { id: `u${Date.now()}`, username: viewerUsername, text, likes: 0, time: "now", mine: true },
                    ],
                  }))}
                  onClose={() => setCommentTarget(null)}
                  onOpenProfile={openProfile} />
              </>
            )}
          </AnimatePresence>

          {/* ── Share sheet ── */}
          <AnimatePresence>
            {shareTarget && (
              <>
                <motion.div key="share-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setShareTarget(null)} />
                <ShareSheet key="share-sheet" target={shareTarget} onClose={() => setShareTarget(null)} />
              </>
            )}
          </AnimatePresence>

          {/* ── Collab sheet ── */}
          <AnimatePresence>
            {collabTarget && (
              <>
                <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setCollabTarget(null)} />
                <CollabSheet key="sheet" creator={collabTarget} onClose={() => setCollabTarget(null)} />
              </>
            )}
          </AnimatePresence>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-24 flex-col items-center gap-2 z-30 pointer-events-none opacity-30">
            <ChevronUp className="w-5 h-5 text-white" />
            <ChevronDown className="w-5 h-5 text-white" />
          </div>

          {/* ── Live banner strip ── */}
          {screen === "feed" && liveMode === "off" && (
            <LiveBannerStrip onCreate={() => setLiveMode("setup")} onWatch={() => setLiveMode("viewer")} />
          )}

          <AnimatePresence>
            {liveMode === "setup" && (
              <GoLiveSetup key="live-setup" onStart={(title) => { setLiveTitle(title); setLiveMode("creator"); }} onClose={() => setLiveMode("off")} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {liveMode === "creator" && (
              <CreatorLiveView key="creator-live" title={liveTitle} onEnd={() => setLiveMode("off")} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {liveMode === "viewer" && (
              <ViewerLiveView key="viewer-live"
                creator={{ name: "nova.dj", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=60&h=60&fit=crop&auto=format", title: "HYPERSONIC studio session 🔊" }}
                onClose={() => setLiveMode("off")} />
            )}
          </AnimatePresence>
        </div>
      </div>
      </SessionProvider>
    </ThemeContext.Provider>
  );
}

// ─── OWN PROFILE ──────────────────────────────────────────────────────────────

/**
 * The signed-in creator's own profile. A separate component purely so it can use
 * the session hooks — `App` is what provides them.
 */
function OwnProfile({
  onBack, onEditProfile, onOpenSettings, onOpenProfile, onShare, onOpenPost, canOpenPost,
}: {
  onBack: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenProfile: (username: string) => void;
  onShare: (creator: Creator) => void;
  onOpenPost: (postId: string) => void;
  canOpenPost: (postId: string) => boolean;
}) {
  const creator = useOwnCreator();
  return (
    <ProfileScreen
      creator={creator}
      isOwner
      onBack={onBack}
      onEditProfile={onEditProfile}
      onOpenSettings={onOpenSettings}
      onOpenProfile={onOpenProfile}
      onShare={onShare}
      onOpenPost={onOpenPost}
      canOpenPost={canOpenPost}
    />
  );
}
