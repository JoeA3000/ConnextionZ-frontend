import { ArrowRight } from "lucide-react"

import GetStartedHero from "./GetStartedHero"
import GhostBtn       from "./ui/GhostBtn"
import PrimaryBtn     from "./ui/PrimaryBtn"

export default function GetStarted({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) {
  return (
    <>
      {/* Mobile / tablet: full-bleed hero with the CTA docked to the bottom. */}
      <div className="flex flex-col h-full lg:hidden">
        <GetStartedHero onGetStarted={onGetStarted} onLogin={onLogin} />
      </div>

      {/* Desktop: the hero lives in the brand panel, so this column carries the copy + CTA. */}
      <div className="hidden lg:flex flex-col gap-8">
        <div>
          <h1 className="text-white font-extrabold text-[40px] leading-[1.1] tracking-tight">
            Get started
          </h1>
          <p className="text-white/50 text-[16px] leading-relaxed mt-3">
            Join thousands of creators finding their next collaboration on ConnextionZ.
          </p>
        </div>

        <div className="space-y-4">
          <PrimaryBtn onClick={onGetStarted}>
            Create Account <ArrowRight className="w-5 h-5" />
          </PrimaryBtn>
          <GhostBtn onClick={onLogin}>Log In</GhostBtn>
        </div>

        <p className="text-white/30 text-[13px] leading-relaxed">
          By continuing you agree to our{" "}
          <span style={{ color: "#00AEEF" }}>Terms of Service</span> and{" "}
          <span style={{ color: "#00AEEF" }}>Privacy Policy</span>.
        </p>
      </div>
    </>
  );
}