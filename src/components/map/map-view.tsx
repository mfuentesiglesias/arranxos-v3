import { cn } from "@/lib/utils";

export interface MapPin {
  id: string;
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  label: string;
  type?: "coral" | "teal" | "amber" | "ink";
  exact?: boolean;
}

interface Props {
  height?: number;
  pins?: MapPin[];
  blurred?: boolean;
  className?: string;
  radiusKm?: number;
  showRadius?: boolean;
  radiusLabel?: string;
  onPinClick?: (pin: MapPin) => void;
  selectedPinId?: string;
}

// DEMO: simulated map. In production, replace with MapLibre GL / Leaflet
// bound to Supabase PostGIS data.
export function MapView({
  height = 200,
  pins = [],
  blurred = false,
  className,
  radiusKm = 0,
  showRadius = false,
  radiusLabel = "Radio aprox.",
  onPinClick,
  selectedPinId,
}: Props) {
  const clampedRadiusKm = Math.max(5, Math.min(100, radiusKm || 5));
  const radiusScale = Math.sqrt(clampedRadiusKm / 100);
  const radiusPx = 16 + radiusScale * height * 0.38;

  return (
    <div
      className={cn("relative rounded-2xl overflow-hidden bg-sand-100", className)}
      style={{ height }}
    >
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <pattern id="gridP" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(38,35,28,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#F4F2EE" />
        <rect width="100%" height="100%" fill="url(#gridP)" />
        <ellipse cx="40%" cy="45%" rx="22%" ry="14%" fill="rgba(47,146,121,0.12)" />
        <ellipse cx="70%" cy="60%" rx="16%" ry="10%" fill="rgba(47,146,121,0.10)" />
        {showRadius && !blurred && (
          <>
            <circle
              cx="52%"
              cy="56%"
              r={radiusPx}
              fill="rgba(255, 90, 95, 0.10)"
              stroke="rgba(255, 90, 95, 0.42)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <circle
              cx="52%"
              cy="56%"
              r="6"
              fill="rgba(255,255,255,0.95)"
              stroke="rgba(255, 90, 95, 0.85)"
              strokeWidth="3"
            />
          </>
        )}
        <path
          d="M0,60 Q40,50 80,65 T160,55 T250,60 T390,65"
          stroke="rgba(61,124,201,0.35)"
          strokeWidth="3"
          fill="none"
        />
        <rect x="15%" y="30%" width="12%" height="4%" rx="2" fill="rgba(255,255,255,0.6)" />
        <rect x="55%" y="50%" width="18%" height="4%" rx="2" fill="rgba(255,255,255,0.6)" />
        <rect x="30%" y="55%" width="8%" height="4%" rx="2" fill="rgba(255,255,255,0.6)" />
      </svg>

      {blurred && (
        <div className="absolute inset-0 backdrop-blur-md bg-sand-50/40 flex flex-col items-center justify-center gap-1.5 text-center px-6">
          <div className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-ink-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-ink-700">Ubicación aproximada</span>
          <span className="text-[11px] text-ink-400 leading-snug max-w-[220px]">
            La ubicación exacta se revela tras la aceptación del profesional
          </span>
        </div>
      )}

      {showRadius && !blurred && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: "52%", top: "56%" }}
        >
          <div className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-coral-700 shadow-card whitespace-nowrap border border-coral-100">
            {radiusLabel}
          </div>
        </div>
      )}

      {!blurred &&
        pins.map((pin) => {
          const isSelected = selectedPinId === pin.id;
          const color =
            pin.type === "teal"
              ? "bg-teal-500"
              : pin.type === "amber"
              ? "bg-amber-500"
              : pin.type === "ink"
              ? "bg-ink-800"
              : "bg-coral-500";
          const content = (
            <>
              <div
                className={cn(
                  "text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-card whitespace-nowrap transition",
                  color,
                  isSelected && "scale-[1.04] ring-2 ring-white/90 ring-offset-2 ring-offset-coral-300",
                )}
              >
                {pin.label}
              </div>
              <div
                className={cn(
                  "w-2 h-2 mx-auto rotate-45 -mt-1 transition",
                  color,
                  isSelected && "scale-110",
                )}
              />
            </>
          );

          return (
            <div
              key={pin.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-full",
                isSelected && "z-20",
              )}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              data-testid={`map-pin-${pin.id}`}
            >
              {onPinClick ? (
                <button
                  type="button"
                  onClick={() => onPinClick(pin)}
                  aria-label={`Ver trabajo ${pin.label}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100 rounded-lg"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </div>
          );
        })}
    </div>
  );
}
