import { useCallback, useState }                                from "react";
import { motion, AnimatePresence }                              from "motion/react";
import { updateProfile, profileOf, startSession, type Account } from "./auth-store";
import { loadPreferences, savePreferences }                     from "./settings-store";
import { type Screen }                                          from "./auth-ui";

import BrandPanel                      from "./components/BrandPanel"
import CreateAccount                   from "./components/CreateAccount"
import ForgotPassword                  from "./components/ForgotPassword"
import GetStarted                      from "./components/GetStarted"
import Login                           from "./components/Login"
import Onboarding, { OnboardingSetup } from "./components/Onboarding"
import ResetPassword                   from "./components/ResetPassword"
import ResetSent                       from "./components/ResetSent"


// ─── AUTH FLOW (ROOT) ─────────────────────────────────────────────────────────

export function AuthFlow({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  const [screen, setScreen] = useState<Screen>("getStarted");
  /** Carried between the forgot-password, reset-sent and set-password screens. */
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  /** The account being onboarded — onboarding needs somewhere to write its picks. */
  const [pending, setPending] = useState<Account | null>(null);

  /** Opens the session and hands the account to the app. */
  const enter = useCallback((account: Account) => {
    startSession(account.email);
    onAuthenticated(account);
  }, [onAuthenticated]);

  /**
   * Persists what onboarding collected before entering the app, so Settings
   * opens already reflecting the user's picks rather than defaults.
   */
  const completeOnboarding = useCallback(async (setup: OnboardingSetup | null) => {
    const account = pending;
    if (!account) return;
    if (!setup) { enter(account); return; }

    const prefs = loadPreferences(account.email);
    savePreferences(account.email, {
      ...prefs,
      categories: setup.categories,
      responseTime: setup.responseTime,
      collab: { ...prefs.collab, types: setup.collabTypes, openToCollab: setup.openToCollab },
    });

    const result = await updateProfile(account.email, {
      displayName: setup.creatorName || profileOf(account).displayName,
      avatarColor: setup.avatarColor,
    });
    enter(result.ok ? result.value : account);
  }, [pending, enter]);

  const slide = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 } };
  const slideUp = { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } };
  const trans = { duration: 0.22 };

  // < lg: a single full-bleed column (unchanged mobile/tablet behaviour).
  // ≥ lg: brand panel + content column, so the form keeps a readable measure
  //       while the layout still fills the full desktop width.
  const pane = "h-full lg:h-auto";

  return (
    <div className="h-full w-full overflow-hidden" style={{ background: "linear-gradient(160deg, #00091a 0%, #000d24 40%, #000814 100%)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="h-full w-full lg:grid lg:grid-cols-2 2xl:grid-cols-[1.2fr_1fr]">
        <BrandPanel screen={screen} />

        <div className="relative h-full overflow-hidden lg:border-l lg:border-[rgba(0,174,239,0.14)]">
          {/* Soft accent so the form column has the same depth as the brand panel. */}
          <div
            className="hidden lg:block absolute -right-40 top-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,174,239,0.10) 0%, transparent 70%)" }}
          />
          {/* Scroll container is a plain block: centring lives on the inner wrapper via
              min-h-full, so a form taller than the viewport stays fully reachable. */}
          <div className="relative h-full lg:overflow-y-auto">
            <div className="h-full lg:h-auto lg:min-h-full lg:flex lg:items-center lg:justify-center lg:px-10 xl:px-16 lg:py-14">
              <div className="h-full w-full lg:h-auto lg:max-w-[460px]">
                <AnimatePresence mode="wait">
                  {screen === "getStarted" && (
                    <motion.div key="gs" {...slideUp} transition={trans} className={pane}>
                      <GetStarted onGetStarted={() => setScreen("createAccount")} onLogin={() => setScreen("login")} />
                    </motion.div>
                  )}
                  {screen === "login" && (
                    <motion.div key="li" {...slide} transition={trans} className={pane}>
                      <Login onLogin={enter} onCreate={() => setScreen("createAccount")} onForgot={() => setScreen("forgotPassword")} onBack={() => setScreen("getStarted")} />
                    </motion.div>
                  )}
                  {screen === "createAccount" && (
                    <motion.div key="ca" {...slide} transition={trans} className={pane}>
                      <CreateAccount onCreated={(account) => { setPending(account); setScreen("onboarding"); }}
                        onLogin={() => setScreen("login")} onBack={() => setScreen("getStarted")} />
                    </motion.div>
                  )}
                  {screen === "forgotPassword" && (
                    <motion.div key="fp" {...slide} transition={trans} className={pane}>
                      <ForgotPassword
                        onSent={(email, token) => { setResetEmail(email); setResetToken(token); setScreen("resetSent"); }}
                        onBack={() => setScreen("login")} />
                    </motion.div>
                  )}
                  {screen === "resetSent" && (
                    <motion.div key="rs" {...slideUp} transition={trans} className={pane}>
                      <ResetSent
                        email={resetEmail}
                        token={resetToken}
                        onOpenLink={() => setScreen("resetPassword")}
                        onResend={(token) => setResetToken(token)}
                        onBackToLogin={() => setScreen("login")} />
                    </motion.div>
                  )}
                  {screen === "resetPassword" && (
                    <motion.div key="rp" {...slide} transition={trans} className={pane}>
                      <ResetPassword
                        token={resetToken ?? ""}
                        onDone={() => setScreen("login")}
                        onBack={() => setScreen("forgotPassword")} />
                    </motion.div>
                  )}
                  {screen === "onboarding" && (
                    <motion.div key="ob" {...slideUp} transition={trans} className={pane}>
                      <Onboarding onDone={completeOnboarding} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
