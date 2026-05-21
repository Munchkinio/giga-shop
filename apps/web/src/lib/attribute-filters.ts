import type { AttributeFacet } from "@/types";

export type SelectedAttributes = Record<
  string,
  (string | number | boolean)[]
>;

/** Parses `attributes` query JSON into a normalized multi-select map. */
export function parseSelectedAttributes(
  raw: string | null,
): SelectedAttributes {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const selected: SelectedAttributes = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined || value === null) {
        continue;
      }
      const values = Array.isArray(value) ? value : [value];
      const normalized = values.filter(
        (entry): entry is string | number | boolean =>
          typeof entry === "string" ||
          typeof entry === "number" ||
          typeof entry === "boolean",
      );
      if (normalized.length > 0) {
        selected[key] = normalized;
      }
    }

    return selected;
  } catch {
    return {};
  }
}

/** Serializes selected attributes for the `attributes` query param. */
export function serializeSelectedAttributes(
  selected: SelectedAttributes,
): string | null {
  const payload: Record<
    string,
    string | number | boolean | (string | number | boolean)[]
  > = {};

  for (const [key, values] of Object.entries(selected)) {
    if (values.length === 0) {
      continue;
    }
    payload[key] = values.length === 1 ? values[0]! : values;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  return JSON.stringify(payload);
}

export function attributeValuesEqual(
  a: string | number | boolean,
  b: string | number | boolean,
): boolean {
  return a === b;
}

export function attributeValueKey(value: string | number | boolean): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function isAttributeValueSelected(
  selected: SelectedAttributes,
  key: string,
  value: string | number | boolean,
): boolean {
  const values = selected[key];
  if (!values) {
    return false;
  }
  return values.some((entry) => attributeValuesEqual(entry, value));
}

export function toggleAttributeValue(
  selected: SelectedAttributes,
  key: string,
  value: string | number | boolean,
): SelectedAttributes {
  const current = selected[key] ?? [];
  const exists = current.some((entry) => attributeValuesEqual(entry, value));

  if (exists) {
    const nextValues = current.filter(
      (entry) => !attributeValuesEqual(entry, value),
    );
    if (nextValues.length === 0) {
      const { [key]: _removed, ...rest } = selected;
      return rest;
    }
    return { ...selected, [key]: nextValues };
  }

  return { ...selected, [key]: [...current, value] };
}

const ATTRIBUTE_KEY_LABELS: Record<string, string> = {
  color: "Color",
  size: "Size",
  material: "Material",
  weight_kg: "Weight (kg)",
  warranty_months: "Warranty (months)",
};

/** Human-readable facet group title. */
export function formatAttributeKey(key: string): string {
  if (ATTRIBUTE_KEY_LABELS[key]) {
    return ATTRIBUTE_KEY_LABELS[key];
  }
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Display label for a facet value. */
export function formatAttributeValue(
  key: string,
  value: string | number | boolean,
): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    if (key === "warranty_months" && value === 0) {
      return "None";
    }
    return String(value);
  }
  if (key === "color") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value;
}

export function hasAttributeFacets(
  facets: AttributeFacet[] | undefined,
): facets is AttributeFacet[] {
  return facets !== undefined && facets.length > 0;
}

export function hasSelectedAttributes(selected: SelectedAttributes): boolean {
  return Object.keys(selected).length > 0;
}
