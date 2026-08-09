import { Loader2 } from "lucide-react"
import { motion }  from "motion/react"

export default function PrimaryBtn({
  children, onClick, disabled, loading, full = true,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; full?: boolean }) {
  return (
    <motion.button
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${full ? "w-full" : ""} py-4 lg:py-[18px] rounded-full font-bold text-[16px] lg:text-[17px] text-black flex items-center justify-center gap-2 transition-opacity`}
      style={{
        background: disabled ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,#00AEEF,#38bdf8)",
        color: disabled ? "rgba(255,255,255,0.3)" : "#000",
        boxShadow: disabled ? "none" : "0 8px 24px rgba(0,174,239,0.4)",
        opacity: loading ? 0.85 : 1,
      }}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-white/70" /> : children}
    </motion.button>
  );
}