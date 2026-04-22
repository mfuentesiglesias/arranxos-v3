"use client";
import { useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Icon } from "@/components/ui/icon";
import { ProCard } from "@/components/pros/pro-card";
import { MapView } from "@/components/map/map-view";
import { professionals, categoryGroups } from "@/lib/data";

export default function ExplorarPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [category, setCategory] = useState<string>("");

  const approved = professionals.filter((p) => p.status === "approved");
  const filtered = approved.filter((p) => {
    const q = query.toLowerCase();
    const matchesQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q);
    const matchesCat = !category || p.specialty.toLowerCase().includes(category.toLowerCase());
    return matchesQ && matchesCat;
  });

  const pins = filtered.slice(0, 8).map((p, i) => ({
    id: p.id,
    x: 15 + ((i * 11) % 70),
    y: 20 + ((i * 17) % 60),
    label: `${p.rating.toFixed(1)}★`,
    type: (p.rating >= 4.8 ? "coral" : "teal") as "coral" | "teal",
  }));

  const topCategories = categoryGroups[0].categories.slice(0, 6);

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="px-5 pt-2 pb-3 bg-white border-b border-sand-200/70">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
            Explorar
          </h1>
          <div className="flex items-center bg-sand-100 rounded-full p-0.5 text-[12px] font-bold">
            {(["lista", "mapa"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-full transition capitalize ${
                  view === v ? "bg-white text-ink-800 shadow-card" : "text-ink-400"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-sand-100 rounded-2xl px-3.5 py-2.5">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Electricista, fontanero, pintor…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-ink-400 text-[11px] font-bold">
              Limpiar
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setCategory("")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] transition ${
              !category
                ? "border-coral-500 bg-coral-50 text-coral-700"
                : "border-sand-200 text-ink-500 bg-white"
            }`}
          >
            Todas
          </button>
          {topCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] transition whitespace-nowrap ${
                category === c.name
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-sand-200 text-ink-500 bg-white"
              }`}
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <ScreenBody className="px-4 pt-4 pb-6">
        {view === "mapa" && (
          <div className="mb-4">
            <MapView height={260} pins={pins} />
            <p className="text-[11px] text-ink-400 mt-2 text-center italic">
              DEMO: mapa simulado. En producción, MapLibre + datos PostGIS.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] text-ink-400 font-semibold">
            {filtered.length} profesional{filtered.length === 1 ? "" : "es"}{" "}
            {category && `en ${category}`}
          </div>
          <Link
            href="/cliente/publicar"
            className="text-[12px] text-coral-600 font-bold flex items-center gap-1"
          >
            No encuentro lo que busco
            <Icon name="forward" size={12} stroke={2.5} />
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.map((p) => (
            <ProCard
              key={p.id}
              pro={p}
              href={`/profesional/perfil?id=${p.id}`}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[13px]">
              No hay profesionales que coincidan con tu búsqueda.
              <div className="mt-2">
                <Link href="/cliente/publicar" className="text-coral-600 font-bold">
                  Publica tu trabajo y te encontrarán
                </Link>
              </div>
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}
