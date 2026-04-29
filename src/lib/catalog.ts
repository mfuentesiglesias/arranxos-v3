import { categoryGroups } from "@/lib/data";
import type { CatalogService, Job, Professional } from "@/lib/types";

type ProfessionalWithSelectedServiceIds = Professional & {
  selectedServiceIds?: string[];
};

export type JobSpecialtyMatchType = "service" | "category" | "legacy" | "none";

export interface JobSpecialtyClassification {
  isMatch: boolean;
  label: string;
  matchType: JobSpecialtyMatchType;
}

export function slugifyCatalogText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeCatalogText(text: string) {
  return slugifyCatalogText(text).replace(/-/g, " ").trim();
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

export function classifyJobForProfessionalSpecialties(
  job: Job,
  professional: Professional,
  services: CatalogService[] = getSeedCatalogServices(),
): JobSpecialtyClassification {
  const matchLabel = "Coincide con tus especialidades";
  const outsideLabel = "Fuera de tus especialidades";
  const categoryServices = getCatalogServicesByCategory(job.categoryId, services);
  const exactJobService = categoryServices.find(
    (service) => normalizeCatalogText(service.name) === normalizeCatalogText(job.service),
  );
  const selectedServiceIds = (professional as ProfessionalWithSelectedServiceIds)
    .selectedServiceIds;

  if (selectedServiceIds && selectedServiceIds.length > 0) {
    if (exactJobService && selectedServiceIds.includes(exactJobService.id)) {
      return { isMatch: true, label: matchLabel, matchType: "service" };
    }

    if (
      categoryServices.some((service) => selectedServiceIds.includes(service.id))
    ) {
      return { isMatch: true, label: matchLabel, matchType: "category" };
    }

    return { isMatch: false, label: outsideLabel, matchType: "none" };
  }

  const legacyValues = [professional.specialty, ...(professional.specialties ?? [])]
    .filter(Boolean)
    .map(normalizeCatalogText);

  if (legacyValues.length === 0) {
    return { isMatch: false, label: outsideLabel, matchType: "none" };
  }

  const jobCategoryNames = new Set(
    [job.category, ...categoryServices.map((service) => service.categoryName)].map(
      normalizeCatalogText,
    ),
  );
  const jobServiceNames = new Set(
    [job.service, ...categoryServices.map((service) => service.name)].map(
      normalizeCatalogText,
    ),
  );

  const hasCategoryMatch = legacyValues.some((value) => jobCategoryNames.has(value));
  if (hasCategoryMatch) {
    return { isMatch: true, label: matchLabel, matchType: "category" };
  }

  const hasServiceMatch = legacyValues.some((value) => jobServiceNames.has(value));
  if (hasServiceMatch) {
    return { isMatch: true, label: matchLabel, matchType: "legacy" };
  }

  return { isMatch: false, label: outsideLabel, matchType: "none" };
}
