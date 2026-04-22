import { Icon } from "@/components/ui/icon";

export function VerifiedDot({ size = 16 }: { size?: number }) {
  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center text-white"
      style={{ width: size, height: size }}
    >
      <Icon name="check" size={size * 0.55} stroke={3} />
    </div>
  );
}
