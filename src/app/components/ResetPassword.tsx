import { useState } from "react";
import { motion } from "motion/react";
import {
  Eye, EyeOff, Lock, ArrowRight, ArrowLeft,
  Check, AlertCircle
} from "lucide-react";
import {
  verifyResetToken, resetPassword
} from "../auth-store";
import { GUTTER, Input, H1, SCREEN, SUB, TOP_PAD } from "../Auth"

import GhostBtn   from "./ui/GhostBtn"
import Logo       from "./ui/Logo"
import PrimaryBtn from "./ui/PrimaryBtn"

export default function ResetPassword({
  token, onDone, onBack,
}: { token: string; onDone: () => void; onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});

  // Validate the link up front so an expired one is reported before the user
  // bothers typing a new password.
  const check = verifyResetToken(token);
  const linkError = check.ok ? null : check.error;

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#22c55e"][strength];
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const valid = password.length >= 8 && confirm === password;

  const handleReset = async () => {
    const errs: typeof errors = {};
    if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (confirm !== password) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    const result = await resetPassword(token, password);
    setLoading(false);
    if (!result.ok) { setErrors({ general: result.error }); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className={`${SCREEN} ${GUTTER}`}>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 lg:pt-2">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14, stiffness: 200 }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
            <Check className="w-10 h-10 text-green-400" strokeWidth={2.5} />
          </motion.div>
          <div className="space-y-3">
            <h1 className="text-white font-extrabold text-[30px] lg:text-[36px]">Password updated</h1>
            <p className="text-white/50 text-[15px] lg:text-[16px] leading-relaxed max-w-xs mx-auto">
              Your old password no longer works. Log in with the new one.
            </p>
          </div>
        </div>
        <div className="pb-10 lg:pb-0 lg:pt-8">
          <PrimaryBtn onClick={onDone}>Back to Log In <ArrowRight className="w-5 h-5" /></PrimaryBtn>
        </div>
      </div>
    );
  }

  return (
    <div className={`${SCREEN} overflow-y-auto lg:overflow-visible`}>
      <div className={`flex items-center justify-between px-6 ${TOP_PAD} pb-6 lg:pb-8 lg:px-0`}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,60,130,0.35)", border: "1px solid rgba(0,174,239,0.15)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="lg:hidden"><Logo size="sm" /></span>
        <div className="w-9" />
      </div>

      <div className={`${GUTTER} flex-1 space-y-6 pb-10 lg:pb-0`}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,174,239,0.15)", border: "1px solid rgba(0,174,239,0.3)" }}>
          <Lock className="w-7 h-7" style={{ color: "#00AEEF" }} />
        </div>

        <div>
          <h1 className={H1}>Set a new password</h1>
          <p className={`${SUB} mt-2 leading-relaxed`}>
            {check.ok ? `Choose a new password for ${check.value.email}.` : "This link can no longer be used."}
          </p>
        </div>

        {(linkError || errors.general) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-[13px]">{linkError ?? errors.general}</span>
          </div>
        )}

        {linkError ? (
          <GhostBtn onClick={onBack}>Request a new link</GhostBtn>
        ) : (
          <>
            <div className="space-y-2">
              <Input label="New password" type={showPw ? "text" : "password"} value={password}
                onChange={(v) => { setPassword(v); setErrors({}); }}
                placeholder="Min. 8 characters" icon={<Lock className="w-4 h-4" />} error={errors.password}
                rightEl={
                  <button onClick={() => setShowPw((p) => !p)} className="text-white/40">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                } />
              {password.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength ? strengthColor : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <Input label="Confirm new password" type={showPw ? "text" : "password"} value={confirm}
              onChange={(v) => { setConfirm(v); setErrors({}); }}
              placeholder="Repeat password" icon={<Lock className="w-4 h-4" />} error={errors.confirm} />

            <PrimaryBtn onClick={handleReset} disabled={!valid} loading={loading}>
              Update Password <ArrowRight className="w-5 h-5" />
            </PrimaryBtn>
          </>
        )}
      </div>
    </div>
  );
}