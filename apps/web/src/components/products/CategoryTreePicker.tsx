"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterSelect } from "@/components/products/FilterSelect";
import {
  asCategoryTreeNodes,
  buildCategoryLevelOptions,
  findCategoryPathInTree,
  getLeafCategories,
  getSubcategories,
  pathToIds,
} from "@/lib/category-tree-nav";
import type { CategoryTree, FacetBucket } from "@/types";

type CategoryTreePickerProps = {
  categoryTree: CategoryTree;
  categoryFacets: FacetBucket[];
  selectedCategoryId: string | null;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
};

/**
 * Three-level category drill-down; each level applies a branch filter (all descendants).
 */
export function CategoryTreePicker({
  categoryTree,
  categoryFacets,
  selectedCategoryId,
  onChange,
  disabled = false,
}: CategoryTreePickerProps) {
  const [rootId, setRootId] = useState("");
  const [subId, setSubId] = useState("");

  const pathFromUrl = useMemo(
    () =>
      selectedCategoryId
        ? findCategoryPathInTree(categoryTree, selectedCategoryId)
        : null,
    [categoryTree, selectedCategoryId],
  );

  useEffect(() => {
    if (!selectedCategoryId) {
      setRootId("");
      setSubId("");
      return;
    }
    const ids = pathFromUrl ? pathToIds(pathFromUrl) : null;
    if (ids) {
      setRootId(ids.rootId);
      setSubId(ids.subId ?? "");
    }
  }, [selectedCategoryId, pathFromUrl]);

  const subcategories = useMemo(
    () => (rootId ? getSubcategories(categoryTree, rootId) : []),
    [categoryTree, rootId],
  );

  const selectedSub = useMemo(
    () => subcategories.find((node) => node.id === subId),
    [subcategories, subId],
  );

  const leafCategories = useMemo(
    () => getLeafCategories(selectedSub),
    [selectedSub],
  );

  const leafId =
    selectedCategoryId &&
    leafCategories.some((node) => node.id === selectedCategoryId)
      ? selectedCategoryId
      : "";

  const rootOptions = useMemo(
    () =>
      buildCategoryLevelOptions(
        asCategoryTreeNodes(categoryTree),
        categoryFacets,
        pathFromUrl,
        "All departments",
      ),
    [categoryTree, categoryFacets, pathFromUrl],
  );

  const subOptions = useMemo(
    () =>
      buildCategoryLevelOptions(
        subcategories,
        categoryFacets,
        pathFromUrl,
        "All subcategories",
      ),
    [subcategories, categoryFacets, pathFromUrl],
  );

  const leafOptions = useMemo(
    () =>
      buildCategoryLevelOptions(
        leafCategories,
        categoryFacets,
        pathFromUrl,
        "All types",
      ),
    [leafCategories, categoryFacets, pathFromUrl],
  );

  const rootName = asCategoryTreeNodes(categoryTree).find(
    (node) => node.id === rootId,
  )?.name;

  const subName = selectedSub?.name;

  function handleRootChange(nextRootId: string) {
    setRootId(nextRootId);
    setSubId("");

    if (!nextRootId) {
      onChange("");
      return;
    }

    onChange(nextRootId);
  }

  function handleSubChange(nextSubId: string) {
    setSubId(nextSubId);

    if (!nextSubId) {
      onChange(rootId);
      return;
    }

    onChange(nextSubId);
  }

  function handleLeafChange(nextLeafId: string) {
    if (!nextLeafId) {
      onChange(subId || rootId);
      return;
    }
    onChange(nextLeafId);
  }

  const showSubStep = Boolean(rootId && subcategories.length > 0);
  const showLeafStep = Boolean(subId && leafCategories.length > 0);

  return (
    <div className="space-y-2">
      <FilterSelect
        options={rootOptions}
        value={rootId}
        onChange={handleRootChange}
        placeholder="All departments"
        disabled={disabled}
        aria-label="Department"
      />

      {showSubStep ? (
        <>
          <p className="text-xs text-ink-500">
            {rootName
              ? `${rootName} — narrow by subcategory (optional)`
              : "Narrow by subcategory (optional)"}
          </p>
          <FilterSelect
            options={subOptions}
            value={subId}
            onChange={handleSubChange}
            placeholder="All subcategories"
            disabled={disabled}
            aria-label="Subcategory"
          />
        </>
      ) : null}

      {showLeafStep ? (
        <>
          <p className="text-xs text-ink-500">
            {subName
              ? `${subName} — narrow by type (optional)`
              : "Narrow by type (optional)"}
          </p>
          <FilterSelect
            options={leafOptions}
            value={leafId}
            onChange={handleLeafChange}
            placeholder="All types"
            disabled={disabled}
            aria-label="Product type"
          />
        </>
      ) : null}
    </div>
  );
}
