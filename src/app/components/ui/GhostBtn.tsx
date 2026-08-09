import { motion, AnimatePresence } from "motion/react";

export default function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full py-3.5 lg:py-4 rounded-full font-semibold text-[15px] lg:text-[16px] text-white/70 flex items-center justify-center gap-2"
      style={{ background: "rgba(0,60,130,0.25)", border: "1px solid rgba(0,174,239,0.2)" }}
    >
      {children}
    </motion.button>
  );
}