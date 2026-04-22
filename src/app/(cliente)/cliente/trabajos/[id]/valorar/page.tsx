"use client";
import { use, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { jobs, professionals } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

const TAGS = [
  "Puntual",
  "Profesional",
  "Buen precio",
  "Limpio",
  "Amable",
  "Comunicativo",
  "Experto",
  "Rápido",
];

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const pro = job.assignedProId
    ? professionals.find((p) => p.id === job.assignedProId) ?? professionals[0]
    : professionals[0];
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const submit = () => {
    setSent(true);
    setTimeout(() => router.push(`/cliente/trabajos/${id}`), 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Valorar profesional" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 text-center">
          <Avatar initials={pro.avatar} size={64} className="mx-auto mb-2" />
          <div className="font-extrabold text-[16px] text-ink-800">{pro.name}</div>
          <div className="text-[12px] text-ink-500 mb-3">{pro.specialty}</div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                className="text-[36px] leading-none transition"
                aria-label={`${s} estrella${s === 1 ? "" : "s"}`}
              >
                <span className={rating >= s ? "text-amber-400" : "text-sand-200"}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <div className="text-[12px] text-ink-400">
            {rating === 0
              ? "Pulsa una estrella"
              : rating === 5
              ? "Excelente"
              : rating === 4
              ? "Muy bien"
              : rating === 3
              ? "Correcto"
              : rating === 2
              ? "Regular"
              : "Mal"}
          </div>
        </Card>

        <Card className="mb-3">
          <div className="text-[12.5px] font-bold text-ink-700 mb-2">
            Lo que más destacas (opcional)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => {
              const sel = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] transition ${
                    sel
                      ? "border-coral-500 bg-coral-50 text-coral-700"
                      : "border-sand-200 text-ink-500 bg-white"
                  }`}
                >
                  {sel && <Icon name="check" size={10} stroke={3} className="inline mr-1" />}
                  {t}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="mb-3">
          <Textarea
            label="Reseña pública (opcional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cuenta a otros clientes cómo fue tu experiencia con este profesional."
            rows={4}
          />
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={submit} disabled={rating === 0 || sent}>
          {sent ? "Gracias por tu valoración ✓" : "Publicar valoración"}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div />}>
      <Inner id={id} />
    </Suspense>
  );
}
