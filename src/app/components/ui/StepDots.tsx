import { motion, AnimatePresence } from "motion/react";

export default function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === step - 1 ? 28 : 8, opacity: i === step - 1 ? 1 : 0.35 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="h-2 rounded-full"
          style={{ background: "#00AEEF" }}
        />
      ))}
    </div>
  );
}