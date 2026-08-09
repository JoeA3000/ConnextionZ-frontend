import { motion, AnimatePresence } from "motion/react";
import {
  Zap, TrendingUp, Users
} from "lucide-react";

import { Screen } from "../Auth"
import Logo       from "./ui/Logo"

// ─── DESKTOP BRAND PANEL ─────────────────────────────────────────────────────
// Only rendered from `lg` up. It absorbs the horizontal space that used to be
// dead margin (or stretched form fields), and carries the hero art that the
// mobile Get Started screen shows full-bleed.

const HERO_IMG =
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1000&h=1300&fit=crop&auto=format";

const PANEL_COPY: Record<Screen, { title: React.ReactNode; sub: string }> = {
  getStarted: {
    title: <>Where creators<br /><span style={{ color: "#00AEEF" }}>collaborate</span></>,
    sub: "Discover creators, send collab requests, and build your brand — together.",
  },
  login: {
    title: <>Welcome back to<br />the <span style={{ color: "#00AEEF" }}>collab floor</span></>,
    sub: "Your requests, matches and drafts are exactly where you left them.",
  },
  createAccount: {
    title: <>Start collabing<br /><span style={{ color: "#00AEEF" }}>this week</span></>,
    sub: "Set up your creator profile once — then let the right partners find you.",
  },
  forgotPassword: {
    title: <>Locked out?<br /><span style={{ color: "#00AEEF" }}>No problem</span></>,
    sub: "We'll email you a secure link so you can get straight back to creating.",
  },
  resetSent: {
    title: <>Check your inbox<br /><span style={{ color: "#00AEEF" }}>and jump back in</span></>,
    sub: "The reset link lands in seconds and stays valid for 15 minutes.",
  },
  resetPassword: {
    title: <>Pick a password<br /><span style={{ color: "#00AEEF" }}>worth keeping</span></>,
    sub: "Once it's updated the old password stops working everywhere.",
  },
  onboarding: {
    title: <>Let's tune your<br /><span style={{ color: "#00AEEF" }}>collab feed</span></>,
    sub: "A few quick picks and we'll surface the creators worth your time.",
  },
};

const PANEL_FEATURES = [
  { icon: Users, text: "Browse creators by niche, reach and Collab Score" },
  { icon: Zap, text: "Send a collab request in a single tap" },
  { icon: TrendingUp, text: "Track every partnership from one dashboard" },
];

export default function BrandPanel({ screen }: { screen: Screen }) {
  const copy = PANEL_COPY[screen];
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14">
      {/* Hero art */}
      <img src={HERO_IMG} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(150deg, rgba(0,9,30,0.72) 0%, rgba(0,20,60,0.82) 45%, rgba(0,8,24,0.95) 100%)" }}
      />
      {/* Brand glow */}
      <div
        className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,174,239,0.28) 0%, transparent 70%)" }}
      />

      {/* Top row: logo + social proof */}
      <div className="relative flex items-center justify-between gap-4">
        <Logo size="xl" />
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            background: "rgba(0,174,239,0.55)",
            border: "1.5px solid rgba(56,189,248,0.9)",
            boxShadow: "0 0 16px rgba(0,174,239,0.7), 0 0 32px rgba(0,174,239,0.3)",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ boxShadow: "0 0 6px #fff" }} />
          <span className="text-white text-[11px] font-extrabold tracking-wide">10K+ Creators</span>
        </div>
      </div>

      {/* Rotating headline */}
      <div className="relative max-w-[520px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
          >
            <h2 className="text-white font-extrabold text-[44px] xl:text-[54px] leading-[1.08] tracking-tight">
              {copy.title}
            </h2>
            <p className="text-white/60 text-[16px] xl:text-[17px] leading-relaxed mt-4">{copy.sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feature list */}
      <div className="relative space-y-3.5 max-w-[460px]">
        {PANEL_FEATURES.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,174,239,0.15)", border: "1px solid rgba(0,174,239,0.3)" }}
            >
              <Icon className="w-4 h-4" style={{ color: "#00AEEF" }} />
            </div>
            <span className="text-white/60 text-[14px] xl:text-[15px]">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}