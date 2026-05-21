import {
  attributeValueKey,
  formatAttributeKey,
  formatAttributeValue,
  parseSelectedAttributes,
  serializeSelectedAttributes,
  toggleAttributeValue,
  type SelectedAttributes,
} from "@/lib/attribute-filters";

export const PRICE_RANGE_MIN = 0;
export const PRICE_RANGE_MAX = 5000;

export type ActiveFilterChip = {
  id: string;
  label: string;
};

type FilterLookup = {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
};

const RATING_LABELS: Record<string, string> = {
  "3": "3+ stars",
  "4": "4+ stars",
  "4.5": "4.5+ stars",
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function attributeChipId(
  key: string,
  value: string | number | boolean,
): string {
  return `attr:${key}::${attributeValueKey(value)}`;
}

function findAttributeValue(
  selected: SelectedAttributes,
  key: string,
  valueKey: string,
): string | number | boolean | undefined {
  const values = selected[key];
  if (!values) {
    return undefined;
  }
  return values.find((entry) => attributeValueKey(entry) === valueKey);
}

/**
 * Builds removable filter chips from the current catalog URL params.
 */
export function collectActiveFilters(
  params: URLSearchParams,
  lookup: FilterLookup,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  const query = params.get("q")?.trim();
  if (query) {
    chips.push({ id: "q", label: `Search: “${query}”` });
  }

  const categoryId = params.get("categoryId");
  if (categoryId) {
    const categoryName =
      lookup.categories.find((category) => category.id === categoryId)?.name ??
      "Category";
    chips.push({ id: `category:${categoryId}`, label: categoryName });

    const selectedAttributes = parseSelectedAttributes(params.get("attributes"));
    for (const [key, values] of Object.entries(selectedAttributes)) {
      for (const value of values) {
        chips.push({
          id: attributeChipId(key, value),
          label: `${formatAttributeKey(key)}: ${formatAttributeValue(key, value)}`,
        });
      }
    }
  }

  const brandRaw = params.get("brandId");
  if (brandRaw) {
    const brandIds = brandRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    for (const brandId of brandIds) {
      const brandName =
        lookup.brands.find((brand) => brand.id === brandId)?.name ?? "Brand";
      chips.push({ id: `brand:${brandId}`, label: brandName });
    }
  }

  const priceMinRaw = params.get("priceMin");
  const priceMaxRaw = params.get("priceMax");
  const priceMin = priceMinRaw ? Number(priceMinRaw) : PRICE_RANGE_MIN;
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : PRICE_RANGE_MAX;

  if (priceMinRaw && priceMin > PRICE_RANGE_MIN) {
    chips.push({ id: "priceMin", label: `From ${formatUsd(priceMin)}` });
  }
  if (priceMaxRaw && priceMax < PRICE_RANGE_MAX) {
    chips.push({ id: "priceMax", label: `Up to ${formatUsd(priceMax)}` });
  }

  const ratingMin = params.get("ratingMin");
  if (ratingMin) {
    chips.push({
      id: "ratingMin",
      label: RATING_LABELS[ratingMin] ?? `${ratingMin}+ stars`,
    });
  }

  if (params.get("inStock") === "true") {
    chips.push({ id: "inStock", label: "In stock only" });
  }

  return chips;
}

/** Removes a single active filter chip from URL params. */
export function removeActiveFilter(
  chipId: string,
  params: URLSearchParams,
): void {
  if (chipId === "q") {
    params.delete("q");
    return;
  }

  if (chipId.startsWith("category:")) {
    params.delete("categoryId");
    params.delete("attributes");
    return;
  }

  if (chipId.startsWith("brand:")) {
    const brandId = chipId.slice("brand:".length);
    const remaining = (params.get("brandId") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id && id !== brandId);
    if (remaining.length === 0) {
      params.delete("brandId");
    } else {
      params.set("brandId", remaining.join(","));
    }
    return;
  }

  if (chipId === "priceMin") {
    params.delete("priceMin");
    return;
  }

  if (chipId === "priceMax") {
    params.delete("priceMax");
    return;
  }

  if (chipId === "ratingMin") {
    params.delete("ratingMin");
    return;
  }

  if (chipId === "inStock") {
    params.delete("inStock");
    return;
  }

  if (chipId.startsWith("attr:")) {
    const rest = chipId.slice("attr:".length);
    const separator = rest.indexOf("::");
    if (separator === -1) {
      return;
    }
    const key = rest.slice(0, separator);
    const valueKey = rest.slice(separator + 2);
    const selected = parseSelectedAttributes(params.get("attributes"));
    const value = findAttributeValue(selected, key, valueKey);
    if (value === undefined) {
      return;
    }
    const next = toggleAttributeValue(selected, key, value);
    const serialized = serializeSelectedAttributes(next);
    if (serialized) {
      params.set("attributes", serialized);
    } else {
      params.delete("attributes");
    }
  }
}

/** Clears catalog filters while keeping sort and pagination mode. */
export function clearAllCatalogFilters(params: URLSearchParams): void {
  params.delete("q");
  params.delete("categoryId");
  params.delete("brandId");
  params.delete("priceMin");
  params.delete("priceMax");
  params.delete("ratingMin");
  params.delete("inStock");
  params.delete("attributes");
}

export function hasActiveCatalogFilters(params: URLSearchParams): boolean {
  return collectActiveFilters(params, { categories: [], brands: [] }).length > 0;
}
