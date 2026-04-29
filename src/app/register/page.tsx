"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ScreenBody } from "@/components/layout/screen-body";
import { Icon } from "@/components/ui/icon";
import { getSeedCatalogServices } from "@/lib/catalog";
import { useSession } from "@/lib/store";
import type { CatalogService } from "@/lib/types";

const catalogServices = getSeedCatalogServices();

function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setRole = useSession((s) => s.setRole);
  const setProStatus = useSession((s) => s.setProStatus);
  const [isPro, setIsPro] = useState(params.get("role") === "professional");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialty: "",
    zone: "Vigo",
    dni: "",
  });
  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [loading, setLoading] = useState(false);
  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState<CatalogService[]>([]);
  const [specialtyError, setSpecialtyError] = useState(false);

  const query = normalizeSearchText(specialtyQuery.trim());
  const suggestedServices = catalogServices
    .filter(
      (service) =>
        !selectedServices.some((selected) => selected.id === service.id),
    )
    .filter((service) => {
      if (!query) return true;

      const haystack = [
        service.name,
        service.categoryName,
        ...(service.aliases ?? []),
      ]
        .map(normalizeSearchText)
        .join(" ");

      return haystack.includes(query);
    })
    .slice(0, query ? 8 : 6);

  const syncSelectedServices = (nextSelected: CatalogService[]) => {
    setSelectedServices(nextSelected);
    setForm((current) => ({
      ...current,
      specialty: nextSelected[0]?.name ?? "",
    }));

    if (nextSelected.length > 0) {
      setSpecialtyError(false);
    }
  };

  const addService = (service: CatalogService) => {
    if (selectedServices.some((selected) => selected.id === service.id)) return;
    syncSelectedServices([...selectedServices, service]);
    setSpecialtyQuery("");
  };

  const removeService = (serviceId: string) => {
    syncSelectedServices(
      selectedServices.filter((service) => service.id !== serviceId),
    );
  };

  const submit = () => {
    if (isPro && selectedServices.length === 0) {
      setSpecialtyError(true);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      if (isPro) {
        setRole("professional");
        setProStatus("pending");
        router.push("/profesional/pendiente");
      } else {
        setRole("client");
        setProStatus("approved");
        router.push("/cliente/inicio");
      }
    }, 700);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-4 flex items-center gap-2">
        <Link
          href="/welcome"
          className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
        >
          <Icon name="back" size={18} stroke={2.2} />
        </Link>
        <span className="font-bold text-[17px] text-ink-800">Crear cuenta</span>
      </div>
      <div className="px-6 flex gap-2 mb-5">
        {(["Cliente", "Profesional"] as const).map((l, i) => {
          const sel = isPro === (i === 1);
          return (
            <button
              key={l}
              onClick={() => setIsPro(i === 1)}
              className={`flex-1 py-2.5 rounded-full border-[1.5px] text-[13px] font-bold transition ${
                sel
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-sand-200 text-ink-400"
              }`}
            >
              {l}
            </button>
          );
        })}
      </div>
      <ScreenBody className="px-6 pb-8" white>
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre completo"
            value={form.name}
            onChange={(e) => upd("name", e.target.value)}
            placeholder="Xosé Rodríguez Souto"
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={(e) => upd("email", e.target.value)}
            placeholder="tu@correo.com"
          />
          <Input
            label="Teléfono"
            type="tel"
            value={form.phone}
            onChange={(e) => upd("phone", e.target.value)}
            placeholder="+34 600 000 000"
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => upd("password", e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
          {isPro && (
            <>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3.5 py-3 text-[12px] text-amber-700 font-semibold flex gap-2">
                <span>ℹ️</span>
                <span>
                  Tu cuenta quedará <strong>pendiente de aprobación</strong> por
                  nuestro equipo. Recibirás confirmación en 24–48 h.
                </span>
              </div>
              <Input
                label="DNI / NIE"
                value={form.dni}
                onChange={(e) => upd("dni", e.target.value)}
                placeholder="00000000A"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-ink-500">
                  Especialidades
                </label>
                <Input
                  value={specialtyQuery}
                  onChange={(e) => {
                    setSpecialtyQuery(e.target.value);
                    if (specialtyError) {
                      setSpecialtyError(false);
                    }
                  }}
                  placeholder="Busca por servicio o categoría"
                  note="Puedes seleccionar varias especialidades. La primera quedará como principal en esta demo."
                />

                {selectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedServices.map((service, index) => (
                      <div
                        key={service.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full bg-coral-50 px-3 py-1.5 text-[12px] font-semibold text-coral-700"
                      >
                        <span className="truncate">
                          {service.name}
                          {index === 0 ? " · principal" : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeService(service.id)}
                          className="rounded-full bg-coral-100 px-1.5 py-0.5 text-[10px] font-bold text-coral-700"
                          aria-label={`Quitar ${service.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-sand-200 bg-white overflow-hidden">
                  {suggestedServices.length > 0 ? (
                    <div className="divide-y divide-sand-200/70">
                      {suggestedServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => addService(service)}
                          className="w-full px-4 py-3 text-left transition active:bg-sand-50"
                        >
                          <div className="font-semibold text-[13px] text-ink-800">
                            {service.name}
                          </div>
                          <div className="text-[11px] text-ink-400">
                            {service.categoryName}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : specialtyQuery.trim() ? (
                    <div className="px-4 py-3 text-[12px] leading-snug">
                      <div className="font-semibold text-ink-700">
                        No encontramos esa especialidad.
                      </div>
                      <div className="text-ink-400 mt-1">
                        Pronto podrás solicitar que admin la revise.
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-[12px] text-ink-400 leading-snug">
                      Empieza a escribir para filtrar servicios o elige una sugerencia.
                    </div>
                  )}
                </div>

                {specialtyError && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    Selecciona al menos una especialidad para continuar como profesional.
                  </span>
                )}
              </div>
              <Select
                label="Ciudad base de trabajo"
                value={form.zone}
                onChange={(e) => upd("zone", e.target.value)}
              >
                {[
                  "Vigo",
                  "A Coruña",
                  "Santiago de Compostela",
                  "Pontevedra",
                  "Ourense",
                  "Lugo",
                  "Ferrol",
                  "Hasta mi radio de acción",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </Select>
            </>
          )}
          <p className="text-[11px] text-ink-400 leading-relaxed">
            Al registrarte aceptas los{" "}
            <span className="text-coral-600 font-semibold">Términos de servicio</span> y la{" "}
            <span className="text-coral-600 font-semibold">Política de privacidad</span>.
          </p>
          <Button full onClick={submit} disabled={loading}>
            {loading
              ? "Creando cuenta…"
              : isPro
              ? "Registrarme como profesional"
              : "Crear cuenta gratis"}
          </Button>
        </div>
      </ScreenBody>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div />}>
      <RegisterInner />
    </Suspense>
  );
}
