import { motion } from "motion/react";
import {
  PROVIDER_LABEL, type Provider
} from "../auth-store";

import AppleMark from "./ui/AppleMark"
import GoogleMark from "./ui/GoogleMark"

// ─── PROVIDER SIGN-IN SHEET ──────────────────────────────────────────────────
// Stands in for the Google / Apple account chooser popup. Real OAuth replaces
// this component only: it resolves to an identity, and everything downstream
// (`signInWithProvider`, account linking) stays exactly as it is.


interface ProviderIdentity { email: string; firstName: string; lastName: string }

const PROVIDER_ACCOUNTS: ProviderIdentity[] = [
  { email: "demo@connextionz.app", firstName: "Maya", lastName: "Chen" },
  { email: "alex.rivera@gmail.com", firstName: "Alex", lastName: "Rivera" },
];

const PROVIDER_MARK: Record<Provider, { node: React.ReactNode; bg: string }> = {
  google: { node: <GoogleMark className="w-5 h-5" />, bg: "#ffffff" },
  apple: { node: <AppleMark className="w-5 h-5" />, bg: "#000000" },
};

export default function ProviderSheet({
  provider, onPick, onCancel,
}: { provider: Provider; onPick: (id: ProviderIdentity) => void; onCancel: () => void }) {
  const mark = PROVIDER_MARK[provider];
  const label = PROVIDER_LABEL[provider];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,4,14,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-3xl overflow-hidden"
        style={{ background: "#12151c", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 70px rgba(0,0,0,0.7)" }}
      >
        <div className="px-6 pt-6 pb-5 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-11 h-11 rounded-full mx-auto flex items-center justify-center"
            style={{ background: mark.bg, color: provider === "apple" ? "#fff" : undefined }}>
            {mark.node}
          </div>
          <p className="text-white font-bold text-[16px] mt-3">Sign in with {label}</p>
          <p className="text-white/45 text-[13px] mt-1">to continue to ConnextionZ</p>
        </div>

        <div className="py-2">
          {PROVIDER_ACCOUNTS.map((acct) => (
            <button key={acct.email} onClick={() => onPick(acct)}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-white/5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#00AEEF,#0077cc)" }}>
                {acct.firstName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white text-[14px] font-semibold truncate">{acct.firstName} {acct.lastName}</p>
                <p className="text-white/40 text-[12px] truncate">{acct.email}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 pb-5 pt-1 space-y-3">
          <button onClick={onCancel}
            className="w-full py-3 rounded-full text-[14px] font-semibold text-white/70"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Cancel
          </button>
          <p className="text-[11px] leading-relaxed text-center text-white/30">
            Prototype chooser — no real {label} OAuth is performed.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}