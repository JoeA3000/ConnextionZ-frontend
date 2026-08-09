import { Loader2 } from "lucide-react"
import { motion }  from "motion/react"

export default function SocialBtn({
  icon, label, onClick, busy, disabled,
}: { icon: React.ReactNode; label: string; onClick?: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={disabled || busy ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={`Continue with ${label}`}
      className="flex-1 py-3.5 lg:py-4 rounded-2xl font-semibold text-[14px] lg:text-[15px] text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
      style={{ background: "rgba(0,60,130,0.25)", border: "1px solid rgba(0,174,239,0.2)" }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon} {label}
    </motion.button>
  );
}