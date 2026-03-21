import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import SelectMenu from "../../components/common/SelectMenu";
import { getApiErrorMessage } from "../../utils/apiErrors";
import {
  getInventoryStatusLabel,
  isProductLowStock,
  isProductOutOfStock,
} from "../../utils/inventory";
import { cn } from "../../lib/utils";
import {
  buildInventoryDraft,
  getInventoryDraftStatusLabel,
  hasInventoryDraftChanges,
  inventoryStatusFilterOptions,
  matchesInventoryStatusFilter,
  normalizeInventoryDraft,
} from "./shared.js";
import { DashboardSectionHeading, DashboardStatCard } from "./components.jsx";
import { resolveImageUrl } from "../../services/api";

export default function InventoryTab({
  products,
  categories,
  refetchProducts,
  onOpenProduct,
  dashboardCompactItemClass,
  dashboardItemClass,
  dashboardPanelClass,
  isDayTheme,
}) {
  const [inventoryDrafts, setInventoryDrafts] = useState({});
  const [inventorySavingIds, setInventorySavingIds] = useState({});
  const [inventoryErrors, setInventoryErrors] = useState({});
  const [inventoryFilters, setInventoryFilters] = useState({
    search: "",
    status: "All Items",
    categoryId: "All Categories",
  });

  useEffect(() => {
    setInventoryDrafts(
      Object.fromEntries(
        products.map((product) => [product._id, buildInventoryDraft(product)]),
      ),
    );
    setInventoryErrors({});
  }, [products]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category._id, category.name])),
    [categories],
  );

  const trackedInventoryProductsCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product.inventoryQuantity !== null &&
          product.inventoryQuantity !== undefined,
      ).length,
    [products],
  );
  const lowStockProductsCount = useMemo(
    () => products.filter((product) => isProductLowStock(product)).length,
    [products],
  );
  const outOfStockProductsCount = useMemo(
    () => products.filter((product) => isProductOutOfStock(product)).length,
    [products],
  );

  const inventoryProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const score = (product) => {
          if (isProductOutOfStock(product)) return 0;
          if (isProductLowStock(product)) return 1;
          if (
            product.inventoryQuantity !== null &&
            product.inventoryQuantity !== undefined
          ) {
            return 2;
          }
          return 3;
        };

        const scoreDifference = score(a) - score(b);
        if (scoreDifference !== 0) return scoreDifference;
        return a.name.localeCompare(b.name);
      }),
    [products],
  );

  const inventoryCategoryOptions = useMemo(
    () => [
      { label: "All Categories", value: "All Categories" },
      ...categories.map((category) => ({
        label: category.name,
        value: category._id,
      })),
    ],
    [categories],
  );

  const filteredInventoryProducts = useMemo(() => {
    const search = inventoryFilters.search.trim().toLowerCase();

    return inventoryProducts.filter((product) => {
      const matchesSearch = search
        ? [product.name, categoryMap.get(product.categoryId) || ""]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true;
      const matchesStatus = matchesInventoryStatusFilter(product, inventoryFilters.status, {
        isProductLowStock,
        isProductOutOfStock,
      });
      const matchesCategory =
        inventoryFilters.categoryId === "All Categories"
          ? true
          : product.categoryId === inventoryFilters.categoryId;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryMap, inventoryFilters, inventoryProducts]);

  const isInventoryFilterDirty =
    inventoryFilters.search.trim() !== "" ||
    inventoryFilters.status !== "All Items" ||
    inventoryFilters.categoryId !== "All Categories";

  const updateInventoryDraft = (productId, patch) => {
    setInventoryDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        ...patch,
      },
    }));
    setInventoryErrors((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const resetInventoryDraft = (product) => {
    setInventoryDrafts((prev) => ({
      ...prev,
      [product._id]: buildInventoryDraft(product),
    }));
    setInventoryErrors((prev) => {
      if (!prev[product._id]) return prev;
      const next = { ...prev };
      delete next[product._id];
      return next;
    });
  };

  const handleInventorySave = async (product) => {
    const draft = inventoryDrafts[product._id] || buildInventoryDraft(product);
    setInventorySavingIds((prev) => ({ ...prev, [product._id]: true }));
    setInventoryErrors((prev) => {
      const next = { ...prev };
      delete next[product._id];
      return next;
    });

    try {
      let inventoryQuantity = null;
      if (draft.trackInventory) {
        if (draft.inventoryQuantity === "") {
          throw new Error("Enter the stock count or disable inventory tracking.");
        }

        inventoryQuantity = Number(draft.inventoryQuantity);
        if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) {
          throw new Error("Inventory count must be a whole number of 0 or more.");
        }
      }

      const lowStockThreshold =
        draft.lowStockThreshold === "" ? 5 : Number(draft.lowStockThreshold);
      if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        throw new Error("Low-stock warning must be a whole number of 0 or more.");
      }

      const formData = new FormData();
      formData.append(
        "inventoryQuantity",
        inventoryQuantity === null ? "" : String(inventoryQuantity),
      );
      formData.append("lowStockThreshold", String(lowStockThreshold));
      formData.append("isAvailable", String(draft.isAvailable));

      await api.put(`/admin/products/${product._id}`, formData);
      await refetchProducts();
    } catch (err) {
      setInventoryErrors((prev) => ({
        ...prev,
        [product._id]:
          err instanceof Error && !err.response
            ? err.message
            : getApiErrorMessage(err, "Failed to update inventory."),
      }));
    } finally {
      setInventorySavingIds((prev) => {
        const next = { ...prev };
        delete next[product._id];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Inventory Filters"
          title="Filter Inventory"
          description="Narrow the list by name, category, or stock state before editing product stock."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setInventoryFilters({
                  search: "",
                  status: "All Items",
                  categoryId: "All Categories",
                })
              }
              disabled={!isInventoryFilterDirty}
            >
              Clear
            </Button>
          }
        />
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.9fr)_minmax(14rem,0.9fr)]">
          <Input
            type="text"
            placeholder="Search product or category"
            value={inventoryFilters.search}
            onChange={(e) =>
              setInventoryFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
          <SelectMenu
            value={inventoryFilters.status}
            onChange={(value) =>
              setInventoryFilters((prev) => ({ ...prev, status: value }))
            }
            placeholder="Filter by stock state"
            options={inventoryStatusFilterOptions.map((option) => ({
              label: option,
              value: option,
            }))}
          />
          <SelectMenu
            value={inventoryFilters.categoryId}
            onChange={(value) =>
              setInventoryFilters((prev) => ({ ...prev, categoryId: value }))
            }
            placeholder="Filter by category"
            options={inventoryCategoryOptions}
          />
        </div>
        <div
          className={cn(
            dashboardCompactItemClass,
            "mt-4 space-y-1.5",
            isDayTheme
              ? "border-[#3f7674]/12 bg-[#f6fbfb]"
              : "border-gold/12 bg-[rgba(24,18,16,0.86)]",
          )}
        >
          <p className="text-xs font-semibold text-espresso">
            Showing {filteredInventoryProducts.length} of {inventoryProducts.length}
          </p>
          <p className="text-[11px] leading-5 text-cocoa/60">
            Orders reduce tracked stock immediately. Cancelling an order or removing an item from a received order restores the reserved quantity.
          </p>
        </div>
      </div>

      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Stock Overview"
          title="Inventory CMS"
          description="A dedicated stock workspace for product counts, low-stock warnings, and order availability."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <DashboardStatCard
            label="Tracked Items"
            value={trackedInventoryProductsCount}
            note={`${products.length} total products`}
          />
          <DashboardStatCard
            label="Low Stock"
            value={lowStockProductsCount}
            note="Needs attention soon"
          />
          <DashboardStatCard
            label="Out Of Stock"
            value={outOfStockProductsCount}
            note="Currently blocked from orders"
          />
        </div>
      </div>

      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Stock Library"
          title="Inventory List"
          description={`${filteredInventoryProducts.length} products match the current filters.`}
          action={<Badge>{trackedInventoryProductsCount} tracked</Badge>}
        />
        <div className="mt-4 space-y-3 text-sm">
          {filteredInventoryProducts.map((product) => {
            const draft = inventoryDrafts[product._id] || buildInventoryDraft(product);
            const normalizedDraft = normalizeInventoryDraft(draft);
            const inventoryError = inventoryErrors[product._id];
            const isSavingInventory = Boolean(inventorySavingIds[product._id]);
            const hasChanges = hasInventoryDraftChanges(product, draft);
            const draftStatusLabel = getInventoryDraftStatusLabel(draft);
            const isDraftOutOfStock =
              draft.trackInventory &&
              draft.inventoryQuantity !== "" &&
              normalizedDraft.inventoryQuantity !== null &&
              normalizedDraft.inventoryQuantity <= 0;
            const isDraftLowStock =
              draft.trackInventory &&
              draft.inventoryQuantity !== "" &&
              normalizedDraft.inventoryQuantity !== null &&
              normalizedDraft.inventoryQuantity > 0 &&
              normalizedDraft.inventoryQuantity <= normalizedDraft.lowStockThreshold;
            const statusClass = !draft.isAvailable
              ? "border border-slate-200/80 bg-slate-50 text-slate-700"
              : isDraftOutOfStock
                ? "border border-rose-200/80 bg-rose-50 text-rose-700"
                : isDraftLowStock
                  ? "border border-amber-200/80 bg-amber-50 text-amber-700"
                  : isDayTheme
                    ? "border border-[#3f7674]/15 bg-[#edf6f5] text-[#315f5e]"
                    : "border border-gold/20 bg-obsidian/55 text-espresso";
            const inventoryPreviewLabel = draft.trackInventory
              ? draft.inventoryQuantity === ""
                ? "Stock count required"
                : normalizedDraft.inventoryQuantity === null
                  ? "Invalid stock count"
                  : `${normalizedDraft.inventoryQuantity} in stock`
              : "Open inventory";
            const thresholdPreviewLabel = `Low stock at ${normalizedDraft.lowStockThreshold}`;

            return (
              <div
                key={product._id}
                className={cn(
                  dashboardItemClass,
                  "overflow-hidden p-0",
                  isDayTheme ? "border-[#3f7674]/16 bg-[#fcfefe]" : "",
                )}
              >
                <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.imageUrl ? (
                      <img
                        src={resolveImageUrl(product.imageUrl)}
                        alt={product.name}
                        className="h-14 w-14 rounded-xl2 object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-espresso">{product.name}</p>
                      <p className="mt-1 text-xs text-cocoa/60">
                        {categoryMap.get(product.categoryId) || "Category"} - {getInventoryStatusLabel(product)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{inventoryPreviewLabel}</Badge>
                        {draft.trackInventory && <Badge>{thresholdPreviewLabel}</Badge>}
                      </div>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", statusClass)}>
                    {draftStatusLabel}
                  </span>
                </div>

                {(isDraftOutOfStock || isDraftLowStock) && (
                  <div
                    className={cn(
                      "mx-4 rounded-[1rem] border px-3 py-2.5 text-xs font-medium",
                      isDraftOutOfStock
                        ? "border-rose-200/80 bg-rose-50 text-rose-700"
                        : "border-amber-200/80 bg-amber-50 text-amber-700",
                    )}
                  >
                    {isDraftOutOfStock
                      ? "Out of stock: this item is blocked from new orders until you restock it."
                      : `Low stock warning: only ${normalizedDraft.inventoryQuantity} left before this item runs out.`}
                  </div>
                )}

                <div
                  className={cn(
                    "grid gap-4 border-t px-4 py-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]",
                    isDayTheme ? "border-[#3f7674]/10" : "border-gold/10",
                  )}
                >
                  <div className="grid gap-3">
                    <label
                      className={cn(
                        dashboardCompactItemClass,
                        "flex items-center gap-3 px-3 py-3 text-xs text-cocoa/75",
                        isDayTheme ? "border-[#3f7674]/12 bg-[#f5faf9]" : "",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={draft.trackInventory}
                        onChange={(e) =>
                          updateInventoryDraft(product._id, { trackInventory: e.target.checked })
                        }
                      />
                      <span>Track inventory</span>
                    </label>
                    <label
                      className={cn(
                        dashboardCompactItemClass,
                        "flex items-center gap-3 px-3 py-3 text-xs text-cocoa/75",
                        isDayTheme ? "border-[#3f7674]/12 bg-[#f5faf9]" : "",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={draft.isAvailable}
                        onChange={(e) =>
                          updateInventoryDraft(product._id, { isAvailable: e.target.checked })
                        }
                      />
                      <span>Available to order</span>
                    </label>
                    {!draft.isAvailable && (
                      <p className="text-[11px] leading-5 text-cocoa/60">
                        This item will stay hidden from orders until you re-enable availability.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cocoa/55">
                        Stock Count
                      </p>
                      <Input
                        type="number"
                        min="0"
                        placeholder={draft.trackInventory ? "Stock count" : "Open inventory"}
                        value={draft.inventoryQuantity}
                        disabled={!draft.trackInventory}
                        onChange={(e) =>
                          updateInventoryDraft(product._id, { inventoryQuantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cocoa/55">
                        Low Stock Warning
                      </p>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Low stock warning"
                        value={draft.lowStockThreshold}
                        onChange={(e) =>
                          updateInventoryDraft(product._id, { lowStockThreshold: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {inventoryError && <p className="mx-4 form-error">{inventoryError}</p>}

                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  <Button
                    type="button"
                    onClick={() => handleInventorySave(product)}
                    disabled={isSavingInventory || !hasChanges}
                  >
                    {isSavingInventory ? "Saving..." : "Save Inventory"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => resetInventoryDraft(product)}
                    disabled={isSavingInventory || !hasChanges}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenProduct(product._id)}
                    disabled={isSavingInventory}
                  >
                    Open Product
                  </Button>
                </div>
              </div>
            );
          })}

          {filteredInventoryProducts.length === 0 && (
            <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/45 p-4 text-sm text-cocoa/60">
              No products match the current inventory filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
