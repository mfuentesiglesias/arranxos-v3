"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AntiLeakAlert } from "@/components/chat/anti-leak-alert";
import { Icon } from "@/components/ui/icon";
import { jobs, defaultAdminConfig } from "@/lib/data";
import { formatEuro } from "@/lib/utils";
import { hasLeak, scanLeaks } from "@/lib/anti-leak";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const suggested = Math.round((job.priceMin + job.priceMax) / 2);
  const [price, setPrice] = useState(String(suggested));
  const [eta, setEta] = useState("Esta semana");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const leaks = message ? scanLeaks(message) : [];
  const commission = Math.round(
    (Number(price || 0) * defaultAdminConfig.commissionPct) / 100,
  );
  const youGet = Number(price || 0) - commission;

  const canSend =
    price && message.length > 20 && !hasLeak(message);

  const send = () => {
    setSending(true);
    setTimeout(() => router.push(`/profesional/trabajos/${id}?requested=1`), 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Enviar solicitud" subtitle={job.title} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 bg-coral-50 border-coral-100">
          <div className="font-bold text-[13px] text-coral-700 mb-1">
            Tip: describe bien tu propuesta
          </div>
          <div className="text-[12px] text-coral-700/80 leading-snug">
            Los clientes eligen antes a profesionales que explican qué harán,
            cuánto tardarán y qué incluye el precio.
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex flex-col gap-4">
            <Input
              label="Tu precio propuesto (€)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              note={`Orientativo cliente: ${formatEuro(job.priceMin)}–${formatEuro(job.priceMax)}`}
            />

            <div>
              <div className="text-[12.5px] font-bold text-ink-700 mb-2">
                ¿Cuándo puedes hacerlo?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Hoy mismo", "Mañana", "Esta semana", "Próxima semana", "A convenir"].map(
                  (opt) => {
                    const sel = eta === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setEta(opt)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] ${
                          sel
                            ? "border-coral-500 bg-coral-50 text-coral-700"
                            : "border-sand-200 text-ink-500 bg-white"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <Textarea
              label="Mensaje al cliente"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Preséntate brevemente y explica qué harás, qué incluye el precio y si necesitas más información."
              rows={5}
              note="Mínimo 20 caracteres. Sin teléfonos ni emails: eso se comparte al aceptar."
            />
            {leaks.length > 0 && <AntiLeakAlert leaks={leaks} />}
          </div>
        </Card>

        <Card className="bg-sand-50 mb-3">
          <div className="font-bold text-[12.5px] text-ink-700 mb-2">
            Desglose si el cliente acepta
          </div>
          <div className="flex items-center justify-between text-[12.5px] mb-1">
            <span className="text-ink-500">Precio acordado</span>
            <span className="font-bold text-ink-800">{formatEuro(Number(price || 0))}</span>
          </div>
          <div className="flex items-center justify-between text-[12.5px] mb-1">
            <span className="text-ink-500">
              Comisión Arranxos ({defaultAdminConfig.commissionPct}%)
            </span>
            <span className="font-bold text-ink-800">−{formatEuro(commission)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] border-t border-sand-200 pt-2 mt-1">
            <span className="font-bold text-ink-800">Recibes</span>
            <span className="font-extrabold text-teal-600">{formatEuro(youGet)}</span>
          </div>
        </Card>

        <div className="flex items-center gap-2 text-[11px] text-ink-400 justify-center">
          <Icon name="shield" size={14} />
          Puedes ajustar el precio luego con el cliente en el chat
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={send} disabled={!canSend || sending}>
          {sending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <Inner id={id} />;
}
