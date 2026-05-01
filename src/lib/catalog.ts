import { categoryGroups } from "@/lib/data";
import type {
  CatalogCategory,
  CatalogRequest,
  CatalogService,
  Category,
  Job,
  Professional,
} from "@/lib/types";

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

export interface CatalogGroupPresentation {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export const DEFAULT_APPROVED_CATALOG_GROUP = "Hogar";
export const FALLBACK_APPROVED_CATALOG_GROUP = "Catálogo aprobado";
export const DEFAULT_APPROVED_CATALOG_GROUP_LABEL = "Hogar / Oficios";

const seedCatalogGroupMeta = new Map(
  categoryGroups.map((group) => [
    group.group,
    { icon: group.icon, color: group.color },
  ]),
);

function getSeedCatalogGroupMeta(group: string, fallbackIcon = "•", fallbackColor = "#F4F2EE") {
  const seedMeta = seedCatalogGroupMeta.get(group);
  return {
    icon: seedMeta?.icon ?? fallbackIcon,
    color: seedMeta?.color ?? fallbackColor,
  };
}

export const CATALOG_GROUP_OPTIONS: readonly CatalogGroupPresentation[] = [
  {
    value: DEFAULT_APPROVED_CATALOG_GROUP,
    label: DEFAULT_APPROVED_CATALOG_GROUP_LABEL,
    ...getSeedCatalogGroupMeta(DEFAULT_APPROVED_CATALOG_GROUP, "🏠", "#EEF4FB"),
  },
  {
    value: "Rural / Agrario",
    label: "Rural / Agrario",
    ...getSeedCatalogGroupMeta("Rural / Agrario", "🚜", "#FEF5E7"),
  },
  {
    value: "Ganadería",
    label: "Ganadería",
    ...getSeedCatalogGroupMeta("Ganadería", "🐄", "#FCE9CC"),
  },
  {
    value: "Digital / Tecnológica",
    label: "Digital / Tecnológica",
    ...getSeedCatalogGroupMeta("Digital / Tecnológica", "💻", "#D6E4F3"),
  },
  {
    value: "Motor / Movilidad",
    label: "Motor / Movilidad",
    ...getSeedCatalogGroupMeta("Motor / Movilidad", "🚗", "#FFE1E2"),
  },
  {
    value: "Eventos / Ocio",
    label: "Eventos / Ocio",
    ...getSeedCatalogGroupMeta("Eventos / Ocio", "🎉", "#E2DAF4"),
  },
  {
    value: "Turismo",
    label: "Turismo",
    ...getSeedCatalogGroupMeta("Turismo", "🗺", "#D6EDE7"),
  },
  {
    value: FALLBACK_APPROVED_CATALOG_GROUP,
    label: FALLBACK_APPROVED_CATALOG_GROUP,
    icon: "✨",
    color: "#EEF4FB",
  },
] as const;

const catalogGroupOptionsByValue = new Map(
  CATALOG_GROUP_OPTIONS.map((group) => [group.value, group]),
);

const catalogGroupOptionsByLabel = new Map(
  CATALOG_GROUP_OPTIONS.map((group) => [group.label, group]),
);

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

export function formatCatalogServiceName(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
}

export function normalizeCatalogGroupValue(group?: string) {
  const trimmedGroup = group?.trim();

  if (!trimmedGroup) return undefined;
  if (trimmedGroup === "Admin") {
    return DEFAULT_APPROVED_CATALOG_GROUP;
  }

  const matchingGroupOption =
    catalogGroupOptionsByValue.get(trimmedGroup) ?? catalogGroupOptionsByLabel.get(trimmedGroup);
  if (matchingGroupOption) {
    return matchingGroupOption.value;
  }

  return trimmedGroup;
}

export function getCatalogGroupPresentation(group?: string): CatalogGroupPresentation {
  const normalizedGroup = normalizeCatalogGroupValue(group);

  if (normalizedGroup) {
    return (
      catalogGroupOptionsByValue.get(normalizedGroup) ?? {
        value: normalizedGroup,
        label: normalizedGroup,
        icon: "•",
        color: "#F4F2EE",
      }
    );
  }

  return catalogGroupOptionsByValue.get(FALLBACK_APPROVED_CATALOG_GROUP)!;
}

export function applyApprovedCatalogCategoryGroup(
  category: CatalogCategory,
  group = DEFAULT_APPROVED_CATALOG_GROUP,
): CatalogCategory {
  const normalizedGroup = normalizeCatalogGroupValue(group) ?? DEFAULT_APPROVED_CATALOG_GROUP;
  const groupPresentation = getCatalogGroupPresentation(normalizedGroup);

  return {
    ...category,
    icon: groupPresentation.icon,
    group: normalizedGroup,
    color: groupPresentation.color,
  };
}

export function normalizeApprovedCatalogCategory(
  category: CatalogCategory,
): CatalogCategory {
  if (category.source !== "admin_approved") {
    return { ...category };
  }

  const canonicalSeedCategory = getCanonicalSeedCategoryForApprovedCategory(category.name);
  if (canonicalSeedCategory) {
    return canonicalSeedCategory;
  }

  const normalizedGroup = normalizeCatalogGroupValue(category.group);
  if (!normalizedGroup) {
    return { ...category };
  }

  return applyApprovedCatalogCategoryGroup(category, normalizedGroup);
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

function dedupeCatalogCategories(categories: CatalogCategory[]) {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  return categories.filter((category) => {
    if (!category.active) return false;

    const normalizedName = normalizeCatalogText(category.name);
    if (!normalizedName || seenIds.has(category.id) || seenNames.has(normalizedName)) {
      return false;
    }

    seenIds.add(category.id);
    seenNames.add(normalizedName);
    return true;
  });
}

export function getSeedCatalogCategories(): CatalogCategory[] {
  return categoryGroups.flatMap((group) =>
    group.categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      group: group.group,
      color: group.color,
      active: true,
      source: "seed" as const,
    })),
  );
}

const LEGACY_APPROVED_CATEGORY_CANONICAL_SLUGS: Record<string, string> = {
  carpinteria: "carpinteria-y-madera",
  ebanisteria: "carpinteria-y-madera",
  "carpinteria-madera": "carpinteria-y-madera",
  metalisteria: "metalisteria-y-soldadura",
  soldadura: "metalisteria-y-soldadura",
  "metalisteria-soldadura": "metalisteria-y-soldadura",
};

function getSeedCatalogCategoryByName(categoryName: string) {
  const normalizedCategoryName = normalizeCatalogText(categoryName);
  if (!normalizedCategoryName) return undefined;

  return getSeedCatalogCategories().find(
    (category) => normalizeCatalogText(category.name) === normalizedCategoryName,
  );
}

export function getCanonicalSeedCategoryForApprovedCategory(categoryName: string) {
  const categorySlug = slugifyCatalogText(categoryName);
  if (!categorySlug) return undefined;

  const canonicalCategorySlug =
    LEGACY_APPROVED_CATEGORY_CANONICAL_SLUGS[categorySlug] ?? categorySlug;

  return getSeedCatalogCategories().find(
    (category) => slugifyCatalogText(category.name) === canonicalCategorySlug,
  );
}

export function getEffectiveCatalogCategories(
  approvedCategories: CatalogCategory[] = [],
) {
  return dedupeCatalogCategories([
    ...getSeedCatalogCategories(),
    ...approvedCategories.map((category) =>
      normalizeApprovedCatalogCategory(category),
    ),
  ]);
}

export function buildApprovedCatalogCategoryFromName(
  name: string,
  requestId?: string,
  group = DEFAULT_APPROVED_CATALOG_GROUP,
): CatalogCategory {
  const categoryName = formatCatalogServiceName(name);

  return applyApprovedCatalogCategoryGroup({
    id: `admin-cat-${slugifyCatalogText(categoryName)}`,
    name: categoryName,
    active: true,
    source: "admin_approved",
    createdFromRequestId: requestId,
  }, group);
}

function normalizeApprovedCatalogService(service: CatalogService): CatalogService {
  if (service.source !== "admin_approved") {
    return { ...service };
  }

  const matchingSeedCategory =
    getCanonicalSeedCategoryForApprovedCategory(service.categoryName) ??
    getSeedCatalogCategoryByName(service.categoryName);
  if (!matchingSeedCategory) {
    return { ...service };
  }

  return {
    ...service,
    categoryId: matchingSeedCategory.id,
    categoryName: matchingSeedCategory.name,
  };
}

function dedupeCatalogServices(services: CatalogService[]) {
  const seenIds = new Set<string>();
  const seenCategoryNames = new Set<string>();

  return services.filter((service) => {
    if (!service.active) return false;

    const normalizedName = normalizeCatalogText(service.name);
    const categoryNameKey = `${service.categoryId}::${normalizedName}`;
    if (
      !normalizedName ||
      seenIds.has(service.id) ||
      seenCategoryNames.has(categoryNameKey)
    ) {
      return false;
    }

    seenIds.add(service.id);
    seenCategoryNames.add(categoryNameKey);
    return true;
  });
}

export function getEffectiveCatalogServices(
  approvedServices: CatalogService[] = [],
) {
  return dedupeCatalogServices([
    ...getSeedCatalogServices(),
    ...approvedServices.map((service) => normalizeApprovedCatalogService(service)),
  ]);
}

export function buildApprovedCatalogServiceFromRequest(
  request: CatalogRequest,
  category: Pick<Category, "id" | "name">,
  serviceName = request.requestedName,
): CatalogService {
  return {
    id: `${category.id}-${slugifyCatalogText(serviceName)}`,
    categoryId: category.id,
    categoryName: category.name,
    name: formatCatalogServiceName(serviceName),
    description: request.description,
    active: true,
    source: "admin_approved",
    createdFromRequestId: request.id,
  };
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
