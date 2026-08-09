import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft,
  AlertCircle, Info
} from "lucide-react";
import {
  signIn, signInWithProvider,
  DEMO_ACCOUNT, type Provider, type Account,
} from "../auth-store";
import { Checkbox, GUTTER, H1, isValidEmail, Input, SCREEN, SUB, TOP_PAD, ProviderIdentity } from '../Auth'

import AppleMark     from "./ui/AppleMark"
import Divider       from "./ui/Divider"
import GoogleMark    from "./ui/GoogleMark"
import Logo          from "./ui/Logo"
import PrimaryBtn    from "./ui/PrimaryBtn"
import ProviderSheet from "./ProviderSheet"
import SocialBtn     from "./ui/SocialBtn"

export default function Login({
  onLogin, onCreate, onForgot, onBack,
}: { onLogin: (account: Account) => void; onCreate: () => void; onForgot: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  /** Which provider's chooser is open, and which one is mid-sign-in. */
  const [providerSheet, setProviderSheet] = useState<Provider | null>(null);
  const [providerBusy, setProviderBusy] = useState<Provider | null>(null);

  const valid = isValidEmail(email) && password.length >= 6;

  const handleLogin = async () => {
    const errs: typeof errors = {};
    if (!isValidEmail(email)) errs.email = "Enter a valid email address";
    if (password.length < 6) errs.password = "Password must be at least 6 characters";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    const result = await signIn(email, password);
    setLoading(false);

    // Only authenticate when the credentials actually match.
    if (!result.ok) { setErrors({ general: result.error }); return; }
    onLogin(result.value);
  };

  /** Clear the "incorrect credentials" banner as soon as the user edits either field. */
  const clearGeneral = () => setErrors((e) => (e.general ? { ...e, general: undefined } : e));

  /** Step 2 of provider sign-in: the chooser resolved to an identity. */
  const handleProviderPick = async (identity: ProviderIdentity) => {
    if (!providerSheet) return;
    const provider = providerSheet;
    setProviderSheet(null);
    setProviderBusy(provider);
    setErrors({});
    const result = await signInWithProvider(provider, identity);
    setProviderBusy(null);
    if (!result.ok) { setErrors({ general: result.error }); return; }
    onLogin(result.value);
  };

  return (
    <div className={`${SCREEN} overflow-y-auto lg:overflow-visible`}>
      {/* Header — the logo is redundant next to the desktop brand panel. */}
      <div className={`flex items-center justify-between px-6 ${TOP_PAD} pb-6 lg:pb-8 lg:px-0`}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,60,130,0.35)", border: "1px solid rgba(0,174,239,0.15)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="lg:hidden"><Logo size="sm" /></span>
        <div className="w-9" />
      </div>

      <div className={`${GUTTER} flex-1 space-y-6 pb-10 lg:pb-0`}>
        <div>
          <h1 className={H1}>Welcome back 👋</h1>
          <p className={`${SUB} mt-1`}>Log in to continue creating</p>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {errors.general && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-[13px]">{errors.general}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(v) => { setEmail(v); clearGeneral(); }} placeholder="you@example.com"
            icon={<Mail className="w-4 h-4" />} error={errors.email} autoFocus />
          <Input label="Password" type={showPw ? "text" : "password"} value={password} onChange={(v) => { setPassword(v); clearGeneral(); }}
            placeholder="••••••••" icon={<Lock className="w-4 h-4" />} error={errors.password}
            rightEl={
              <button onClick={() => setShowPw((p) => !p)} className="text-white/40 hover:text-white/70 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            } />
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between">
          <Checkbox checked={remember} onChange={setRemember}>Remember me</Checkbox>
          <button onClick={onForgot} className="text-[13px] font-semibold" style={{ color: "#00AEEF" }}>Forgot password?</button>
        </div>

        <PrimaryBtn onClick={handleLogin} disabled={!valid} loading={loading}>
          Log In <ArrowRight className="w-5 h-5" />
        </PrimaryBtn>

        <Divider />

        <div className="flex gap-3">
          <SocialBtn icon={<GoogleMark />} label="Google"
            busy={providerBusy === "google"} disabled={!!providerBusy || loading}
            onClick={() => { setErrors({}); setProviderSheet("google"); }} />
          <SocialBtn icon={<AppleMark />} label="Apple"
            busy={providerBusy === "apple"} disabled={!!providerBusy || loading}
            onClick={() => { setErrors({}); setProviderSheet("apple"); }} />
        </div>

        {/* Prototype helper — remove once a real auth backend is wired up. */}
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: "rgba(0,40,100,0.35)", border: "1px dashed rgba(0,174,239,0.3)" }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00AEEF" }} />
          <div className="text-[12px] leading-relaxed">
            <span className="text-white/50">Demo account — </span>
            <span className="text-white/80 font-semibold break-all">{DEMO_ACCOUNT.email}</span>
            <span className="text-white/50"> / </span>
            <span className="text-white/80 font-semibold">{DEMO_ACCOUNT.password}</span>
          </div>
        </div>

        <div className="text-center pb-4">
          <span className="text-white/40 text-[14px]">Don't have an account? </span>
          <button onClick={onCreate} className="font-bold text-[14px]" style={{ color: "#00AEEF" }}>Create Account</button>
        </div>
      </div>

      <AnimatePresence>
        {providerSheet && (
          <ProviderSheet key="provider" provider={providerSheet}
            onPick={handleProviderPick} onCancel={() => setProviderSheet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}