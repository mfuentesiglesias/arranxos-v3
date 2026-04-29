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

export type ProfessionalSpecialtyFilterType = "service" | "category" | "legacy";

export interface ProfessionalSpecialtyFilterOption {
  id: string;
  label: string;
  type: ProfessionalSpecialtyFilterType;
  categoryId?: string;
  serviceId?: string;
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

function catalogTextsAreRelated(a: string, b: string) {
  const normalizedA = normalizeCatalogText(a);
  const normalizedB = normalizeCatalogText(b);

  if (!normalizedA || !normalizedB) return false;
  if (
    normalizedA === normalizedB ||
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  ) {
    return true;
  }

  const tokensA = normalizedA.split(" ").filter(Boolean);
  const tokensB = normalizedB.split(" ").filter(Boolean);

  return tokensA.some((tokenA) =>
    tokensB.some((tokenB) => tokenA.slice(0, 5) === tokenB.slice(0, 5)),
  );
}

function getUniqueLegacySpecialties(professional: Professional) {
  const seen = new Set<string>();

  return [professional.specialty, ...(professional.specialties ?? [])].filter(
    (value): value is string => {
      const normalized = normalizeCatalogText(value ?? "");
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    },
  );
}

function getJobCatalogContext(
  job: Job,
  services: CatalogService[] = getSeedCatalogServices(),
) {
  const categoryServices = getCatalogServicesByCategory(job.categoryId, services);
  const exactJobService = categoryServices.find(
    (service) => normalizeCatalogText(service.name) === normalizeCatalogText(job.service),
  );

  return { categoryServices, exactJobService };
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

export function getProfessionalSpecialtyFilterSuggestions(
  professional: Professional,
  services: CatalogService[] = getSeedCatalogServices(),
) {
  const selectedServiceIds = (professional as ProfessionalWithSelectedServiceIds)
    .selectedServiceIds;

  if (selectedServiceIds && selectedServiceIds.length > 0) {
    const specialtyOptions = selectedServiceIds
      .map((serviceId) => getCatalogServiceById(serviceId, services))
      .filter((service): service is CatalogService => Boolean(service))
      .map((service) => ({
        id: `service-${service.id}`,
        label: service.name,
        type: "service" as const,
        categoryId: service.categoryId,
        serviceId: service.id,
      }));

    const selectedIds = new Set(specialtyOptions.map((option) => option.serviceId));
    const relatedOptions = services
      .filter(
        (service) =>
          specialtyOptions.some((option) => option.categoryId === service.categoryId) &&
          !selectedIds.has(service.id),
      )
      .slice(0, 8)
      .map((service) => ({
        id: `related-${service.id}`,
        label: service.name,
        type: "service" as const,
        categoryId: service.categoryId,
        serviceId: service.id,
      }));

    return { specialties: specialtyOptions, related: relatedOptions };
  }

  const legacySpecialties = getUniqueLegacySpecialties(professional);
  const specialtyOptions: ProfessionalSpecialtyFilterOption[] = legacySpecialties.map(
    (specialty) => ({
      id: `legacy-${slugifyCatalogText(specialty)}`,
      label: specialty,
      type: "legacy",
    }),
  );
  const matchedCategoryIds = services
    .filter((service) =>
      legacySpecialties.some(
        (specialty) =>
          catalogTextsAreRelated(specialty, service.categoryName) ||
          catalogTextsAreRelated(specialty, service.name),
      ),
    )
    .map((service) => service.categoryId)
    .filter((categoryId, index, values) => values.indexOf(categoryId) === index);
  const relatedOptions = services
    .filter((service) => matchedCategoryIds.includes(service.categoryId))
    .filter(
      (service, index, values) =>
        values.findIndex((candidate) => candidate.id === service.id) === index,
    )
    .filter(
      (service) =>
        !legacySpecialties.some((specialty) =>
          catalogTextsAreRelated(specialty, service.name),
        ),
    )
    .slice(0, 8)
    .map((service) => ({
      id: `related-${service.id}`,
      label: service.name,
      type: "service" as const,
      categoryId: service.categoryId,
      serviceId: service.id,
    }));

  return { specialties: specialtyOptions, related: relatedOptions };
}

export function jobMatchesProfessionalSpecialtyFilter(
  job: Job,
  filter: ProfessionalSpecialtyFilterOption,
  services: CatalogService[] = getSeedCatalogServices(),
) {
  const { categoryServices, exactJobService } = getJobCatalogContext(job, services);

  if (filter.type === "service") {
    return Boolean(
      (filter.serviceId && exactJobService?.id === filter.serviceId) ||
        normalizeCatalogText(job.service) === normalizeCatalogText(filter.label),
    );
  }

  if (filter.type === "category") {
    return Boolean(
      (filter.categoryId && job.categoryId === filter.categoryId) ||
        normalizeCatalogText(job.category) === normalizeCatalogText(filter.label) ||
        categoryServices.some(
          (service) =>
            normalizeCatalogText(service.categoryName) ===
            normalizeCatalogText(filter.label),
        ),
    );
  }

  return [job.category, job.service, ...categoryServices.map((service) => service.categoryName)].some(
    (value) => catalogTextsAreRelated(filter.label, value),
  );
}

export function classifyJobForProfessionalSpecialties(
  job: Job,
  professional: Professional,
  services: CatalogService[] = getSeedCatalogServices(),
): JobSpecialtyClassification {
  const matchLabel = "Coincide con tus especialidades";
  const outsideLabel = "Fuera de tus especialidades";
  const { categoryServices, exactJobService } = getJobCatalogContext(job, services);
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
