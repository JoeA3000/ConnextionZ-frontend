// ─── NOTIFICATIONS STORE ─────────────────────────────────────────────────────
//
// Everything that happened to the viewer while they were elsewhere. Same shape
// as `follow-store`: a module store rather than screen state, because the unread
// count is rendered on the feed's bell at the same time the list is open behind
// it, and the two have to agree the instant a row is read.
//
// Notifications are also *written* from all over the app — accepting a collab
// request, publishing a post, following someone back — so `notify()` is a plain
// function any screen can call without owning the list.
//
// ⚠️  PROTOTYPE PERSISTENCE — localStorage, keyed per account. The seeded rows
// are stamped relative to the moment the account is first activated, so the
// timestamps read sensibly whenever the prototype is opened.
//
// ── Replacing this with a real backend ──────────────────────────────────────
//
//   fetchNotifications() → GET   /me/notifications
//   markRead()           → PATCH /me/notifications/:id      { read: true }
//   markAllRead()        → POST  /me/notifications/read-all
//   notify()             → server-side; the client would receive it over a
//                          socket and call `receive()` with the payload.

import { useSyncExternalStore } from "react";
import { type Result } from "./auth-store";

const NOTIFICATIONS_KEY = "connextionz.notifications";

// ─── SHAPES ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "collabRequest"
  | "collabAccepted"
  | "milestone"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Handle of whoever caused it — absent for milestones and system rows. */
  actor?: string;
  /** The line rendered under the actor's name. */
  text: string;
  /** A post to open when the row is tapped. */
  postId?: string;
  /** A thread to open when the row is tapped, e.g. an accepted collab. */
  threadWith?: string;
  createdAt: number;
  read: boolean;
}

/** Which filter chip a row belongs to. Kept here so the screen stays dumb. */
export const NOTIFICATION_GROUP: Record<NotificationType, "collabs" | "social" | "system"> = {
  like: "social",
  comment: "social",
  follow: "social",
  mention: "social",
  collabRequest: "collabs",
  collabAccepted: "collabs",
  milestone: "system",
  system: "system",
};

// ─── STATE ───────────────────────────────────────────────────────────────────

let activeEmail: string | null = null;
let items: AppNotification[] = [];

const listeners = new Set<() => void>();

function publish() {
  items = [...items];
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

type NotificationsByAccount = Record<string, AppNotification[]>;

const key = (email: string) => email.trim().toLowerCase();

function readAll(): NotificationsByAccount {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as NotificationsByAccount) : {};
  } catch {
    return {};
  }
}

function persist() {
  if (!activeEmail) return;
  try {
    const all = readAll();
    // Capped: a prototype inbox that grows forever eventually fails to save.
    all[activeEmail] = items.slice(0, 120);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
  } catch {
    // A full quota must not break the screen — the list stays correct in memory.
  }
}

// ─── SEED ────────────────────────────────────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Stamped relative to `now` so the prototype never shows stale timestamps. */
function seed(now: number): AppNotification[] {
  const rows: (Omit<AppNotification, "id" | "createdAt" | "read"> & { ago: number; read?: boolean })[] = [
    { type: "collabRequest", actor: "nova.dj", text: "sent you a collab request — Music, $2K–$5K", threadWith: "nova.dj", ago: 2 * MINUTE },
    { type: "like", actor: "lens.ivy", text: "and 1,204 others liked your post", postId: "1", ago: 12 * MINUTE },
    { type: "follow", actor: "lofi.luna", text: "started following you", ago: 38 * MINUTE },
    { type: "comment", actor: "beatsby.kai", text: "commented: “This is everything 🔥 the vibe is immaculate”", postId: "1", ago: 1 * HOUR },
    { type: "collabAccepted", actor: "zara.creates", text: "accepted your collab request — the thread is open", threadWith: "zara.creates", ago: 3 * HOUR },
    { type: "mention", actor: "drop.dani", text: "mentioned you in a comment", postId: "3", ago: 5 * HOUR },
    { type: "milestone", text: "Your Collab Score hit 4.8 — top 5% of creators this month", ago: 9 * HOUR, read: true },
    { type: "like", actor: "grade.gus", text: "and 340 others liked your post", postId: "2", ago: 1 * DAY, read: true },
    { type: "follow", actor: "film.fee", text: "started following you", ago: 1 * DAY + 4 * HOUR, read: true },
    { type: "system", text: "Two-factor authentication is now available in Settings → Security", ago: 3 * DAY, read: true },
    { type: "comment", actor: "reel.rin", text: "commented: “Edits that make you rewatch 👀”", postId: "5", ago: 5 * DAY, read: true },
  ];

  return rows.map((row, i) => {
    const { ago, read, ...rest } = row;
    return { ...rest, id: `n${i + 1}`, createdAt: now - ago, read: !!read };
  });
}

// ─── ACTIVATION ──────────────────────────────────────────────────────────────

export function activateNotifications(email: string | null) {
  if (email === null) {
    activeEmail = null;
    items = [];
    publish();
    return;
  }
  if (activeEmail === key(email)) return;
  activeEmail = key(email);
  const stored = readAll()[activeEmail];
  items = Array.isArray(stored) && stored.length ? stored : seed(Date.now());
  persist();
  publish();
}

// ─── READS ───────────────────────────────────────────────────────────────────

export const notifications = (): AppNotification[] => items;

export const unreadCount = () => items.reduce((n, item) => n + (item.read ? 0 : 1), 0);

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(subscribe, notifications);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, unreadCount);
}

/**
 * The network seam. The screen calls this on mount so it has a real loading
 * state to render — the store is already warm, so what this actually models is
 * the refresh that a real client does every time the tab is opened.
 */
export async function fetchNotifications(): Promise<Result<AppNotification[]>> {
  await new Promise((r) => setTimeout(r, 480));
  if (!activeEmail) return { ok: false, error: "Sign in to see your notifications." };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "You're offline. Reconnect to load your notifications." };
  }
  return { ok: true, value: items };
}

// ─── WRITES ──────────────────────────────────────────────────────────────────

const uid = () => `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Records something that just happened. Newest rows land at the top. */
export function notify(input: Omit<AppNotification, "id" | "createdAt" | "read"> & { read?: boolean }): AppNotification {
  const item: AppNotification = {
    ...input,
    id: uid(),
    createdAt: Date.now(),
    read: !!input.read,
  };
  items = [item, ...items];
  persist();
  publish();
  return item;
}

export function markRead(id: string) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0 || items[index].read) return;
  items = [...items];
  items[index] = { ...items[index], read: true };
  persist();
  publish();
}

export function markAllRead() {
  if (!items.some((item) => !item.read)) return;
  items = items.map((item) => (item.read ? item : { ...item, read: true }));
  persist();
  publish();
}

export function clearNotifications() {
  items = [];
  persist();
  publish();
}

// ─── TIME ────────────────────────────────────────────────────────────────────

/** "now", "12m", "3h", "5d", then a date — the shortest true thing. */
export function relativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The heading a row sits under. */
export function timeBucket(timestamp: number, now = Date.now()): "Today" | "This week" | "Earlier" {
  const diff = now - timestamp;
  if (diff < DAY) return "Today";
  if (diff < 7 * DAY) return "This week";
  return "Earlier";
}
