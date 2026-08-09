import type { ReactNode }           from "react";
import { motion, AnimatePresence }  from "motion/react";
import { Check, AlertCircle }       from "lucide-react";

// Shared auth-flow types, layout tokens and form primitives.
//
// This module is a leaf: it imports nothing from `Auth.tsx` or from any screen
// under `components/`. Keeping it that way is what stops `Auth.tsx` ⇄ screen
// import cycles from forming — a cycle would work until the first screen
// derived a top-level constant from one of these tokens, and would then fail
// at runtime with a temporal-dead-zone ReferenceError and no build warning.

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type Screen =
  | "getStarted"
  | "login"
  | "createAccount"
  | "forgotPassword"
  | "resetSent"
  | "resetPassword"
  | "onboarding";

export type OnbStep = 1 | 2 | 3;

// ─── RESPONSIVE LAYOUT TOKENS ────────────────────────────────────────────────
// Mobile/tablet (< lg) keeps the verified Figma proportions untouched.
// From `lg` (1024px) up, the auth flow becomes a two-column desktop layout:
// a brand panel on the left and this content column on the right, so screens
// stop stretching edge-to-edge on wide viewports.

/** Screen root: fills the frame on mobile, becomes an auto-height column on desktop. */
export const SCREEN = "flex flex-col h-full lg:h-auto";
/** Horizontal gutter — the desktop shell supplies its own padding. */
export const GUTTER = "px-6 lg:px-0";
/** Status-bar offset, only meaningful on mobile. */
export const TOP_PAD = "pt-14 lg:pt-0";
/** Page heading. */
export const H1 = "text-white font-extrabold text-[30px] lg:text-[36px] leading-tight";
/** Sub-heading under an H1. */
export const SUB = "text-white/45 text-[15px] lg:text-[16px]";

// ─── INPUT ───────────────────────────────────────────────────────────────────

interface InputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  icon?: ReactNode;
  rightEl?: ReactNode;
  autoFocus?: boolean;
}

export function Input({ label, type = "text", value, onChange, placeholder, error, icon, rightEl, autoFocus }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-white/50 text-[12px] font-semibold uppercase tracking-widest px-1">{label}</p>}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={[
            "w-full rounded-2xl text-white text-[15px] lg:text-[16px] outline-none transition-all placeholder:text-white/25",
            "py-3.5 lg:py-4",
            icon ? "pl-11" : "pl-4",
            rightEl ? "pr-12" : "pr-4",
          ].join(" ")}
          style={{
            background: "rgba(0,80,160,0.12)",
            border: error ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(0,174,239,0.18)",
          }}
          onFocus={(e) => { e.target.style.border = `1px solid rgba(0,174,239,0.5)`; }}
          onBlur={(e) => { e.target.style.border = error ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(0,174,239,0.18)"; }}
        />
        {rightEl && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightEl}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-red-400 text-[12px] flex items-center gap-1 px-1"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CHECKBOX ────────────────────────────────────────────────────────────────

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <motion.div
        animate={{ background: checked ? "#00AEEF" : "rgba(0,60,130,0.3)", borderColor: checked ? "#00AEEF" : "rgba(0,174,239,0.3)" }}
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border"
        style={{ border: "1.5px solid rgba(0,174,239,0.3)" }}
      >
        <AnimatePresence>
          {checked && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", damping: 16 }}>
              <Check className="w-3 h-3 text-black" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <span className="text-white/60 text-[13px] leading-relaxed">{children}</span>
    </button>
  );
}

// ─── EMAIL VALIDATION ────────────────────────────────────────────────────────
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
