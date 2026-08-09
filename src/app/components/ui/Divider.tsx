export default function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/30 text-[12px] font-medium">or</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}