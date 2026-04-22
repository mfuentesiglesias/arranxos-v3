"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { RatingStars } from "@/components/pros/rating-stars";
import { StrikeBadge } from "@/components/pros/strike-badge";
import { currentPro, reviews, defaultAdminConfig } from "@/lib/data";
import { useSession } from "@/lib/store";

export default function PerfilProPage() {
  const router = useRouter();
  const reset = useSession((s) => s.reset);
  const myReviews = reviews
    .filter((r) => r.targetId === "p1")
    .slice(0, 3);

  const sections: { label: string; icon: string; href?: string; danger?: boolean; onClick?: () => void }[][] = [
    [
      { label: "Editar perfil público", icon: "edit", href: "#" },
      { label: "Especialidades y zonas", icon: "pin", href: "#" },
      { label: "Cuenta bancaria", icon: "card", href: "#" },
    ],
    [
      { label: "Verificación de identidad", icon: "shield", href: "#" },
      { label: "Notificaciones", icon: "bell", href: "#" },
      { label: "Idioma y región", icon: "layers", href: "#" },
    ],
    [
      { label: "Centro de ayuda", icon: "info", href: "#" },
      { label: "Términos y privacidad", icon: "file", href: "#" },
    ],
    [
      {
        label: "Cerrar sesión",
        icon: "back",
        danger: true,
        onClick: () => {
          reset();
          router.push("/welcome");
        },
      },
    ],
  ];

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="bg-white border-b border-sand-200/70 px-5 pt-2 pb-3 flex items-center justify-between">
        <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
          Mi perfil
        </h1>
        <button className="w-9 h-9 rounded-full bg-sand-100 flex items-center justify-center">
          <Icon name="settings" size={16} />
        </button>
      </div>

      <ScreenBody className="px-4 pt-4 pb-6">
        <Card className="mb-3">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative">
              <Avatar initials={currentPro.avatar} size={68} />
              {currentPro.verified && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[17px] text-ink-900 truncate">
                {currentPro.name}
              </div>
              <div className="text-[12.5px] text-ink-500">
                {currentPro.specialty} · {currentPro.location}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <RatingStars value={currentPro.rating} />
                <span className="text-[12px] font-bold text-ink-800">
                  {currentPro.rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-ink-400">
                  ({currentPro.reviews})
                </span>
              </div>
              {currentPro.badge && (
                <span className="inline-block mt-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {currentPro.badge}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Trabajos", currentPro.jobs],
              ["Fiabilidad", `${currentPro.reliability}%`],
              ["Respuesta", currentPro.responseTime],
            ].map(([l, v]) => (
              <div
                key={String(l)}
                className="rounded-xl bg-sand-50 border border-sand-200/70 py-2.5"
              >
                <div className="font-extrabold text-[14px] text-ink-900">{v}</div>
                <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wide">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-[13px] text-ink-800">
              Reputación interna
            </div>
            <StrikeBadge strikes={currentPro.strikes ?? 0} />
          </div>
          <div className="text-[12px] text-ink-500 leading-snug">
            {currentPro.strikes === 0
              ? "Sin incidencias. Sigue así."
              : `Tienes ${currentPro.strikes} strike${currentPro.strikes === 1 ? "" : "s"} acumulados. Al alcanzar ${defaultAdminConfig.strikeAutoBlockThreshold}, la cuenta puede ser revisada por admin.`}
          </div>
        </Card>

        {currentPro.bio && (
          <Card className="mb-3">
            <div className="font-bold text-[13px] text-ink-800 mb-2">
              Sobre mí
            </div>
            <div className="text-[13px] text-ink-600 leading-relaxed">
              {currentPro.bio}
            </div>
          </Card>
        )}

        {myReviews.length > 0 && (
          <Card className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[13px] text-ink-800">
                Reseñas recientes
              </div>
              <Link href="#" className="text-[12px] text-coral-600 font-bold">
                Ver todas
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {myReviews.map((r) => (
                <div
                  key={r.id}
                  className="border-t border-sand-200/70 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar initials={r.avatar} size={28} />
                    <div className="font-bold text-[12.5px] text-ink-800">
                      {r.author}
                    </div>
                    <span className="text-[10.5px] text-ink-400 ml-auto">
                      {r.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <RatingStars value={r.rating} />
                  </div>
                  <div className="text-[12px] text-ink-600 leading-snug">
                    {r.text}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {sections.map((group, idx) => (
          <Card key={idx} className="mb-3 !p-0 overflow-hidden">
            {group.map((item, i) => {
              const content = (
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 active:bg-sand-50 ${
                    i !== group.length - 1
                      ? "border-b border-sand-200/70"
                      : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.danger
                        ? "bg-rose-50 text-rose-600"
                        : "bg-sand-100 text-ink-600"
                    }`}
                  >
                    <Icon name={item.icon} size={14} />
                  </div>
                  <span
                    className={`flex-1 text-[13.5px] font-semibold ${
                      item.danger ? "text-rose-600" : "text-ink-800"
                    }`}
                  >
                    {item.label}
                  </span>
                  {!item.danger && (
                    <Icon name="forward" size={14} className="text-ink-400" />
                  )}
                </div>
              );
              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                );
              }
              return (
                <Link key={item.label} href={item.href ?? "#"}>
                  {content}
                </Link>
              );
            })}
          </Card>
        ))}

        <div className="text-center text-[11px] text-ink-400 pt-2">
          Arranxos · v1.0 · DEMO
        </div>
      </ScreenBody>
    </div>
  );
}
