import { ArrowRight } from "lucide-react"
import Logo           from "./ui/Logo"
import PrimaryBtn     from "./ui/PrimaryBtn"

export default function GetStartedHero({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=800&fit=crop&auto=format"
          alt="Creator making content"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,8,30,0.25) 0%, rgba(0,20,60,0.55) 50%, #000d1f 100%)" }} />

        {/* Top logo */}
        <div className="absolute top-14 left-6">
          <Logo />
        </div>

        {/* Badge */}
        <div className="absolute top-14 right-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,174,239,0.55)", border: "1.5px solid rgba(56,189,248,0.9)", boxShadow: "0 0 16px rgba(0,174,239,0.7), 0 0 32px rgba(0,174,239,0.3)" }}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ boxShadow: "0 0 6px #fff" }} />
            <span className="text-white text-[11px] font-extrabold tracking-wide">10K+ Creators</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="absolute bottom-8 left-6 right-6">
          <h1 className="text-white font-extrabold text-[36px] leading-tight mb-2">
            Where creators<br />
            <span style={{ color: "#00AEEF" }}>collaborate</span>
          </h1>
          <p className="text-white/60 text-[15px] leading-relaxed">
            Discover creators, send collab requests, and build your brand — together.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 pt-6 space-y-4" style={{ background: "linear-gradient(180deg, #000d1f 0%, #000a18 100%)" }}>
        <PrimaryBtn onClick={onGetStarted}>
          Get Started <ArrowRight className="w-5 h-5" />
        </PrimaryBtn>
        <div className="text-center">
          <span className="text-white/40 text-[14px]">Already have an account? </span>
          <button onClick={onLogin} className="font-bold text-[14px]" style={{ color: "#00AEEF" }}>Log In</button>
        </div>
      </div>
    </div>
  );
}