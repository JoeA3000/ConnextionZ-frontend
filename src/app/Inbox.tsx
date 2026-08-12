import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "./ThemeContext";
import { creatorByUsername, identityOf } from "./creators";
import { Avatar, ViewerAvatar } from "./profile-ui";
import {
  ArrowLeft, Check, X, MessageCircle, Zap, Star,
  Clock, MapPin, DollarSign, Users, Send, ChevronRight,
  Phone, Video, MoreHorizontal, Smile,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CollabRequest {
  id: string;
  /** The sender's avatar and name come from the creator directory. */
  username: string;
  verified: boolean;
  collabScore: number;
  mutualCollabs: number;
  category: string;
  categoryIcon: string;
  message: string;
  budget: string | null;
  timeline: string;
  isRemote: boolean;
  timeSent: string;
  accent: string;
}

interface Conversation {
  id: string;
  /** Resolved to an identity by `identityOf` — never a stored avatar copy. */
  username: string;
  online: boolean;
  lastMsg: string;
  timestamp: string;
  unread: number;
  hasCollabBadge: boolean;
  messages: DM[];
}

interface DM {
  id: string;
  from: "them" | "me";
  text: string;
  time: string;
  read?: boolean;
}

const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
const uid = () => Math.random().toString(36).slice(2);

// ─── DATA ────────────────────────────────────────────────────────────────────

const SEED_REQUESTS: CollabRequest[] = [
  {
    id: "r1", username: "nova.dj", verified: true, collabScore: 4.8,
    mutualCollabs: 3, category: "Music", categoryIcon: "🎵",
    message: "Hey! Huge fan of your production style. I'd love to create a track together — I'm thinking something in the 130bpm electronic space. I have full studio access and can handle mixing/mastering. Let's make something the feed hasn't heard before 🔊",
    budget: "$2K–$5K", timeline: "1 month", isRemote: true, timeSent: "2m ago",
    accent: "#00AEEF",
  },
  {
    id: "r2", username: "zara.creates", verified: true, collabScore: 4.9,
    mutualCollabs: 7, category: "Brand Deal", categoryIcon: "💼",
    message: "A skincare brand I work with is looking for a tech/creator crossover campaign. Your audience would be a perfect fit. They're offering a flat fee + commission. Happy to jump on a call to share more details — the brief is super flexible.",
    budget: "$10K+", timeline: "2 weeks", isRemote: false, timeSent: "15m ago",
    accent: "#f472b6",
  },
  {
    id: "r3", username: "milo.visuals", verified: false, collabScore: 4.7,
    mutualCollabs: 1, category: "Video", categoryIcon: "📹",
    message: "I'm shooting a short film series about creator culture and I want to feature you in episode 3. No script — just you doing your thing while I capture it. Could be a great piece for both our portfolios. I'll cover all travel costs.",
    budget: null, timeline: "3 months", isRemote: false, timeSent: "1h ago",
    accent: "#a78bfa",
  },
  {
    id: "r4", username: "ren.filmco", verified: false, collabScore: 4.6,
    mutualCollabs: 0, category: "Podcast", categoryIcon: "🎙",
    message: "Starting a new podcast on creative entrepreneurship and would love you as my first guest. The show already has a waitlist of 2K+ subscribers. I think your story about building in public would resonate massively with the audience.",
    budget: "Open to discuss", timeline: "ASAP", isRemote: true, timeSent: "3h ago",
    accent: "#22c55e",
  },
  {
    id: "r5", username: "freq.faye", verified: true, collabScore: 4.3,
    mutualCollabs: 2, category: "Gaming", categoryIcon: "🎮",
    message: "Running a gaming creator event next month and want to create content together around it — think challenge videos, reaction content, the works. The event has brand sponsorship already sorted so all content costs are covered.",
    budget: "$500–$2K", timeline: "1 month", isRemote: false, timeSent: "5h ago",
    accent: "#f59e0b",
  },
];

const SEED_CONVOS: Conversation[] = [
  {
    id: "c1", username: "nova.dj", online: true,
    lastMsg: "Sent you the stems 🎧", timestamp: "2m", unread: 2, hasCollabBadge: true,
    messages: [
      { id: "m1", from: "them", text: "Hey! Loved your last set. Would you be down to collab?", time: "Yesterday 9:41 PM" },
      { id: "m2", from: "me", text: "100%! What kind of track are you thinking?", time: "Yesterday 9:45 PM", read: true },
      { id: "m3", from: "them", text: "Something in the 128bpm space — I have a vocal sample that's 🔥", time: "Yesterday 10:02 PM" },
      { id: "m4", from: "me", text: "Send it over! I'm in the studio tomorrow", time: "Yesterday 10:05 PM", read: true },
      { id: "m5", from: "them", text: "Sent you the stems 🎧", time: "Just now" },
    ],
  },
  {
    id: "c2", username: "zara.creates", online: true,
    lastMsg: "The brand loved the concept!", timestamp: "15m", unread: 1, hasCollabBadge: true,
    messages: [
      { id: "m1", from: "them", text: "The brand just reviewed our pitch deck", time: "1h ago" },
      { id: "m2", from: "them", text: "The brand loved the concept!", time: "15m ago" },
    ],
  },
  {
    id: "c3", username: "milo.visuals", online: false,
    lastMsg: "You: Sounds great, let's do it", timestamp: "1h", unread: 0, hasCollabBadge: false,
    messages: [
      { id: "m1", from: "them", text: "Hey! Saw your collab score went up — congrats 🙌", time: "2h ago" },
      { id: "m2", from: "me", text: "Thanks! Been putting in the work haha", time: "1h 30m ago", read: true },
      { id: "m3", from: "them", text: "Would love to do a shoot together sometime", time: "1h 10m ago" },
      { id: "m4", from: "me", text: "Sounds great, let's do it", time: "1h ago", read: true },
    ],
  },
  {
    id: "c4", username: "beatsby.kai", online: false,
    lastMsg: "Check out this loop I made", timestamp: "3h", unread: 0, hasCollabBadge: false,
    messages: [
      { id: "m1", from: "them", text: "Check out this loop I made", time: "3h ago" },
    ],
  },
  {
    id: "c5", username: "drop.dani", online: true,
    lastMsg: "You: On it 🙏", timestamp: "Yesterday", unread: 0, hasCollabBadge: true,
    messages: [
      { id: "m1", from: "them", text: "Can you review the collab brief I sent?", time: "Yesterday" },
      { id: "m2", from: "me", text: "On it 🙏", time: "Yesterday", read: true },
    ],
  },
];

// ─── CELEBRATION OVERLAY ──────────────────────────────────────────────────────

function CelebrationOverlay({ username, onDone }: { username: string; onDone: () => void }) {
  // Confetti-style particles
  const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 20 + Math.random() * 60,
    color: ["#00AEEF", "#38bdf8", "#a78bfa", "#f472b6", "#f59e0b", "#22c55e"][i % 6],
    size: 6 + Math.random() * 10,
    delay: Math.random() * 0.4,
  }));

  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,5,20,0.92)", backdropFilter: "blur(12px)" }}
    >
      {/* Particles */}
      {PARTICLES.map((p) => (
        <motion.div key={p.id}
          initial={{ x: `${p.x}vw`, y: "-5vh", opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: "110vh", opacity: 0, rotate: 720, scale: 0 }}
          transition={{ duration: 2 + Math.random(), delay: p.delay, ease: "easeIn" }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, background: p.color, left: 0, top: 0 }}
        />
      ))}

      {/* Central celebration */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, delay: 0.1 }}
        className="flex flex-col items-center gap-4 text-center px-8">
        <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ delay: 0.3, duration: 0.5 }}
          className="text-6xl">🚀</motion.div>
        <div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="text-white font-extrabold text-[26px] leading-tight">
            Your collaboration<br />is officially live!
          </motion.p>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-2 text-[14px]" style={{ color: "#00AEEF" }}>
            with @{username}
          </motion.p>
        </div>
        {/* Pulse ring */}
        <motion.div animate={{ scale: [1, 2.5], opacity: [0.6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute w-24 h-24 rounded-full" style={{ border: "2px solid #00AEEF" }} />
      </motion.div>
    </motion.div>
  );
}

// ─── COLLAB REQUEST CARD ──────────────────────────────────────────────────────

function RequestCard({ req, onAccept, onIgnore, onOpenProfile }: {
  req: CollabRequest; onAccept: () => void; onIgnore: () => void; onOpenProfile?: (username: string) => void;
}) {
  const who = identityOf(req.username);
  const isDark = useTheme();
  const [expanded, setExpanded] = useState(false);

  const cardBg = isDark ? "rgba(0,30,70,0.5)" : "rgba(255,255,255,0.85)";
  const usernameColor = isDark ? "#fff" : "#0a0e1a";
  const messageColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(10,14,26,0.65)";
  const metaBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const metaBorder = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)";
  const metaColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(10,14,26,0.55)";
  const ignoreBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const ignoreBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const ignoreColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(10,14,26,0.4)";
  const mutualColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.4)";
  const timeColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(10,14,26,0.35)";

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${req.accent}30` }}
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${req.accent}, transparent)` }} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <Avatar src={who.avatarUrl} name={who.displayName} color={who.avatarColor}
              size={48} ring ringColor={req.accent} onClick={onOpenProfile ? () => onOpenProfile(req.username) : undefined} />
            {req.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#00AEEF" }}>
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[15px]" style={{ color: usernameColor }}>@{req.username}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${req.accent}20`, color: req.accent, border: `1px solid ${req.accent}40` }}>
                {req.categoryIcon} {req.category}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[12px] font-bold" style={{ color: "#00AEEF" }}>⭐ {req.collabScore}</span>
              {req.mutualCollabs > 0 && <span className="text-[11px]" style={{ color: mutualColor }}><Users className="w-3 h-3 inline mr-0.5" />{req.mutualCollabs} mutual</span>}
              <span className="text-[11px]" style={{ color: timeColor }}>{req.timeSent}</span>
            </div>
          </div>
        </div>

        <p className={`text-[13px] leading-relaxed mb-3 ${expanded ? "" : "line-clamp-2"}`} style={{ color: messageColor }}>
          "{req.message}"
        </p>
        {req.message.length > 100 && (
          <button onClick={() => setExpanded((e) => !e)} className="text-[12px] font-semibold mb-3" style={{ color: "#00AEEF" }}>
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {req.budget && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: isDark ? "#4ade80" : "#16a34a" }}>
              <DollarSign className="w-3 h-3" />{req.budget}
            </div>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: metaBg, border: metaBorder, color: metaColor }}>
            <Clock className="w-3 h-3" />{req.timeline}
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: metaBg, border: metaBorder, color: metaColor }}>
            <MapPin className="w-3 h-3" />{req.isRemote ? "Remote" : "In Person"}
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.96 }} onClick={onIgnore}
            className="flex-1 py-3 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-1.5"
            style={{ background: ignoreBg, border: ignoreBorder, color: ignoreColor }}>
            <X className="w-4 h-4" /> Ignore
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onAccept}
            className="flex-[2] py-3 rounded-2xl font-bold text-[14px] text-white flex items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(135deg, ${req.accent}, ${req.accent}bb)`, boxShadow: `0 6px 20px ${req.accent}40` }}>
            <Check className="w-4 h-4" /> Accept Collab
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── DM THREAD ───────────────────────────────────────────────────────────────

function DMThread({ convo, onBack, onOpenProfile }: {
  convo: Conversation; onBack: () => void; onOpenProfile?: (username: string) => void;
}) {
  const isDark = useTheme();
  const who = identityOf(convo.username);
  const [msgs, setMsgs] = useState<DM[]>(convo.messages);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [msgs]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setMsgs((prev) => [...prev, { id: uid(), from: "me", text: t, time: "Just now", read: false }]);
    setText("");
  };

  const D = {
    bg: isDark ? "linear-gradient(160deg,#00071a,#000c22)" : "linear-gradient(160deg,#f2f5fb,#eaf1fc)",
    headerBorder: isDark ? "rgba(0,174,239,0.12)" : "rgba(0,0,0,0.08)",
    btnBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    iconColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(10,14,26,0.5)",
    arrowColor: isDark ? "#fff" : "#0a0e1a",
    username: isDark ? "#fff" : "#0a0e1a",
    offlineColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(10,14,26,0.35)",
    themBubble: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)",
    themText: isDark ? "#fff" : "#0a0e1a",
    timeColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(10,14,26,0.35)",
    inputBg: isDark ? "rgba(0,60,140,0.3)" : "rgba(0,0,0,0.05)",
    inputBorder: isDark ? "1px solid rgba(0,174,239,0.2)" : "1px solid rgba(0,0,0,0.08)",
    inputText: isDark ? "#fff" : "#0a0e1a",
    inputBorderTop: isDark ? "rgba(0,174,239,0.1)" : "rgba(0,0,0,0.07)",
    smileColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(10,14,26,0.35)",
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 300 }}
      className="absolute inset-0 z-30 flex flex-col"
      style={{ background: D.bg }}
    >
      <div className="flex items-center gap-3 px-4 pt-12 pb-4" style={{ borderBottom: `1px solid ${D.headerBorder}` }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: D.btnBg }}>
          <ArrowLeft className="w-4 h-4" style={{ color: D.arrowColor }} />
        </button>
        <Avatar src={who.avatarUrl} name={who.displayName} color={who.avatarColor} size={36}
          online={convo.online} onClick={onOpenProfile ? () => onOpenProfile(convo.username) : undefined} />
        <button onClick={() => onOpenProfile?.(convo.username)} className="flex-1 min-w-0 text-left">
          <p className="font-bold text-[14px]" style={{ color: D.username }}>@{convo.username}</p>
          <p className="text-[11px]" style={{ color: convo.online ? "#4ade80" : D.offlineColor }}>
            {convo.online ? "Active now" : "Offline"}
          </p>
        </button>
        <div className="flex items-center gap-2">
          {[Phone, Video, MoreHorizontal].map((Icon, i) => (
            <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: D.btnBg }}>
              <Icon className="w-3.5 h-3.5" style={{ color: D.iconColor }} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
        {msgs.length === 0 && (
          <p className="text-center text-[13px] py-10" style={{ color: D.offlineColor }}>
            This is the start of your conversation with @{convo.username}.
          </p>
        )}
        {msgs.map((m, i) => {
          const isMe = m.from === "me";
          // The avatar sits on the last message of each run, on the sender's side.
          const lastOfRun = i === msgs.length - 1 || msgs[i + 1].from !== m.from;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-6 flex-shrink-0">
                  {lastOfRun && (
                    <Avatar src={who.avatarUrl} name={who.displayName} color={who.avatarColor} size={24}
                      onClick={onOpenProfile ? () => onOpenProfile(convo.username) : undefined} />
                  )}
                </div>
              )}
              <div className="max-w-[72%] space-y-0.5">
                <div className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-snug ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={{ background: isMe ? "linear-gradient(135deg,#00AEEF,#0077cc)" : D.themBubble, color: isMe ? "#fff" : D.themText }}>
                  {m.text}
                </div>
                <p className={`text-[10px] px-1 ${isMe ? "text-right" : "text-left"}`} style={{ color: D.timeColor }}>
                  {m.time}{isMe && m.read && " · Read"}
                </p>
              </div>
              {isMe && (
                <div className="w-6 flex-shrink-0">
                  {lastOfRun && <ViewerAvatar size={24} />}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 pb-8 pt-2" style={{ borderTop: `1px solid ${D.inputBorderTop}` }}>
        <button style={{ color: D.smileColor }} className="flex-shrink-0"><Smile className="w-5 h-5" /></button>
        <div className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: D.inputBg, border: D.inputBorder }}>
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Message…"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: D.inputText }} />
        </div>
        <motion.button whileTap={{ scale: 0.88 }} onClick={send} style={{ opacity: text.trim() ? 1 : 0.35 }}>
          <Send className="w-5 h-5" style={{ color: "#00AEEF" }} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── INBOX ───────────────────────────────────────────────────────────────────

export function InboxScreen({
  onBack, initialThreadWith = null, onOpenProfile,
}: {
  onBack: () => void;
  /**
   * Handle to open a thread with on mount — how "Message" on a profile lands
   * somewhere useful instead of dropping the user on the inbox list.
   */
  initialThreadWith?: string | null;
  onOpenProfile?: (username: string) => void;
}) {
  const isDark = useTheme();
  const [tab, setTab] = useState<"messages" | "requests">("requests");
  const [requests, setRequests] = useState<CollabRequest[]>(SEED_REQUESTS);
  const [convos, setConvos] = useState<Conversation[]>(SEED_CONVOS);
  const [celebratingUser, setCelebratingUser] = useState<string | null>(null);
  const [openConvo, setOpenConvo] = useState<Conversation | null>(null);

  // Opening a thread for someone with no history starts an empty one rather than
  // refusing — the point of the button was to begin the conversation.
  useEffect(() => {
    if (!initialThreadWith) return;
    setTab("messages");
    const handle = initialThreadWith.toLowerCase();
    const existing = convos.find((c) => c.username.toLowerCase() === handle);
    if (existing) { setOpenConvo(existing); return; }
    const creator = creatorByUsername(initialThreadWith);
    if (!creator) return;
    const fresh: Conversation = {
      id: `new-${creator.id}`, username: creator.username, online: creator.online,
      lastMsg: "", timestamp: "now", unread: 0, hasCollabBadge: false, messages: [],
    };
    setConvos((prev) => [fresh, ...prev]);
    setOpenConvo(fresh);
    // `convos` is intentionally not a dependency: this runs for the handle the
    // app asked for, not every time the list changes underneath it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadWith]);

  const totalUnread = convos.reduce((n, c) => n + c.unread, 0);

  const acceptRequest = (req: CollabRequest) => {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setCelebratingUser(req.username);
  };

  const ignoreRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const D = {
    bg: isDark ? "linear-gradient(160deg,#00071a,#000c22)" : "linear-gradient(160deg,#f2f5fb,#eaf1fc)",
    headerBorder: isDark ? "rgba(0,174,239,0.1)" : "rgba(0,0,0,0.08)",
    backBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    backIcon: isDark ? "#fff" : "#0a0e1a",
    heading: isDark ? "#fff" : "#0a0e1a",
    tabActive: isDark ? "#fff" : "#0a0e1a",
    tabInactive: isDark ? "rgba(255,255,255,0.35)" : "rgba(10,14,26,0.4)",
    tabBorder: isDark ? "rgba(0,174,239,0.08)" : "rgba(0,0,0,0.07)",
    rowBorder: isDark ? "rgba(0,174,239,0.07)" : "rgba(0,0,0,0.06)",
    usernameColor: isDark ? "#fff" : "#0a0e1a",
    timestampColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(10,14,26,0.4)",
    unreadMsg: isDark ? "rgba(255,255,255,0.8)" : "rgba(10,14,26,0.85)",
    readMsg: isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.4)",
    emptyHeading: isDark ? "#fff" : "#0a0e1a",
    emptySubtext: isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.4)",
    sectionLabel: isDark ? "rgba(255,255,255,0.4)" : "rgba(10,14,26,0.4)",
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ background: D.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4" style={{ borderBottom: `1px solid ${D.headerBorder}` }}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: D.backBg }}>
          <ArrowLeft className="w-4 h-4" style={{ color: D.backIcon }} />
        </button>
        <h1 className="font-extrabold text-[22px] flex-1" style={{ color: D.heading }}>Inbox</h1>
        {requests.length > 0 && (
          <div className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "#00AEEF", color: "#000" }}>
            {requests.length}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-5 pt-3 pb-1 gap-5" style={{ borderBottom: `1px solid ${D.tabBorder}` }}>
        {(["requests", "messages"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex items-center gap-2 pb-3 relative font-semibold text-[14px] capitalize transition-colors"
            style={{ color: tab === t ? D.tabActive : D.tabInactive }}>
            {t === "requests" ? "Collab Requests" : "Messages"}
            {t === "messages" && totalUnread > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "#ef4444", color: "#fff" }}>{totalUnread}</span>
            )}
            {t === "requests" && requests.length > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "#00AEEF", color: "#000" }}>{requests.length}</span>
            )}
            {tab === t && (
              <motion.div layoutId="inbox-tab" className="absolute bottom-0 inset-x-0 h-0.5 rounded-full" style={{ background: "#00AEEF" }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait">
          {tab === "requests" && (
            <motion.div key="reqs" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="px-4 py-4 space-y-4 pb-10">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,174,239,0.1)", border: "1px solid rgba(0,174,239,0.2)" }}>
                    <Zap className="w-7 h-7" style={{ color: "#00AEEF" }} />
                  </div>
                  <div>
                    <p className="font-bold text-[17px]" style={{ color: D.emptyHeading }}>All caught up!</p>
                    <p className="text-[13px] mt-1" style={{ color: D.emptySubtext }}>New collab requests will appear here</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: D.sectionLabel }}>{requests.length} pending request{requests.length !== 1 ? "s" : ""}</p>
                  <AnimatePresence>
                    {requests.map((req) => (
                      <RequestCard key={req.id} req={req} onAccept={() => acceptRequest(req)}
                        onIgnore={() => ignoreRequest(req.id)} onOpenProfile={onOpenProfile} />
                    ))}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {tab === "messages" && (
            <motion.div key="msgs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="pb-10">
              {convos.map((convo, i) => {
                const who = identityOf(convo.username);
                return (
                <motion.button key={convo.id} whileTap={{ scale: 0.98 }} onClick={() => setOpenConvo(convo)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left active:opacity-80"
                  style={{ borderBottom: i < convos.length - 1 ? `1px solid ${D.rowBorder}` : "none" }}>
                  <Avatar
                    src={who.avatarUrl}
                    name={who.displayName}
                    color={who.avatarColor}
                    size={48}
                    online={convo.online}
                    badge={convo.hasCollabBadge ? (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-extrabold text-[9px]"
                        style={{ background: "linear-gradient(135deg,#00AEEF,#0077cc)", boxShadow: "0 2px 8px rgba(0,174,239,0.5)" }}>C</span>
                    ) : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[14px]" style={{ color: D.usernameColor }}>@{convo.username}</span>
                      <span className="text-[11px]" style={{ color: D.timestampColor }}>{convo.timestamp}</span>
                    </div>
                    <p className="text-[13px] truncate" style={{ color: convo.unread > 0 ? D.unreadMsg : D.readMsg, fontWeight: convo.unread > 0 ? 600 : 400 }}>
                      {convo.lastMsg}
                    </p>
                  </div>
                  {convo.unread > 0 && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: "#00AEEF", color: "#000" }}>
                      {convo.unread}
                    </div>
                  )}
                </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DM Thread */}
      <AnimatePresence>
        {openConvo && (
          <DMThread key={openConvo.id} convo={openConvo} onBack={() => setOpenConvo(null)} onOpenProfile={onOpenProfile} />
        )}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebratingUser && (
          <CelebrationOverlay key="celeb" username={celebratingUser} onDone={() => setCelebratingUser(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

