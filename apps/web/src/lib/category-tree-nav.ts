import { formatFacetCountLabel } from "@/lib/filter-facets";
import type { Category, CategoryTree, FacetBucket } from "@/types";

/** Nested category node (API tree; children are fully expanded in practice). */
export type CategoryTreeNode = Category & { children: CategoryTreeNode[] };

export type CategoryPathIds = {
  rootId: string;
  subId?: string;
  leafId?: string;
};

/** Breadcrumb-style label from flat category list (parentId chain). */
export function getCategoryPathLabel(
  categoryId: string,
  categories: Pick<Category, "id" | "name" | "parentId">[],
): string {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const parts: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return parts.length > 0 ? parts.join(" › ") : "Category";
}

/** Finds root → … → selected node in the hierarchy. */
export function asCategoryTreeNodes(tree: CategoryTree): CategoryTreeNode[] {
  return tree as CategoryTreeNode[];
}

export function findCategoryPathInTree(
  tree: CategoryTree,
  categoryId: string,
): CategoryTreeNode[] | null {
  function walk(
    nodes: CategoryTreeNode[],
    trail: CategoryTreeNode[],
  ): CategoryTreeNode[] | null {
    for (const node of nodes) {
      const next = [...trail, node];
      if (node.id === categoryId) {
        return next;
      }
      const found = walk(node.children, next);
      if (found) {
        return found;
      }
    }
    return null;
  }

  return walk(asCategoryTreeNodes(tree), []);
}

export function pathToIds(path: CategoryTreeNode[]): CategoryPathIds | null {
  const root = path[0];
  if (!root) {
    return null;
  }
  return {
    rootId: root.id,
    subId: path[1]?.id,
    leafId: path[2]?.id,
  };
}

function facetCountMap(facets: FacetBucket[]): Map<string, number> {
  return new Map(facets.map((facet) => [facet.id, facet.count]));
}

function hasFacetInSubtree(node: CategoryTreeNode, facetIds: Set<string>): boolean {
  if (facetIds.has(node.id)) {
    return true;
  }
  return node.children.some((child) => hasFacetInSubtree(child, facetIds));
}

function isOnPath(nodeId: string, path: CategoryTreeNode[] | null): boolean {
  return path?.some((node) => node.id === nodeId) ?? false;
}

/** Options for one tree level; keeps path + branches that still have facet matches. */
export function buildCategoryLevelOptions(
  nodes: CategoryTreeNode[],
  facets: FacetBucket[],
  path: CategoryTreeNode[] | null,
  placeholder: string,
): { value: string; label: string }[] {
  const counts = facetCountMap(facets);
  const facetIds = new Set(counts.keys());
  const hasFacetFilter = facetIds.size > 0;

  const visible = hasFacetFilter
    ? nodes.filter(
        (node) =>
          isOnPath(node.id, path) || hasFacetInSubtree(node, facetIds),
      )
    : nodes;

  return [
    { value: "", label: placeholder },
    ...visible.map((node) => {
      const count = counts.get(node.id);
      const label =
        count !== undefined
          ? formatFacetCountLabel(node.name, count)
          : node.name;
      return { value: node.id, label };
    }),
  ];
}

export function getSubcategories(
  tree: CategoryTree,
  rootId: string,
): CategoryTreeNode[] {
  return (
    asCategoryTreeNodes(tree).find((node) => node.id === rootId)?.children ?? []
  );
}

export function getLeafCategories(
  sub: CategoryTreeNode | undefined,
): CategoryTreeNode[] {
  return sub?.children ?? [];
}
