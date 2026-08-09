export default function Logo({ size = "lg" }: { size?: "sm" | "lg" | "xl" }) {
  const cls = size === "xl" ? "text-3xl xl:text-4xl" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <span className={`font-extrabold tracking-tight ${cls} text-white`}>
      Connext<span style={{ color: "#00AEEF" }}>ion</span>Z
    </span>
  );
}