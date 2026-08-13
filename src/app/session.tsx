// ─── SESSION CONTEXT ─────────────────────────────────────────────────────────
//
// The signed-in identity, readable from anywhere without threading it through
// every screen. It exists because of the avatar: the viewer's own face appears
// in the comment composer, the message composer, the settings card and their
// profile header, and when they change it all four have to change together. A
// prop chain from `App` to each of those is exactly the kind of thing that gets
// missed, so those places read the identity instead of being handed it.
//
// `App` still owns the account state — `onAccountChange` is what auth and the
// settings forms already call, so this wraps that seam rather than replacing it.
// When `getSession()` becomes `GET /me`, only the provider's source changes.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type Account, type Profile, profileOf } from "./auth-store";

/** The signed-in creator, in the shape the UI actually renders. */
export interface Viewer {
  email: string;
  username: string;
  displayName: string;
  /** "" when no photo is set — `<Avatar>` falls back to the initial. */
  avatarUrl: string;
  avatarColor: string;
  bio: string;
  location: string;
  website: string;
}

interface SessionValue {
  account: Account;
  profile: Profile;
  viewer: Viewer;
  /** Propagates a profile, avatar or password change up to the app. */
  setAccount: (account: Account) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  account, onAccountChange, children,
}: {
  account: Account;
  onAccountChange: (account: Account) => void;
  children: ReactNode;
}) {
  const value = useMemo<SessionValue>(() => {
    const profile = profileOf(account);
    return {
      account,
      profile,
      viewer: {
        email: account.email,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatarUrl: profile.avatarUrl ?? "",
        avatarColor: profile.avatarColor,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
      },
      setAccount: onAccountChange,
    };
  }, [account, onAccountChange]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Throws when used outside the provider. That is on purpose: a component that
 * needs the signed-in identity and silently gets a blank one is the bug this
 * whole module is meant to prevent.
 */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

export const useViewer = (): Viewer => useSession().viewer;
