import { categoryGroups } from "@/lib/data";
import type { CatalogService } from "@/lib/types";

export function slugifyCatalogText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getSeedCatalogServices(): CatalogService[] {
  return categoryGroups.flatMap((group) =>
    group.categories.flatMap((category) =>
      category.services.map((service) => ({
        id: `${category.id}-${slugifyCatalogText(service)}`,
        categoryId: category.id,
        categoryName: category.name,
        name: service,
        active: true,
        source: "seed" as const,
      })),
    ),
  );
}

export function getCatalogServiceById(
  serviceId: string,
  services: CatalogService[] = getSeedCatalogServices(),
) {
  return services.find((service) => service.id === serviceId);
}

export function getCatalogServicesByCategory(
  categoryId: string,
  services: CatalogService[] = getSeedCatalogServices(),
) {
  return services.filter(
    (service) => service.active && service.categoryId === categoryId,
  );
}
