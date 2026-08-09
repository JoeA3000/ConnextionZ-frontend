import { useState }                from 'react'
import { motion, AnimatePresence } from "motion/react"
import {
  AlertCircle, ArrowLeft, ArrowRight, 
  Eye, EyeOff, Lock, Mail, User
} from "lucide-react"
import {
  register, type Account
} from "../auth-store"

import { 
    Checkbox, GUTTER, H1, Input, 
    isValidEmail, SCREEN, TOP_PAD, 
    SUB 
} from "../Auth"

import Logo        from "./ui/Logo"
import PrimaryBtn  from "./ui/PrimaryBtn"

function CreateAccount({ onCreated, onLogin, onBack }: { onCreated: (account: Account) => void; onLogin: () => void; onBack: () => void }) {
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms]             = useState(false);
  const [marketing, setMarketing]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const valid = firstName && lastName && isValidEmail(email) && password.length >= 8 && confirmPw === password && terms;

  const handleCreate = async () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim())      errs.firstName = "First name is required";
    if (!lastName.trim())       errs.lastName  = "Last name is required";
    if (!isValidEmail(email))   errs.email     = "Enter a valid email address";
    if (password.length < 8)    errs.password  = "Password must be at least 8 characters";
    if (confirmPw !== password) errs.confirmPw = "Passwords do not match";
    if (!terms)                 errs.terms     = "You must accept the terms to continue";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    const result = await register({ firstName, lastName, email, password });
    setLoading(false);

    // Surface duplicate-email rejections instead of silently continuing.
    if (!result.ok) { setErrors({ general: result.error }); return; }
    onCreated(result.value);
  };

  const pwStrength    = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#22c55e"][pwStrength];
  const strengthLabel = ["", "Weak", "Good", "Strong"][pwStrength];

  return (
    <div className={`${SCREEN} overflow-y-auto lg:overflow-visible`}>
      <div className={`flex items-center justify-between px-6 ${TOP_PAD} pb-6 lg:pb-8 lg:px-0`}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,60,130,0.35)", border: "1px solid rgba(0,174,239,0.15)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="lg:hidden"><Logo size="sm" /></span>
        <div className="w-9" />
      </div>

      <div className={`${GUTTER} flex-1 space-y-5 pb-10 lg:pb-0`}>
        <div>
          <h1 className={H1}>Create account</h1>
          <p className={`${SUB} mt-1`}>Join thousands of creators</p>
        </div>

        <AnimatePresence>
          {errors.general && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-[13px]">{errors.general}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input label="First Name" value={firstName} onChange={setFirstName} placeholder="Maya"
              icon={<User className="w-4 h-4" />} error={errors.firstName} />
          </div>
          <div className="flex-1">
            <Input label="Last Name" value={lastName} onChange={setLastName} placeholder="Chen"
              icon={<User className="w-4 h-4" />} error={errors.lastName} />
          </div>
        </div>

        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />} error={errors.email} />

        <div className="space-y-2">
          <Input label="Password" type={showPw ? "text" : "password"} value={password} onChange={setPassword}
            placeholder="Min. 8 characters" icon={<Lock className="w-4 h-4" />} error={errors.password}
            rightEl={
              <button onClick={() => setShowPw((p) => !p)} className="text-white/40">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            } />
          {/* Strength meter */}
          {password.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: i <= pwStrength ? strengthColor : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
            </div>
          )}
        </div>

        <Input label="Confirm Password" type={showConfirm ? "text" : "password"} value={confirmPw} onChange={setConfirmPw}
          placeholder="Repeat password" icon={<Lock className="w-4 h-4" />} error={errors.confirmPw}
          rightEl={
            <button onClick={() => setShowConfirm((p) => !p)} className="text-white/40">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          } />

        <div className="space-y-3 pt-1">
          <Checkbox checked={terms} onChange={setTerms}>
            I agree to the <span style={{ color: "#00AEEF" }}>Terms of Service</span> and <span style={{ color: "#00AEEF" }}>Privacy Policy</span>
          </Checkbox>
          <Checkbox checked={marketing} onChange={setMarketing}>
            Send me creator tips, collab opportunities, and product updates
          </Checkbox>
          {errors.terms && <p className="text-red-400 text-[12px] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.terms}</p>}
        </div>

        <PrimaryBtn onClick={handleCreate} disabled={!valid} loading={loading}>
          Create Account <ArrowRight className="w-5 h-5" />
        </PrimaryBtn>

        <div className="text-center pb-4">
          <span className="text-white/40 text-[14px]">Already have an account? </span>
          <button onClick={onLogin} className="font-bold text-[14px]" style={{ color: "#00AEEF" }}>Log In</button>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount