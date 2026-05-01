"use client";
import { useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Icon } from "@/components/ui/icon";
import {
  FALLBACK_APPROVED_CATALOG_GROUP,
  getEffectiveCatalogCategories,
  getCatalogGroupPresentation,
  slugifyCatalogText,
} from "@/lib/catalog";
import { getEffectiveApprovedCatalogCategories, useSession } from "@/lib/store";
import type { CatalogCategory } from "@/lib/types";

export default function PublicarCategoriaPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const approvedCatalogCategories = useSession(getEffectiveApprovedCatalogCategories);
  const categoryGroups = groupCatalogCategories(
    getEffectiveCatalogCategories(approvedCatalogCategories),
  );

  return (
    <div className="flex-1 flex flex-col bg-white">
      <StatusBar />
      <TopBar title="Publicar trabajo" subtitle="Paso 1 de 4 · Categoría" />

      <ScreenBody className="px-5 pt-3 pb-6" white>
        <div className="flex items-center gap-2 bg-sand-100 rounded-2xl px-3.5 py-2.5 mb-4">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busca un servicio (vendimia, fontanero…)"
            data-testid="client-publish-category-search"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {categoryGroups.map((g) => {
            const isOpen = open === g.label;
            const visibleCats = search
              ? g.categories.filter((c) =>
                  [c.name, c.group ?? ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
              : g.categories;
            if (search && visibleCats.length === 0) return null;
            return (
              <div
                key={g.label}
                className="rounded-2xl border border-sand-200 overflow-hidden bg-white"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : g.label)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 active:bg-sand-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
                      style={{ background: g.color }}
                    >
                      {g.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[14px] text-ink-800">
                        {g.label}
                      </div>
                      <div className="text-[11px] text-ink-400">
                        {g.categories.length} categorías
                      </div>
                    </div>
                  </div>
                  <Icon
                    name={isOpen || search ? "chevron-down" : "forward"}
                    size={18}
                    stroke={2}
                  />
                </button>
                {(isOpen || search) && (
                  <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                    {visibleCats.map((c) => (
                      <Link
                        key={c.id}
                        href={`/cliente/publicar/servicio?cat=${encodeURIComponent(c.id)}&categoryId=${encodeURIComponent(c.id)}&categoryName=${encodeURIComponent(c.name)}`}
                        data-testid={`client-category-${slugifyCatalogText(c.name)}`}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sand-50 active:bg-sand-100"
                      >
                        <span className="text-[18px]">{c.icon ?? "•"}</span>
                        <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-700 leading-tight">
                          {c.name}
                          {c.source === "admin_approved" && (
                            <span className="mt-1 block text-[10px] font-bold text-teal-700">
                              Nuevo catálogo
                            </span>
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScreenBody>
    </div>
  );
}

function groupCatalogCategories(categories: CatalogCategory[]) {
  const groups = new Map<
    string,
    { label: string; icon: string; color: string; categories: CatalogCategory[] }
  >();

  categories.forEach((category) => {
    const label =
      category.group?.trim() ||
      (category.source === "admin_approved"
        ? FALLBACK_APPROVED_CATALOG_GROUP
        : "Catálogo");
    const groupPresentation = getCatalogGroupPresentation(label);
    const current = groups.get(label) ?? {
      label,
      icon: groupPresentation.icon || category.icon || "•",
      color: groupPresentation.color || category.color || "#F4F2EE",
      categories: [],
    };
    current.categories.push(category);
    groups.set(label, current);
  });

  return Array.from(groups.values());
}
