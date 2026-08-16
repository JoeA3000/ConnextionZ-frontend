// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
//
// What happened while you were somewhere else. Three things decide the design:
//
//   • Every row leads somewhere. A like opens the post, a follow opens the
//     profile, an accepted collab opens the thread — a notification that is only
//     an announcement is a dead end, and the spec asks for the opposite.
//   • Read and unread are visibly different *and* reversible: reading is a side
//     effect of tapping, and "Mark all read" exists for the rest.
//   • It loads. The list is warm in the store, but the screen still fetches on
//     mount, because that is what a real client does and the loading and error
//     states have to be real rather than theoretical.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, AtSign, Bell, CheckCheck, Heart, Loader2, MessageCircle,
  RefreshCw, Sparkles, Trophy, UserPlus, WifiOff, Settings as SettingsIcon,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { ACCENT, EmptyState, useTokens } from "./settings-ui";
import { Avatar, VerifiedBadge } from "./profile-ui";
import { identityOf, creatorByUsername } from "./creators";
import {
  type AppNotification, type NotificationType, NOTIFICATION_GROUP,
  fetchNotifications, markAllRead, markRead, relativeTime, timeBucket,
  useNotifications, useUnreadCount,
} from "./notifications-store";

type Filter = "all" | "collabs" | "social" | "system";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "collabs", label: "Collabs" },
  { id: "social", label: "Social" },
  { id: "system", label: "System" },
];

/** Icon and tint per type — the glance-level answer to "what is this row?". */
const LOOK: Record<NotificationType, { icon: typeof Heart; color: string; label: string }> = {
  like: { icon: Heart, color: "#ef4444", label: "Like" },
  comment: { icon: MessageCircle, color: "#00AEEF", label: "Comment" },
  follow: { icon: UserPlus, color: "#22c55e", label: "New follower" },
  mention: { icon: AtSign, color: "#a78bfa", label: "Mention" },
  collabRequest: { icon: Sparkles, color: "#00AEEF", label: "Collab request" },
  collabAccepted: { icon: Sparkles, color: "#f59e0b", label: "Collab accepted" },
  milestone: { icon: Trophy, color: "#f59e0b", label: "Milestone" },
  system: { icon: SettingsIcon, color: "#94a3b8", label: "System" },
};

type Status = "loading" | "ready" | "error";

export function NotificationsScreen({
  onBack, onOpenProfile, onOpenPost, canOpenPost, onOpenThread, onOpenRequests,
}: {
  onBack: () => void;
  onOpenProfile?: (username: string) => void;
  onOpenPost?: (postId: string) => void;
  canOpenPost?: (postId: string) => boolean;
  /** Opens the DM thread with a handle — where an accepted collab continues. */
  onOpenThread?: (username: string) => void;
  /** The Inbox's collab requests tab, for request rows. */
  onOpenRequests?: () => void;
}) {
  const isDark = useTheme();
  const t = useTokens(isDark);
  const all = useNotifications();
  const unread = useUnreadCount();

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // One timestamp for the whole render pass, so two rows a second apart never
  // disagree about which bucket "Today" is.
  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    setStatus("loading");
    setError("");
    const result = await fetchNotifications();
    setNow(Date.now());
    if (!result.ok) { setError(result.error); setStatus("error"); return; }
    setStatus("ready");
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(
    () => (filter === "all" ? all : all.filter((item) => NOTIFICATION_GROUP[item.type] === filter)),
    [all, filter],
  );

  /** Rows grouped under Today / This week / Earlier, order preserved. */
  const sections = useMemo(() => {
    const buckets: { title: string; rows: AppNotification[] }[] = [];
    for (const row of rows) {
      const title = timeBucket(row.createdAt, now);
      const last = buckets[buckets.length - 1];
      if (last && last.title === title) last.rows.push(row);
      else buckets.push({ title, rows: [row] });
    }
    return buckets;
  }, [rows, now]);

  const open = (item: AppNotification) => {
    markRead(item.id);
    if (item.type === "collabRequest" && onOpenRequests) { onOpenRequests(); return; }
    if (item.threadWith && onOpenThread) { onOpenThread(item.threadWith); return; }
    if (item.postId && onOpenPost && (!canOpenPost || canOpenPost(item.postId))) { onOpenPost(item.postId); return; }
    if (item.actor && onOpenProfile) onOpenProfile(item.actor);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ background: t.bg }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.divider}` }}>
        <button onClick={onBack} aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-70"
          style={{ background: t.backBtnBg, border: t.cardBorder }}>
          <ArrowLeft className="w-4 h-4" style={{ color: t.heading }} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold text-[22px] leading-tight" style={{ color: t.heading }}>Notifications</h1>
          <p className="text-[13px] mt-0.5" style={{ color: t.sub }}>
            {status === "loading" ? "Checking for new activity…"
              : unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && status === "ready" && (
          <button onClick={markAllRead}
            className="px-3 py-2 rounded-full text-[12px] font-bold flex items-center gap-1.5 flex-shrink-0"
            style={{ background: "rgba(0,174,239,0.14)", border: `1px solid ${ACCENT}55`, color: ACCENT }}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map((item) => {
          const on = filter === item.id;
          const count = item.id === "all"
            ? all.length
            : all.filter((row) => NOTIFICATION_GROUP[row.type] === item.id).length;
          return (
            <button key={item.id} onClick={() => setFilter(item.id)}
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold flex-shrink-0 flex items-center gap-1.5"
              style={{
                background: on ? "rgba(0,174,239,0.2)" : t.chipBg,
                border: on ? `1px solid ${ACCENT}` : t.chipBorder,
                color: on ? ACCENT : t.sub,
              }}>
              {item.label}
              <span className="text-[11px] font-bold" style={{ color: on ? ACCENT : t.chevron }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto pb-10" style={{ scrollbarWidth: "none" }}>
        {status === "loading" && <NotificationSkeleton t={t} />}

        {status === "error" && (
          <div className="flex flex-col items-center text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171" }}>
              <WifiOff className="w-7 h-7" />
            </div>
            <p className="font-bold text-[16px]" style={{ color: t.heading }}>Couldn't load notifications</p>
            <p className="text-[13px] mt-1.5 leading-relaxed max-w-[270px]" style={{ color: t.sub }}>{error}</p>
            <button onClick={() => void load()}
              className="mt-5 px-5 py-2.5 rounded-full text-[13px] font-bold text-white flex items-center gap-2"
              style={{ background: `linear-gradient(135deg,${ACCENT},#0077cc)`, boxShadow: "0 6px 18px rgba(0,174,239,0.35)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}

        {status === "ready" && rows.length === 0 && (
          <EmptyState icon={<Bell className="w-7 h-7" />} t={t}
            title={filter === "all" ? "Nothing yet" : "Nothing in this filter"}
            body={filter === "all"
              ? "Likes, comments, follows and collab requests all land here."
              : "Try another filter — your other activity is still there."} />
        )}

        {status === "ready" && sections.map((section) => (
          <div key={section.title}>
            <p className="text-[11px] font-bold uppercase tracking-widest px-5 pt-4 pb-2" style={{ color: t.sectionLbl }}>
              {section.title}
            </p>
            <AnimatePresence initial={false}>
              {section.rows.map((item) => (
                <NotificationRow key={item.id} item={item} now={now} t={t} onOpen={() => open(item)} />
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROW ─────────────────────────────────────────────────────────────────────

function NotificationRow({
  item, now, t, onOpen,
}: {
  item: AppNotification;
  now: number;
  t: ReturnType<typeof useTokens>;
  onOpen: () => void;
}) {
  const isDark = useTheme();
  const who = item.actor ? identityOf(item.actor) : null;
  const creator = item.actor ? creatorByUsername(item.actor) : undefined;
  const look = LOOK[item.type];
  const Icon = look.icon;

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
      <button onClick={onOpen}
        className="w-full flex items-start gap-3 px-5 py-3.5 text-left active:opacity-80 transition-colors"
        style={{
          borderBottom: `1px solid ${t.divider}`,
          background: item.read ? "transparent" : "rgba(0,174,239,0.06)",
        }}>
        {/* The avatar is *not* its own button here: the whole row is one, and a
            button inside a button is invalid HTML that React warns about. The
            row already knows to open the actor's profile. */}
        <span className="relative flex-shrink-0">
          {who
            ? <Avatar src={who.avatarUrl} name={who.displayName} color={who.avatarColor} size={44} />
            : <span className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,174,239,0.14)", border: `1px solid ${ACCENT}44`, color: ACCENT }}>
                <Icon className="w-5 h-5" />
              </span>}
          {who && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: look.color, border: `2px solid ${isDark ? "rgba(0,9,30,0.9)" : "#ffffff"}` }}>
              <Icon className="w-2.5 h-2.5 text-white" fill={item.type === "like" ? "#fff" : "none"} />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 flex-wrap">
            {item.actor && (
              <>
                <span className="font-bold text-[14px]" style={{ color: t.heading }}>@{item.actor}</span>
                {creator?.verified && <VerifiedBadge size={12} />}
              </>
            )}
            <span className="text-[11px]" style={{ color: t.sub }}>· {relativeTime(item.createdAt, now)}</span>
          </span>
          <span className="block text-[13px] leading-snug mt-0.5" style={{ color: item.read ? t.sub : t.body }}>
            {item.text}
          </span>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-full"
            style={{ background: `${look.color}1f`, color: look.color }}>
            {look.label}
          </span>
        </span>

        {!item.read && (
          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: ACCENT }} aria-label="Unread" />
        )}
      </button>
    </motion.div>
  );
}

// ─── LOADING ─────────────────────────────────────────────────────────────────

/** Row-shaped, so the list does not jump when the real rows land. */
function NotificationSkeleton({ t }: { t: ReturnType<typeof useTokens> }) {
  return (
    <div aria-busy="true" aria-label="Loading notifications">
      <p className="text-[11px] font-bold uppercase tracking-widest px-5 pt-4 pb-2 flex items-center gap-2"
        style={{ color: t.sectionLbl }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Loading
      </p>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-5 py-3.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <motion.span
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.09 }}
            className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: t.chipBg }} />
          <div className="flex-1 space-y-2 pt-1">
            <motion.span
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.09 + 0.05 }}
              className="block h-3 rounded-full" style={{ background: t.chipBg, width: `${45 + (i % 3) * 14}%` }} />
            <motion.span
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.09 + 0.1 }}
              className="block h-3 rounded-full" style={{ background: t.chipBg, width: `${70 + (i % 2) * 12}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
