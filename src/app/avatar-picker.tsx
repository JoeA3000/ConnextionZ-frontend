// ─── AVATAR PICKER ───────────────────────────────────────────────────────────
//
// Pick → preview → confirm, as one component used by every screen that can set
// a profile image (Edit Profile, and the owner's profile header).
//
// The preview step is not decoration: the file the user chose is centre-cropped
// to a square and downscaled before it is stored, so the only honest way to ask
// "is this the picture you want?" is to show them the crop first. Nothing is
// saved until they confirm — the parent gets the processed data URL and decides
// when to persist it.

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { ACCENT, useTokens } from "./settings-ui";
import { Avatar } from "./profile-ui";
import {
  ACCEPT_ATTRIBUTE, ACCEPTED_LABEL, MAX_LABEL, OUTPUT_SIZE,
  type PickedImage, dataUrlBytes, formatBytes, readImageFile, toAvatarDataUrl,
} from "./avatar-upload";

export function AvatarPicker({
  avatarUrl, name, color, onChange, size = 84, disabled = false, busy = false,
  variant = "full",
}: {
  /** The currently staged image — "" when there is none. */
  avatarUrl: string;
  /** Drives the fallback initial while no photo is set. */
  name: string;
  color: string;
  /** Called with the processed data URL, or "" when the photo is removed. */
  onChange: (avatarUrl: string) => void;
  size?: number;
  disabled?: boolean;
  /** The parent is persisting the confirmed image — shows in the camera badge. */
  busy?: boolean;
  /**
   * "full" is the form treatment: avatar, upload/remove buttons and the limits.
   * "avatarOnly" is the profile header — just the avatar with its camera badge,
   * where the surrounding page already explains itself.
   */
  variant?: "full" | "avatarOnly";
}) {
  const isDark = useTheme();
  const t = useTokens(isDark);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  const openFilePicker = useCallback(() => {
    setError("");
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setReading(true);
    const result = await readImageFile(file);
    setReading(false);
    if (!result.ok) { setError(result.error); return; }
    setPicked(result.value);
  }, []);

  const trigger = (
    <button type="button" onClick={openFilePicker} disabled={disabled}
      aria-label={avatarUrl ? "Change profile photo" : "Add a profile photo"}
      className="relative rounded-full flex-shrink-0 transition-transform active:scale-95">
      <Avatar src={avatarUrl} name={name} color={color} size={size} ring ringColor={ACCENT} />
      <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg,${ACCENT},#0077cc)`,
          border: `2px solid ${isDark ? "#00091e" : "#f2f5fb"}`,
          boxShadow: "0 4px 14px rgba(0,174,239,0.45)",
        }}>
        {reading || busy ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
      </span>
    </button>
  );

  const fileInput = (
    // Stays mounted and hidden; `value` is cleared after every pick so choosing
    // the same file twice still fires a change event.
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT_ATTRIBUTE}
      className="hidden"
      onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; handleFile(file); }}
    />
  );

  const dialog = (
    <AnimatePresence>
      {picked && (
        <AvatarPreview
          key="avatar-preview"
          picked={picked}
          fallbackName={name}
          fallbackColor={color}
          onCancel={() => setPicked(null)}
          onPickAnother={() => { setPicked(null); openFilePicker(); }}
          onConfirm={(dataUrl) => { setPicked(null); onChange(dataUrl); }}
          onError={(message) => { setPicked(null); setError(message); }}
        />
      )}
    </AnimatePresence>
  );

  const errorLine = error && (
    <p className="flex items-start gap-1.5 text-[12px] mt-2.5 leading-snug" style={{ color: "#f87171" }} role="alert">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
    </p>
  );

  if (variant === "avatarOnly") {
    return (
      <div className="inline-flex flex-col">
        {trigger}
        {errorLine}
        {fileInput}
        {dialog}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        {trigger}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openFilePicker} disabled={disabled}
              className="px-3.5 h-9 rounded-full text-[13px] font-bold flex items-center gap-1.5"
              style={{ background: "rgba(0,174,239,0.14)", border: `1px solid ${ACCENT}55`, color: ACCENT }}>
              <ImagePlus className="w-3.5 h-3.5" />
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {avatarUrl && (
              <button type="button" onClick={() => { setError(""); onChange(""); }} disabled={disabled}
                className="px-3.5 h-9 rounded-full text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.32)", color: "#f87171" }}>
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
          <p className="text-[12px] mt-2 leading-relaxed" style={{ color: t.sub }}>
            {ACCEPTED_LABEL} up to {MAX_LABEL}. Cropped to a square and saved at {OUTPUT_SIZE}×{OUTPUT_SIZE}.
          </p>
        </div>
      </div>

      {errorLine}
      {fileInput}
      {dialog}
    </>
  );
}

// ─── PREVIEW DIALOG ──────────────────────────────────────────────────────────
//
// `fixed` rather than `absolute`: this opens from inside scrolling containers
// (the Edit Profile form, the profile header) and must not be clipped by them.

function AvatarPreview({
  picked, fallbackName, fallbackColor, onCancel, onPickAnother, onConfirm, onError,
}: {
  picked: PickedImage;
  fallbackName: string;
  fallbackColor: string;
  onCancel: () => void;
  onPickAnother: () => void;
  onConfirm: (dataUrl: string) => void;
  onError: (message: string) => void;
}) {
  const isDark = useTheme();
  const t = useTokens(isDark);
  const [processing, setProcessing] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const confirm = async () => {
    setProcessing(true);
    const result = await toAvatarDataUrl(picked);
    setProcessing(false);
    if (!result.ok) { onError(result.error); return; }
    onConfirm(result.value);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-5" role="dialog" aria-modal="true"
      aria-label="Preview profile photo">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        onClick={onCancel} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-[360px] rounded-3xl overflow-hidden"
        style={{ background: isDark ? "#0b1020" : "#ffffff", border: t.cardBorder, boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="font-extrabold text-[16px]" style={{ color: t.heading }}>Preview photo</p>
          <button onClick={onCancel} aria-label="Cancel"
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: t.chipBg }}>
            <X className="w-3.5 h-3.5" style={{ color: t.sub }} />
          </button>
        </div>

        <div className="px-5 pb-1 flex flex-col items-center gap-4">
          {/* Round preview shows the exact centre crop that will be saved… */}
          <div className="rounded-full overflow-hidden flex-shrink-0"
            style={{ width: 148, height: 148, border: `3px solid ${ACCENT}`, boxShadow: `0 10px 30px ${ACCENT}44` }}>
            <img src={picked.dataUrl} alt="Selected profile photo" className="w-full h-full object-cover" />
          </div>

          {/* …and the row underneath shows how it reads at the sizes it will
              actually appear at across the app. */}
          <div className="flex items-end gap-3">
            {[44, 32, 24].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <Avatar src={picked.dataUrl} name={fallbackName} color={fallbackColor} size={s} />
                <span className="text-[9px]" style={{ color: t.sub }}>{s === 44 ? "feed" : s === 32 ? "comments" : "messages"}</span>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-center leading-snug" style={{ color: t.sub }}>
            {picked.width}×{picked.height} · {formatBytes(picked.bytes)}
            {picked.width !== picked.height && " · will be cropped to a square"}
          </p>
        </div>

        <div className="px-5 pt-4 pb-5 space-y-2">
          <motion.button ref={confirmRef} whileTap={processing ? {} : { scale: 0.97 }} onClick={confirm} disabled={processing}
            className="w-full h-12 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 text-white"
            style={{ background: `linear-gradient(135deg,${ACCENT},#0077cc)`, boxShadow: "0 8px 24px rgba(0,174,239,0.35)", opacity: processing ? 0.75 : 1 }}>
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : "Use this photo"}
          </motion.button>
          <button onClick={onPickAnother} disabled={processing}
            className="w-full h-11 rounded-full font-semibold text-[14px]"
            style={{ background: t.chipBg, border: t.chipBorder, color: t.sub }}>
            Choose a different photo
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** Byte size of a staged avatar, for the "saved as" hint on Edit Profile. */
export const stagedAvatarSize = (dataUrl: string) => (dataUrl ? formatBytes(dataUrlBytes(dataUrl)) : "");
