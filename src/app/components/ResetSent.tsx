import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { requestPasswordReset } from "../auth-store";
import {
  ArrowRight,
  Check, Info
} from "lucide-react";
import { GUTTER, SCREEN } from "../Auth"

import GhostBtn from './ui/GhostBtn'
import PrimaryBtn from './ui/PrimaryBtn'

export default function ResetSent({
  email, token, onOpenLink, onResend, onBackToLogin,
}: {
  email: string; token: string | null;
  onOpenLink: () => void; onResend: (token: string | null) => void; onBackToLogin: () => void;
}) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    const result = await requestPasswordReset(email);
    setResending(false);
    if (result.ok) onResend(result.value.token);
    setResent(true);
    setTimeout(() => setResent(false), 2500);
  };

  return (
    <div className={`${SCREEN} ${GUTTER}`}>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 lg:pt-2">
        {/* Success ring */}
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(0,174,239,0.15)", border: "2px solid rgba(0,174,239,0.4)" }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: "spring", damping: 14 }}>
              <Check className="w-10 h-10" style={{ color: "#00AEEF" }} strokeWidth={2.5} />
            </motion.div>
          </div>
          {/* Pulse ring */}
          <motion.div animate={{ scale: [1, 1.4], opacity: [0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(0,174,239,0.4)" }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
          <h1 className="text-white font-extrabold text-[30px] lg:text-[36px]">Check your email</h1>
          <p className="text-white/50 text-[15px] lg:text-[16px] leading-relaxed max-w-xs mx-auto">
            We've sent a password reset link. It'll expire in 15 minutes.
          </p>
        </motion.div>

        {/* Tips */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="w-full rounded-2xl p-4 space-y-2.5" style={{ background: "rgba(0,40,100,0.35)", border: "1px solid rgba(0,174,239,0.18)" }}>
          {["Check your spam or junk folder", "The link expires in 15 minutes", "Request a new link if needed"].map((tip) => (
            <div key={tip} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00AEEF" }} />
              <span className="text-white/55 text-[13px]">{tip}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="pb-10 lg:pb-0 lg:pt-8 space-y-3">
        {/* No mail is actually sent in the prototype, so the link is surfaced
            here. A real backend emails it and this block disappears. */}
        {token ? (
          <div className="rounded-2xl px-4 py-3 space-y-2.5" style={{ background: "rgba(0,40,100,0.35)", border: "1px dashed rgba(0,174,239,0.3)" }}>
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00AEEF" }} />
              <p className="text-white/50 text-[12px] leading-relaxed">
                Prototype — no email is sent. Continue with your reset link below.
              </p>
            </div>
            <GhostBtn onClick={onOpenLink}>Open reset link</GhostBtn>
          </div>
        ) : (
          <p className="text-white/35 text-[12px] text-center leading-relaxed px-2">
            If an account exists for {email}, a reset link is on its way.
          </p>
        )}

        <PrimaryBtn onClick={onBackToLogin}>Back to Log In <ArrowRight className="w-5 h-5" /></PrimaryBtn>
        <div className="text-center">
          <button onClick={handleResend} disabled={resending} className="text-white/40 text-[14px] disabled:opacity-60">
            {resent ? (
              <span style={{ color: "#00AEEF" }} className="font-semibold">New link sent</span>
            ) : (
              <>Didn't receive it? <span style={{ color: "#00AEEF" }} className="font-semibold">{resending ? "Sending…" : "Resend"}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}