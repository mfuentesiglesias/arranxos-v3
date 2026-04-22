"use client";
import { use, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { jobs } from "@/lib/data";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const total = Math.round((job.priceMin + job.priceMax) / 2);
  const [method, setMethod] = useState<"card" | "bizum" | "transfer">("card");
  const [paying, setPaying] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", mmyy: "", cvc: "" });

  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      router.push(`/cliente/trabajos/${id}?paid=1`);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Pagar con custodia" subtitle="Tu dinero está protegido" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-teal-50/50 border-teal-100 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Icon name="shield" size={18} />
            </div>
            <div>
              <div className="font-bold text-[14px] text-teal-700">
                {formatEuro(total)} en custodia
              </div>
              <div className="text-[11.5px] text-teal-700/80 leading-snug">
                Retenemos el pago. Se libera cuando confirmes el trabajo.
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-3">
          <div className="font-bold text-[13px] text-ink-700 mb-2 px-1">
            Método de pago
          </div>
          <div className="flex flex-col gap-2">
            {(
              [
                { id: "card", label: "Tarjeta", icon: "card" },
                { id: "bizum", label: "Bizum", icon: "phone" },
                { id: "transfer", label: "Transferencia bancaria", icon: "euro" },
              ] as const
            ).map((m) => {
              const sel = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px] transition text-left ${
                    sel
                      ? "border-coral-500 bg-coral-50"
                      : "border-sand-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      sel ? "bg-coral-500 text-white" : "bg-sand-100 text-ink-600"
                    }`}
                  >
                    <Icon name={m.icon} size={16} />
                  </div>
                  <span className="font-bold text-[13.5px] text-ink-800 flex-1">
                    {m.label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${
                      sel
                        ? "border-coral-500 bg-coral-500"
                        : "border-sand-300"
                    }`}
                  >
                    {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {method === "card" && (
          <Card className="mb-3">
            <div className="flex flex-col gap-3">
              <Input
                label="Número de tarjeta"
                value={card.number}
                onChange={(e) =>
                  setCard({ ...card, number: e.target.value })
                }
                placeholder="1234 5678 9012 3456"
              />
              <Input
                label="Titular"
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                placeholder="Antía Bouzas"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="MM/AA"
                  value={card.mmyy}
                  onChange={(e) => setCard({ ...card, mmyy: e.target.value })}
                  placeholder="12/28"
                />
                <Input
                  label="CVC"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                  placeholder="123"
                />
              </div>
            </div>
          </Card>
        )}

        {method === "bizum" && (
          <Card className="mb-3 text-[12.5px] text-ink-600 leading-relaxed">
            Recibirás una notificación Bizum de Arranxos para autorizar el pago.
            El dinero pasará a tu custodia y se liberará al profesional al
            confirmar el trabajo.
          </Card>
        )}
        {method === "transfer" && (
          <Card className="mb-3 text-[12.5px] text-ink-600 leading-relaxed">
            Te enviaremos los datos bancarios de la cuenta de custodia. El
            trabajo iniciará cuando se reciba el importe (habitualmente 1
            laborable).
          </Card>
        )}

        <div className="text-[11px] text-ink-400 leading-relaxed text-center">
          DEMO: ningún cargo real se realiza. Para producción, integrar Stripe/
          Redsys + webhook de confirmación.
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={pay} disabled={paying}>
          {paying ? "Procesando…" : `Pagar ${formatEuro(total)} en custodia`}
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
