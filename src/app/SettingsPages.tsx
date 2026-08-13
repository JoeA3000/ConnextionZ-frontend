// ─── SETTINGS DESTINATIONS ───────────────────────────────────────────────────
//
// One component per row in the Settings list. Every row in `SettingsScreen`
// resolves to exactly one `SettingsRoute` here, so no menu option is a dead end.
//
// Two save models are used deliberately:
//   • Forms that can fail validation (profile, password) have an explicit
//     submit button and surface the store's error.
//   • Preference screens write on every tap and confirm with `SavedPill`, so a
//     user who backs out never silently loses a change.

import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, Shield, Users, Clock, Briefcase, HelpCircle, Flag, FileText, Lock,
  Check, Plus, Trash2, Star, ChevronDown, Search, Eye, TrendingUp, Heart,
  AlertCircle, Send,
} from "lucide-react";
import {
  type Account, profileOf, hasPassword, updateProfile, changePassword,
} from "./auth-store";
import {
  type Preferences, type Audience, RESPONSE_TIME_OPTIONS, BUDGET_OPTIONS, AUDIENCE_OPTIONS,
} from "./settings-store";
import {
  ACCENT, type Tokens, SubPage, Group, Row, ToggleRow, ChoiceRow, Field, Chip,
  Callout, PrimaryAction, SecondaryAction, EmptyState,
} from "./settings-ui";
import { AvatarPicker, stagedAvatarSize } from "./avatar-picker";

// ─── ROUTES ──────────────────────────────────────────────────────────────────

export type SettingsRoute =
  | "editProfile"
  | "changePassword"
  | "notifications"
  | "privacy"
  | "collabPreferences"
  | "responseTime"
  | "portfolio"
  | "analytics"
  | "helpCenter"
  | "reportProblem"
  | "terms"
  | "privacyPolicy";

export interface PageProps {
  account: Account;
  prefs: Preferences;
  t: Tokens;
  onBack: () => void;
  /** Persists a preference patch and flashes the "saved" pill. */
  onPatch: (patch: Partial<Preferences>) => void;
  /** Propagates an account change (profile edit, password change) upward. */
  onAccountChange: (account: Account) => void;
  /** Cross-links between destinations, e.g. Help Center → Report a Problem. */
  onNavigate: (route: SettingsRoute) => void;
}

const AVATAR_COLORS = ["#00AEEF", "#a78bfa", "#22c55e", "#f59e0b", "#f472b6", "#ef4444"];

// ─── EDIT PROFILE ────────────────────────────────────────────────────────────

export function EditProfilePage({ account, t, onBack, onAccountChange }: PageProps) {
  const current = profileOf(account);
  const [displayName, setDisplayName] = useState(current.displayName);
  const [username, setUsername] = useState(current.username);
  const [bio, setBio] = useState(current.bio);
  const [location, setLocation] = useState(current.location);
  const [website, setWebsite] = useState(current.website);
  const [avatarColor, setAvatarColor] = useState(current.avatarColor);
  // The chosen photo is *staged*, not saved: this form has an explicit Save, and
  // a photo that saved itself on pick would leave Cancel meaning nothing.
  const [avatarUrl, setAvatarUrl] = useState(current.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    displayName !== current.displayName || username !== current.username ||
    bio !== current.bio || location !== current.location ||
    website !== current.website || avatarColor !== current.avatarColor ||
    avatarUrl !== (current.avatarUrl ?? "");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await updateProfile(account.email, {
      displayName: displayName.trim(), username, bio: bio.trim(),
      location: location.trim(), website: website.trim(), avatarColor, avatarUrl,
    });
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    onAccountChange(result.value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <SubPage title="Edit Profile" subtitle="How other creators see you" onBack={onBack} t={t}
      footer={
        <PrimaryAction onClick={handleSave} disabled={!dirty && !saved} loading={saving} done={saved}>
          Save Changes
        </PrimaryAction>
      }>
      {/* ── Photo ── the same picker the profile header uses, so validation, the
          crop and the preview are identical wherever the photo is changed. */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: t.sectionLbl }}>
          Profile photo
        </p>
        <AvatarPicker
          avatarUrl={avatarUrl}
          name={displayName.trim() || username}
          color={avatarColor}
          onChange={setAvatarUrl}
          disabled={saving}
        />
        {avatarUrl !== (current.avatarUrl ?? "") && (
          <p className="text-[12px] mt-2.5 px-1" style={{ color: ACCENT }}>
            {avatarUrl
              ? `New photo ready — ${stagedAvatarSize(avatarUrl)}. Save changes to use it.`
              : "Photo will be removed when you save."}
          </p>
        )}
      </div>

      {/* ── Fallback colour ── what shows behind the initial when there is no
          photo, so an account without one still looks deliberate. */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: t.sectionLbl }}>
          Fallback colour
        </p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button key={c} onClick={() => setAvatarColor(c)} aria-label={`Avatar colour ${c}`}
              aria-pressed={avatarColor === c}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: c, border: avatarColor === c ? "2.5px solid white" : "2.5px solid transparent" }}>
              {avatarColor === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <p className="text-[12px] mt-2 px-1 leading-relaxed" style={{ color: t.sub }}>
          Used for your initial when you have no photo set.
        </p>
      </div>

      {error && (
        <Callout icon={<AlertCircle className="w-4 h-4" />} tone="warn" t={t}>
          <span className="text-red-400">{error}</span>
        </Callout>
      )}

      <Field label="Display name" value={displayName} onChange={setDisplayName}
        placeholder="Maya Chen" maxLength={40} t={t} />
      <Field label="Username" value={username} onChange={(v) => setUsername(v.toLowerCase())}
        placeholder="maya.creates" prefix="@" maxLength={24} t={t}
        hint="3–24 characters. Letters, numbers, dots and underscores." />
      <Field label="Bio" value={bio} onChange={setBio} multiline rows={3} maxLength={160}
        placeholder="What do you make, and who do you want to make it with?" t={t} />
      <Field label="Location" value={location} onChange={setLocation} placeholder="Los Angeles, CA" t={t} />
      <Field label="Website" value={website} onChange={setWebsite} placeholder="yoursite.com" t={t} />

      <Group label="Account" t={t}>
        <Row label="Email" right={<span className="text-[13px]" style={{ color: t.sub }}>{account.email}</span>} t={t} />
        <Row label="Signed up as" last
          right={<span className="text-[13px]" style={{ color: t.sub }}>{account.firstName} {account.lastName}</span>} t={t} />
      </Group>
      <p className="text-[12px] leading-relaxed px-1 -mt-2" style={{ color: t.sub }}>
        Your email is never shown on your public profile.
      </p>
    </SubPage>
  );
}

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────

export function ChangePasswordPage({ account, t, onBack, onAccountChange }: PageProps) {
  const isSettingFirst = !hasPassword(account);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    { label: "At least 8 characters", pass: next.length >= 8 },
    { label: "Contains a number", pass: /\d/.test(next) },
    { label: "Contains a letter", pass: /[a-zA-Z]/.test(next) },
    { label: "Both entries match", pass: next.length > 0 && next === confirm },
  ];
  const valid = rules.every((r) => r.pass) && (isSettingFirst || current.length > 0);

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    const result = await changePassword(account.email, current, next);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    onAccountChange(result.value);
    setDone(true);
    setCurrent(""); setNext(""); setConfirm("");
  };

  if (done) {
    return (
      <SubPage title={isSettingFirst ? "Password set" : "Password changed"} onBack={onBack} t={t}
        footer={<PrimaryAction onClick={onBack}>Back to Settings</PrimaryAction>}>
        <div className="flex flex-col items-center text-center pt-12">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14, stiffness: 200 }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
            <Check className="w-10 h-10 text-green-400" strokeWidth={2.5} />
          </motion.div>
          <p className="font-extrabold text-[22px] mt-6" style={{ color: t.heading }}>You're all set</p>
          <p className="text-[14px] mt-2 leading-relaxed max-w-[280px]" style={{ color: t.sub }}>
            {isSettingFirst
              ? "You can now sign in with your email and password as well as your linked provider."
              : "Your old password no longer works. Any pending reset links have been cancelled."}
          </p>
        </div>
      </SubPage>
    );
  }

  return (
    <SubPage
      title={isSettingFirst ? "Set a Password" : "Change Password"}
      subtitle={isSettingFirst ? "Add a password to this account" : "Update the password you sign in with"}
      onBack={onBack} t={t}
      footer={
        <PrimaryAction onClick={handleSubmit} disabled={!valid} loading={saving}>
          <Lock className="w-4 h-4" /> {isSettingFirst ? "Set Password" : "Update Password"}
        </PrimaryAction>
      }>
      {isSettingFirst && (
        <Callout icon={<Shield className="w-4 h-4" />} t={t}>
          This account signs in with {account.providers.map((p) => (p === "google" ? "Google" : "Apple")).join(" and ") || "a provider"}.
          Setting a password adds a second way in — the provider keeps working.
        </Callout>
      )}

      {error && (
        <Callout icon={<AlertCircle className="w-4 h-4" />} tone="warn" t={t}>
          <span className="text-red-400">{error}</span>
        </Callout>
      )}

      {!isSettingFirst && (
        <Field label="Current password" type="password" value={current} onChange={setCurrent}
          placeholder="••••••••" t={t} />
      )}
      <Field label="New password" type="password" value={next} onChange={setNext}
        placeholder="Min. 8 characters" t={t} />
      <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm}
        placeholder="Repeat password" t={t} />

      <Group label="Requirements" t={t}>
        {rules.map((r, i) => (
          <Row key={r.label} label={r.label} last={i === rules.length - 1} t={t}
            right={
              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: r.pass ? "rgba(34,197,94,0.2)" : "transparent", border: r.pass ? "1px solid rgba(34,197,94,0.5)" : `1.5px solid ${t.chevron}` }}>
                {r.pass && <Check className="w-3 h-3 text-green-400" strokeWidth={3} />}
              </div>
            } />
        ))}
      </Group>
    </SubPage>
  );
}

// ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────

export function NotificationsPage({ prefs, t, onBack, onPatch }: PageProps) {
  const n = prefs.notifications;
  const set = (patch: Partial<typeof n>) => onPatch({ notifications: { ...n, ...patch } });

  return (
    <SubPage title="Notification Preferences" subtitle="Choose what reaches you, and how" onBack={onBack} t={t}>
      <Callout icon={<Bell className="w-4 h-4" />} t={t}>
        Collab requests and direct messages are the two that matter most — leaving them on is how
        creators reach you before someone else does.
      </Callout>

      <Group label="Collaboration" t={t}>
        <ToggleRow label="Collab requests" sub="Someone wants to work with you"
          value={n.collabRequests} onChange={(v) => set({ collabRequests: v })} t={t} />
        <ToggleRow label="Direct messages" sub="New messages in your inbox" last
          value={n.messages} onChange={(v) => set({ messages: v })} t={t} />
      </Group>

      <Group label="Activity" t={t}>
        <ToggleRow label="Likes" value={n.likes} onChange={(v) => set({ likes: v })} t={t} />
        <ToggleRow label="Comments" value={n.comments} onChange={(v) => set({ comments: v })} t={t} />
        <ToggleRow label="New followers" last value={n.newFollowers} onChange={(v) => set({ newFollowers: v })} t={t} />
      </Group>

      <Group label="Discovery" t={t}>
        <ToggleRow label="Live alerts" sub="When creators you follow go live"
          value={n.liveAlerts} onChange={(v) => set({ liveAlerts: v })} t={t} />
        <ToggleRow label="Trending sounds" sub="Weekly roundup of what's climbing" last
          value={n.trendingSounds} onChange={(v) => set({ trendingSounds: v })} t={t} />
      </Group>

      <Group label="Email digest" hint="Transactional email — password resets and security alerts — is always sent." t={t}>
        {(["off", "daily", "weekly"] as const).map((v, i) => (
          <ChoiceRow key={v} t={t} last={i === 2}
            label={v === "off" ? "Off" : v === "daily" ? "Daily" : "Weekly"}
            sub={v === "off" ? "No digest email" : v === "daily" ? "A morning summary" : "Every Monday"}
            selected={n.emailDigest === v} onSelect={() => set({ emailDigest: v })} />
        ))}
      </Group>

      <Group label="Delivery" t={t}>
        <ToggleRow label="Quiet hours" sub="Mute push between 22:00 and 08:00" last
          value={n.quietHours} onChange={(v) => set({ quietHours: v })} t={t} />
        <ToggleRow label="Product updates" sub="New features and creator tips"
          value={n.productUpdates} onChange={(v) => set({ productUpdates: v })} t={t} />
      </Group>
    </SubPage>
  );
}

// ─── PRIVACY SETTINGS ────────────────────────────────────────────────────────

function AudienceGroup({ label, hint, value, onChange, t }: {
  label: string; hint?: string; value: Audience; onChange: (v: Audience) => void; t: Tokens;
}) {
  return (
    <Group label={label} hint={hint} t={t}>
      {AUDIENCE_OPTIONS.map((o, i) => (
        <ChoiceRow key={o.value} label={o.label} selected={value === o.value}
          onSelect={() => onChange(o.value)} last={i === AUDIENCE_OPTIONS.length - 1} t={t} />
      ))}
    </Group>
  );
}

export function PrivacyPage({ prefs, t, onBack, onPatch }: PageProps) {
  const p = prefs.privacy;
  const set = (patch: Partial<typeof p>) => onPatch({ privacy: { ...p, ...patch } });

  return (
    <SubPage title="Privacy Settings" subtitle="Who can see you and reach you" onBack={onBack} t={t}>
      <Group label="Account" hint="A private account still appears in Discover unless you also turn off discoverability below." t={t}>
        <ToggleRow label="Private account" sub="Only approved followers see your posts" last
          value={p.privateAccount} onChange={(v) => set({ privateAccount: v })} t={t} />
      </Group>

      <AudienceGroup label="Who can message you" value={p.whoCanMessage}
        onChange={(v) => set({ whoCanMessage: v })} t={t} />

      <AudienceGroup label="Who can send collab requests" value={p.whoCanCollab}
        onChange={(v) => set({ whoCanCollab: v })} t={t}
        hint="Set this to “No one” and your profile shows as closed to collabs." />

      <Group label="Profile visibility" t={t}>
        <ToggleRow label="Show Collab Score" sub="Your rating and collab count on your profile"
          value={p.showCollabScore} onChange={(v) => set({ showCollabScore: v })} t={t} />
        <ToggleRow label="Show online status" sub="The green dot in Inbox conversations"
          value={p.showOnlineStatus} onChange={(v) => set({ showOnlineStatus: v })} t={t} />
        <ToggleRow label="Allow mentions" sub="Others can tag @you in captions and comments" last
          value={p.allowMentions} onChange={(v) => set({ allowMentions: v })} t={t} />
      </Group>

      <Group label="Data" t={t}>
        <ToggleRow label="Appear in Discover" sub="Your profile can surface in search and trending"
          value={p.discoverable} onChange={(v) => set({ discoverable: v })} t={t} />
        <ToggleRow label="Personalised recommendations" sub="Use your activity to tune your feed" last
          value={p.personalisation} onChange={(v) => set({ personalisation: v })} t={t} />
      </Group>

      <Callout icon={<Shield className="w-4 h-4" />} t={t}>
        This prototype stores every preference in your browser only. Nothing is sent to a server.
      </Callout>
    </SubPage>
  );
}

// ─── COLLAB PREFERENCES ──────────────────────────────────────────────────────

const COLLAB_TYPE_OPTIONS = [
  { label: "Paid Collaboration", sub: "Compensated for your time and reach" },
  { label: "Free / Creative Collab", sub: "Purely for the content" },
  { label: "Duet / Remix", sub: "Respond to or remix another creator's post" },
  { label: "Podcast / Interview", sub: "Guest on shows, or host others" },
  { label: "Brand Deal", sub: "Sponsored content with brand partners" },
];

const CATEGORY_OPTIONS = [
  "Music", "Fitness", "Travel", "Cooking", "Art", "Tech", "Gaming", "Fashion", "Business",
];

export function CollabPreferencesPage({ prefs, t, onBack, onPatch, onNavigate }: PageProps) {
  const c = prefs.collab;
  const set = (patch: Partial<typeof c>) => onPatch({ collab: { ...c, ...patch } });

  const toggleType = (label: string) =>
    set({ types: c.types.includes(label) ? c.types.filter((x) => x !== label) : [...c.types, label] });

  const toggleCategory = (label: string) =>
    onPatch({
      categories: prefs.categories.includes(label)
        ? prefs.categories.filter((x) => x !== label)
        : [...prefs.categories, label],
    });

  return (
    <SubPage title="Collab Preferences" subtitle="What you're open to, and from whom" onBack={onBack} t={t}>
      <Group label="Availability" t={t}>
        <ToggleRow label="Open to collaborations" sub="Shows the ✦ Open to Collab badge on your posts" last
          value={c.openToCollab} onChange={(v) => set({ openToCollab: v })} t={t} />
      </Group>

      <Group label="Collab types" hint="Creators see these on your profile so they know how to approach you." t={t}>
        {COLLAB_TYPE_OPTIONS.map((o, i) => (
          <button key={o.label} onClick={() => toggleType(o.label)}
            className="w-full flex items-center px-4 py-4 text-left transition-opacity active:opacity-70"
            style={{ borderBottom: i === COLLAB_TYPE_OPTIONS.length - 1 ? "none" : `1px solid ${t.divider}` }}>
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-[14px]" style={{ color: c.types.includes(o.label) ? ACCENT : t.body, fontWeight: c.types.includes(o.label) ? 700 : 400 }}>
                {o.label}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: t.sub }}>{o.sub}</p>
            </div>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                background: c.types.includes(o.label) ? ACCENT : "transparent",
                border: c.types.includes(o.label) ? `1px solid ${ACCENT}` : `1.5px solid ${t.chevron}`,
              }}>
              {c.types.includes(o.label) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
          </button>
        ))}
      </Group>

      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: t.sectionLbl }}>
          Typical budget
        </p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((b) => (
            <Chip key={b} label={b} selected={c.budget === b} onClick={() => set({ budget: b })} t={t} />
          ))}
        </div>
      </div>

      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: t.sectionLbl }}>
          What you create
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => (
            <Chip key={cat} label={cat} selected={prefs.categories.includes(cat)}
              onClick={() => toggleCategory(cat)} t={t} />
          ))}
        </div>
        <p className="text-[12px] leading-relaxed mt-2 px-1" style={{ color: t.sub }}>
          Your feed is personalised around these picks.
        </p>
      </div>

      <Group label="Screening" t={t}>
        <ToggleRow label="Auto-screen requests" sub="Hide requests from low-rated creators"
          value={c.autoScreen} onChange={(v) => set({ autoScreen: v })} t={t} />
        <div className="px-4 py-4" style={{ opacity: c.autoScreen ? 1 : 0.4, pointerEvents: c.autoScreen ? "auto" : "none" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px]" style={{ color: t.body }}>Minimum Collab Score</span>
            <span className="text-[14px] font-bold" style={{ color: ACCENT }}>⭐ {c.minCollabScore.toFixed(1)}</span>
          </div>
          <input type="range" min={1} max={5} step={0.1} value={c.minCollabScore}
            onChange={(e) => set({ minCollabScore: Number(e.target.value) })}
            aria-label="Minimum Collab Score"
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${ACCENT} ${((c.minCollabScore - 1) / 4) * 100}%, ${t.switchOff} ${((c.minCollabScore - 1) / 4) * 100}%)`,
            }} />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px]" style={{ color: t.sub }}>1.0</span>
            <span className="text-[11px]" style={{ color: t.sub }}>5.0</span>
          </div>
        </div>
        <ToggleRow label="Remote collabs only" sub="Filter out anything requiring travel" last
          value={c.remoteOnly} onChange={(v) => set({ remoteOnly: v })} t={t} />
      </Group>

      <Group label="Related" t={t}>
        <Row label="Response time" sub="How fast you typically reply" onClick={() => onNavigate("responseTime")} last t={t}
          right={<span className="text-[13px]" style={{ color: t.sub }}>{prefs.responseTime}</span>} />
      </Group>
    </SubPage>
  );
}

// ─── RESPONSE TIME ───────────────────────────────────────────────────────────

export function ResponseTimePage({ prefs, t, onBack, onPatch }: PageProps) {
  return (
    <SubPage title="Response Time" subtitle="Set expectations before someone reaches out" onBack={onBack} t={t}>
      <Callout icon={<Clock className="w-4 h-4" />} t={t}>
        This shows on your profile and in collab requests. Creators who reply inside their stated
        window keep a higher Collab Score, so pick the one you can actually hold.
      </Callout>

      <Group label="Typical response time" t={t}>
        {RESPONSE_TIME_OPTIONS.map((o, i) => (
          <ChoiceRow key={o.value} label={o.label} sub={o.sub}
            selected={prefs.responseTime === o.value}
            onSelect={() => onPatch({ responseTime: o.value })}
            last={i === RESPONSE_TIME_OPTIONS.length - 1} t={t} />
        ))}
      </Group>

      <div className="rounded-2xl p-4" style={{ background: t.cardBg, border: t.cardBorder }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: t.sectionLbl }}>
          How your profile will read
        </p>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,174,239,0.15)" }}>
            <Clock className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-[14px] font-bold" style={{ color: t.heading }}>Usually replies {prefs.responseTime}</p>
            <p className="text-[12px]" style={{ color: t.sub }}>Shown on every collab request you receive</p>
          </div>
        </div>
      </div>
    </SubPage>
  );
}

// ─── PORTFOLIO ───────────────────────────────────────────────────────────────

export function PortfolioPage({ prefs, t, onBack, onPatch }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [year, setYear] = useState("");

  const items = prefs.portfolio;
  const canAdd = title.trim().length > 0;

  const add = () => {
    if (!canAdd) return;
    onPatch({
      portfolio: [
        {
          // Unique without a date dependency: the highest existing suffix + 1.
          id: `p${items.reduce((max, it) => Math.max(max, Number(it.id.slice(1)) || 0), 0) + 1}`,
          title: title.trim(),
          role: role.trim() || "Creator",
          year: year.trim() || "2026",
          image: "",
          featured: false,
        },
        ...items,
      ],
    });
    setTitle(""); setRole(""); setYear(""); setAdding(false);
  };

  const remove = (id: string) => onPatch({ portfolio: items.filter((i) => i.id !== id) });
  const toggleFeatured = (id: string) =>
    onPatch({ portfolio: items.map((i) => (i.id === id ? { ...i, featured: !i.featured } : i)) });

  return (
    <SubPage title="Portfolio" subtitle={`${items.length} ${items.length === 1 ? "piece" : "pieces"} of work`}
      onBack={onBack} t={t}
      footer={
        adding
          ? <div className="space-y-3">
              <PrimaryAction onClick={add} disabled={!canAdd}><Plus className="w-4 h-4" /> Add to Portfolio</PrimaryAction>
              <SecondaryAction onClick={() => setAdding(false)} t={t}>Cancel</SecondaryAction>
            </div>
          : <PrimaryAction onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Work</PrimaryAction>
      }>
      <AnimatePresence initial={false}>
        {adding && (
          <motion.div key="add-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl p-4 mb-5" style={{ background: t.cardBg, border: t.cardBorder }}>
              <Field label="Title" value={title} onChange={setTitle} placeholder="Midnight Rush" maxLength={60} t={t} />
              <Field label="Your role" value={role} onChange={setRole} placeholder="Producer · with @nova.dj" t={t} />
              <Field label="Year" value={year} onChange={setYear} placeholder="2026" t={t} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-7 h-7" />} title="No work yet"
          body="Add the collabs you're proudest of. Creators check your portfolio before they send a request."
          t={t} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div key={item.id} layout
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60, transition: { duration: 0.18 } }}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: t.groupBg, border: t.groupBorder }}>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(0,174,239,0.12)" }}>
                  {item.image
                    ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                    : <Briefcase className="w-5 h-5" style={{ color: ACCENT }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-bold truncate" style={{ color: t.heading }}>{item.title}</p>
                    {item.featured && <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f59e0b", fill: "#f59e0b" }} />}
                  </div>
                  <p className="text-[12px] truncate mt-0.5" style={{ color: t.sub }}>{item.role}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: t.sub }}>{item.year}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleFeatured(item.id)}
                    aria-label={item.featured ? "Unfeature" : "Feature"}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: item.featured ? "rgba(245,158,11,0.15)" : t.chipBg }}>
                    <Star className="w-3.5 h-3.5" style={{ color: item.featured ? "#f59e0b" : t.sub }} />
                  </button>
                  <button onClick={() => remove(item.id)} aria-label="Remove"
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)" }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </SubPage>
  );
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
//
// Charting rules applied here: one measure per chart (never a second y-axis),
// a single hue because each chart shows a single series, thin marks with 4px
// rounded data-ends anchored to the baseline, a 2px gap between bars, recessive
// gridlines, and a tap/hover readout instead of a label on every bar.

const VIEWS_BY_DAY = [
  { day: "Mon", value: 12400 },
  { day: "Tue", value: 18900 },
  { day: "Wed", value: 15200 },
  { day: "Thu", value: 27600 },
  { day: "Fri", value: 41300 },
  { day: "Sat", value: 38700 },
  { day: "Sun", value: 22100 },
];

const COLLAB_SOURCES = [
  { label: "Music", value: 34 },
  { label: "Brand Deal", value: 26 },
  { label: "Video", value: 18 },
  { label: "Podcast", value: 14 },
  { label: "Gaming", value: 8 },
];

const compact = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : String(n);

function StatTile({ icon, label, value, delta, t }: {
  icon: ReactNode; label: string; value: string; delta: string; t: Tokens;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: t.groupBg, border: t.groupBorder }}>
      <div className="flex items-center gap-2 mb-2.5" style={{ color: t.sub }}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-extrabold text-[24px] leading-none" style={{ color: t.heading }}>{value}</p>
      <p className="text-[12px] mt-1.5 font-semibold" style={{ color: "#22c55e" }}>↑ {delta}</p>
    </div>
  );
}

/** Single-series bar chart. One hue, so no legend — the heading names the series. */
function ViewsChart({ t }: { t: Tokens }) {
  const [active, setActive] = useState<number | null>(null);
  const peak = Math.max(...VIEWS_BY_DAY.map((d) => d.value));
  const shown = active ?? VIEWS_BY_DAY.findIndex((d) => d.value === peak);
  const total = VIEWS_BY_DAY.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: t.groupBg, border: t.groupBorder }}>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[14px] font-bold" style={{ color: t.heading }}>Views this week</p>
        <p className="text-[13px] font-semibold" style={{ color: t.sub }}>{compact(total)} total</p>
      </div>
      {/* Readout replaces per-bar labels: one value at a time, always legible. */}
      <p className="text-[12px] mb-4" style={{ color: t.sub }}>
        <span className="font-bold" style={{ color: ACCENT }}>{compact(VIEWS_BY_DAY[shown].value)}</span>
        {" "}on {VIEWS_BY_DAY[shown].day}{active === null && " — your best day"}
      </p>

      <div className="flex items-end gap-[2px] h-32" role="img"
        aria-label={`Daily views: ${VIEWS_BY_DAY.map((d) => `${d.day} ${compact(d.value)}`).join(", ")}`}>
        {VIEWS_BY_DAY.map((d, i) => (
          <button key={d.day}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
            aria-label={`${d.day}: ${compact(d.value)} views`}
            className="flex-1 h-full flex flex-col justify-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / peak) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
              style={{
                background: ACCENT,
                borderRadius: "4px 4px 0 0",
                opacity: active === null || active === i ? 1 : 0.35,
              }}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-[2px] mt-2" style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 6 }}>
        {VIEWS_BY_DAY.map((d, i) => (
          <span key={d.day} className="flex-1 text-center text-[11px] font-semibold"
            style={{ color: shown === i ? ACCENT : t.sub }}>
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranked magnitude, one hue, every row direct-labelled — no legend needed. */
function SourcesChart({ t }: { t: Tokens }) {
  const peak = Math.max(...COLLAB_SOURCES.map((s) => s.value));
  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: t.groupBg, border: t.groupBorder }}>
      <p className="text-[14px] font-bold mb-1" style={{ color: t.heading }}>Collab requests by type</p>
      <p className="text-[12px] mb-4" style={{ color: t.sub }}>Last 30 days</p>
      <div className="space-y-3">
        {COLLAB_SOURCES.map((s) => (
          <div key={s.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[13px]" style={{ color: t.body }}>{s.label}</span>
              <span className="text-[13px] font-bold" style={{ color: t.heading }}>{s.value}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: t.switchOff }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(s.value / peak) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="h-full rounded-full" style={{ background: ACCENT }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage({ prefs, t, onBack, onNavigate }: PageProps) {
  const acceptedRate = 68;

  return (
    <SubPage title="Analytics" subtitle="How your work and collabs are performing" onBack={onBack} t={t}>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatTile icon={<Eye className="w-3.5 h-3.5" />} label="Views" value="176.2K" delta="18% vs last week" t={t} />
        <StatTile icon={<Heart className="w-3.5 h-3.5" />} label="Likes" value="42.8K" delta="12% vs last week" t={t} />
        <StatTile icon={<Users className="w-3.5 h-3.5" />} label="Collabs" value="27" delta="4 this month" t={t} />
        <StatTile icon={<Star className="w-3.5 h-3.5" />} label="Collab Score" value="4.8" delta="0.2 this quarter" t={t} />
      </div>

      <ViewsChart t={t} />
      <SourcesChart t={t} />

      <Group label="Collab funnel" t={t}>
        <Row label="Requests received" right={<span className="text-[14px] font-bold" style={{ color: t.heading }}>100</span>} t={t} />
        <Row label="Accepted" right={<span className="text-[14px] font-bold" style={{ color: t.heading }}>{acceptedRate}</span>} t={t} />
        <Row label="Completed" right={<span className="text-[14px] font-bold" style={{ color: t.heading }}>54</span>} t={t} />
        <Row label="Average reply time" last
          right={<span className="text-[14px] font-bold" style={{ color: ACCENT }}>{prefs.responseTime}</span>} t={t} />
      </Group>

      <Group label="Improve your numbers" t={t}>
        <Row label="Response time" sub="Faster replies raise your Collab Score"
          onClick={() => onNavigate("responseTime")} t={t}
          right={<TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />} />
        <Row label="Portfolio" sub="Profiles with 3+ pieces get more requests" last
          onClick={() => onNavigate("portfolio")} t={t}
          right={<TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />} />
      </Group>

      <p className="text-[12px] leading-relaxed px-1 text-center" style={{ color: t.sub }}>
        Prototype figures — a live build reads these from your account.
      </p>
    </SubPage>
  );
}

// ─── HELP CENTER ─────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "How does the Collab Score work?",
    a: "Your Collab Score averages the ratings other creators leave after a completed collaboration, weighted toward recent work. Replying inside your stated response time and finishing what you accept are the two things that move it most.",
  },
  {
    q: "Who can send me a collab request?",
    a: "By default, anyone. Settings → Privacy Settings → “Who can send collab requests” narrows this to people you follow back, or closes it entirely. Turning on auto-screening in Collab Preferences also hides requests from creators below a score you choose.",
  },
  {
    q: "What happens when I accept a request?",
    a: "Accepting opens a direct message thread with that creator, marked with a C badge in your Inbox so you can tell collab threads from ordinary conversations. Ignoring a request removes it without notifying the sender.",
  },
  {
    q: "Can I use a sound I found in Discover?",
    a: "Yes. Open the sound from Discover and tap “Use This Sound” — it attaches to your next upload. Trending sounds show a growth percentage so you can see what's climbing before it peaks.",
  },
  {
    q: "How do I go live?",
    a: "Tap the + button in the bottom navigation, give the stream a title, and start. Viewers can send collab requests mid-stream, which land in your Inbox like any other request.",
  },
  {
    q: "Why can't I sign in with my password?",
    a: "If you created the account with Google or Apple it may not have a password yet. Sign in with that provider, then use Settings → Change Password to set one.",
  },
  {
    q: "How do I delete my account?",
    a: "Settings → Delete Profile. It's a two-step flow and asks you to type DELETE, because it removes your profile, collab history, messages and saved sounds permanently.",
  },
];

function FaqItem({ q, a, open, onToggle, last, t }: {
  q: string; a: string; open: boolean; onToggle: () => void; last: boolean; t: Tokens;
}) {
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${t.divider}` }}>
      <button onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-70">
        <span className="flex-1 text-[14px] font-semibold" style={{ color: open ? ACCENT : t.body }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown className="w-4 h-4" style={{ color: open ? ACCENT : t.chevron }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <p className="px-4 pb-4 text-[13px] leading-relaxed" style={{ color: t.sub }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HelpCenterPage({ t, onBack, onNavigate }: PageProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <SubPage title="Help Center" subtitle="Answers to the questions we get most" onBack={onBack} t={t}>
      <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3 mb-5"
        style={{ background: t.fieldBg, border: t.fieldBorder }}>
        <Search className="w-4 h-4 flex-shrink-0" style={{ color: t.sub }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help articles…"
          className="flex-1 bg-transparent text-[15px] outline-none" style={{ color: t.heading }} />
      </div>

      {matches.length === 0 ? (
        <EmptyState icon={<HelpCircle className="w-7 h-7" />} title="No results"
          body={`Nothing matches “${query}”. Try a different word, or report the problem and we'll pick it up.`} t={t} />
      ) : (
        <Group label={query ? `${matches.length} result${matches.length === 1 ? "" : "s"}` : "Popular questions"} t={t}>
          {matches.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} open={open === f.q}
              onToggle={() => setOpen(open === f.q ? null : f.q)}
              last={i === matches.length - 1} t={t} />
          ))}
        </Group>
      )}

      <Group label="Still stuck?" t={t}>
        <Row label="Report a problem" sub="Tell us what broke and we'll look into it"
          onClick={() => onNavigate("reportProblem")} t={t}
          right={<Flag className="w-4 h-4" style={{ color: ACCENT }} />} />
        <Row label="Terms of Service" onClick={() => onNavigate("terms")} t={t}
          right={<FileText className="w-4 h-4" style={{ color: t.chevron }} />} />
        <Row label="Privacy Policy" last onClick={() => onNavigate("privacyPolicy")} t={t}
          right={<FileText className="w-4 h-4" style={{ color: t.chevron }} />} />
      </Group>
    </SubPage>
  );
}

// ─── REPORT A PROBLEM ────────────────────────────────────────────────────────

const REPORT_TOPICS = [
  { value: "bug", label: "Something is broken", sub: "A screen, button or action isn't working" },
  { value: "content", label: "Report content", sub: "A post, comment or sound that breaks the rules" },
  { value: "user", label: "Report a creator", sub: "Harassment, impersonation or spam" },
  { value: "payment", label: "Payments & collabs", sub: "A dispute over an agreed collaboration" },
  { value: "other", label: "Something else", sub: "Anything that doesn't fit above" },
];

export function ReportProblemPage({ account, t, onBack }: PageProps) {
  const [topic, setTopic] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState(account.email);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = !!topic && details.trim().length >= 10;

  const submit = async () => {
    setSending(true);
    // Stands in for POST /support/reports — the UI states are the real work here.
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <SubPage title="Report sent" onBack={onBack} t={t}
        footer={<PrimaryAction onClick={onBack}>Back to Settings</PrimaryAction>}>
        <div className="flex flex-col items-center text-center pt-12">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14, stiffness: 200 }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,174,239,0.15)", border: "2px solid rgba(0,174,239,0.4)" }}>
            <Check className="w-10 h-10" style={{ color: ACCENT }} strokeWidth={2.5} />
          </motion.div>
          <p className="font-extrabold text-[22px] mt-6" style={{ color: t.heading }}>Thanks for flagging it</p>
          <p className="text-[14px] mt-2 leading-relaxed max-w-[280px]" style={{ color: t.sub }}>
            We've logged your report. If we need more detail we'll email {contactEmail}.
          </p>
          <div className="w-full mt-8">
            <Callout icon={<AlertCircle className="w-4 h-4" />} t={t}>
              Prototype — reports are not actually transmitted anywhere.
            </Callout>
          </div>
        </div>
      </SubPage>
    );
  }

  return (
    <SubPage title="Report a Problem" subtitle="The more detail, the faster we can fix it" onBack={onBack} t={t}
      footer={
        <PrimaryAction onClick={submit} disabled={!valid} loading={sending}>
          <Send className="w-4 h-4" /> Send Report
        </PrimaryAction>
      }>
      <Group label="What's this about?" t={t}>
        {REPORT_TOPICS.map((o, i) => (
          <ChoiceRow key={o.value} label={o.label} sub={o.sub} selected={topic === o.value}
            onSelect={() => setTopic(o.value)} last={i === REPORT_TOPICS.length - 1} t={t} />
        ))}
      </Group>

      <Field label="What happened?" value={details} onChange={setDetails} multiline rows={5} maxLength={1000}
        placeholder="Describe what you did, what you expected, and what happened instead."
        hint={details.trim().length < 10 ? "At least 10 characters, so we have something to go on." : undefined}
        t={t} />

      <Field label="Contact email" type="email" value={contactEmail} onChange={setContactEmail}
        hint="We'll only use this to follow up on this report." t={t} />
    </SubPage>
  );
}

// ─── LEGAL DOCUMENTS ─────────────────────────────────────────────────────────

interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: "Last updated 1 June 2026",
  intro: "These terms cover your use of ConnextionZ. By creating an account you agree to them.",
  sections: [
    {
      heading: "1. Your account",
      body: [
        "You must be at least 13 years old to use ConnextionZ, and old enough to enter a contract where you live if you intend to accept paid collaborations.",
        "You are responsible for what happens under your account, including keeping your password to yourself. Tell us straight away if you think someone else has access.",
      ],
    },
    {
      heading: "2. Your content",
      body: [
        "You keep ownership of everything you post. You grant us a licence to host, display and distribute it so the service can function — nothing wider than that.",
        "Only post work you have the rights to. If you use a sound, sample or clip from another creator, make sure you are allowed to.",
      ],
    },
    {
      heading: "3. Collaborations",
      body: [
        "A collab request is an introduction, not a contract. Terms you agree with another creator — payment, deliverables, deadlines — are between the two of you.",
        "We may show a Collab Score based on ratings from completed collaborations. It reflects other creators' feedback and is not a guarantee of anyone's conduct.",
      ],
    },
    {
      heading: "4. What you may not do",
      body: [
        "Do not harass, impersonate or threaten anyone. Do not post content that is illegal where you or your audience are.",
        "Do not scrape the service, automate requests, or attempt to interfere with anyone else's use of it.",
      ],
    },
    {
      heading: "5. Ending your account",
      body: [
        "You can delete your account at any time from Settings. Deletion is permanent and removes your profile, collab history, messages and saved content.",
        "We may suspend or end an account that repeatedly breaks these terms, and will tell you why unless we are legally prevented from doing so.",
      ],
    },
    {
      heading: "6. Changes",
      body: [
        "We will give notice in the app before any material change to these terms takes effect. Continuing to use ConnextionZ after that means you accept the new version.",
      ],
    },
  ],
};

const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  updated: "Last updated 1 June 2026",
  intro: "What we collect, why we collect it, and the control you have over it.",
  sections: [
    {
      heading: "1. What we collect",
      body: [
        "Account details you give us: name, email, and anything you add to your profile such as a bio, location or website.",
        "Activity on the service: posts, comments, collab requests and messages, plus the preferences you set in Settings.",
        "Technical data your device sends: approximate region, device type and app version, used to keep the service working.",
      ],
    },
    {
      heading: "2. Why we use it",
      body: [
        "To run the service — showing your posts, delivering collab requests, and letting creators find each other.",
        "To personalise your feed, which you can turn off in Settings → Privacy Settings → Personalised recommendations.",
        "To keep the platform safe: detecting spam, impersonation and abuse.",
      ],
    },
    {
      heading: "3. What we share",
      body: [
        "We do not sell your personal data.",
        "Your public profile, posts and Collab Score are visible to other creators, subject to the visibility settings you choose.",
        "Service providers who host or process data on our behalf are bound to use it only for that purpose.",
      ],
    },
    {
      heading: "4. Your controls",
      body: [
        "Privacy Settings controls who can message you, who can send collab requests, and whether you appear in Discover.",
        "Notification Preferences controls what reaches you and how often.",
        "You can edit your profile at any time, and delete your account and its data permanently from Settings.",
      ],
    },
    {
      heading: "5. Keeping data",
      body: [
        "We keep your data while your account is open. When you delete it, your profile, messages and collab history are removed.",
        "Some records may be retained where the law requires it, for the shortest period allowed.",
      ],
    },
    {
      heading: "6. Contact",
      body: [
        "Questions about this policy, or a request to access or export your data, can be raised from Settings → Report a Problem.",
      ],
    },
  ],
};

function LegalPage({ doc, t, onBack }: { doc: LegalDoc; t: Tokens; onBack: () => void }) {
  return (
    <SubPage title={doc.title} subtitle={doc.updated} onBack={onBack} t={t}>
      <Callout icon={<FileText className="w-4 h-4" />} t={t}>
        Prototype copy. A production build serves the reviewed legal text from the same route.
      </Callout>

      <p className="text-[14px] leading-relaxed mb-6" style={{ color: t.body }}>{doc.intro}</p>

      <div className="space-y-6">
        {doc.sections.map((s) => (
          <div key={s.heading}>
            <h2 className="font-bold text-[15px] mb-2" style={{ color: t.heading }}>{s.heading}</h2>
            <div className="space-y-2.5">
              {s.body.map((p, i) => (
                <p key={i} className="text-[13px] leading-relaxed" style={{ color: t.sub }}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[12px] mt-10" style={{ color: t.sub }}>ConnextionZ v1.0.0</p>
    </SubPage>
  );
}

export const TermsPage = ({ t, onBack }: PageProps) => <LegalPage doc={TERMS} t={t} onBack={onBack} />;
export const PrivacyPolicyPage = ({ t, onBack }: PageProps) => <LegalPage doc={PRIVACY_POLICY} t={t} onBack={onBack} />;

// ─── ROUTE TABLE ─────────────────────────────────────────────────────────────
//
// Exhaustive by construction: `SettingsRoute` and this record are typed
// together, so a route added without a page is a compile error rather than a
// row that silently does nothing.

export const SETTINGS_PAGES: Record<SettingsRoute, (props: PageProps) => ReactElement> = {
  editProfile: EditProfilePage,
  changePassword: ChangePasswordPage,
  notifications: NotificationsPage,
  privacy: PrivacyPage,
  collabPreferences: CollabPreferencesPage,
  responseTime: ResponseTimePage,
  portfolio: PortfolioPage,
  analytics: AnalyticsPage,
  helpCenter: HelpCenterPage,
  reportProblem: ReportProblemPage,
  terms: TermsPage,
  privacyPolicy: PrivacyPolicyPage,
};
