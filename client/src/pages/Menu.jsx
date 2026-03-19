import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import ProductCard from "../components/menu/ProductCard";
import useCart from "../hooks/useCart";
import useAuth from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import useTheme from "../hooks/useTheme";
import useRealtimeInvalidation from "../hooks/useRealtimeInvalidation";
import SelectMenu from "../components/common/SelectMenu";
import { FilterIcon, SearchIcon, SparkIcon } from "../components/common/Icons";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PageHeroSkeleton } from "../components/common/PageSkeleton";
import { cn } from "../lib/utils";
import {
  loadOrderEditSession,
} from "../utils/orderEditSession";
import { useLocation, useNavigate } from "react-router-dom";

const fetchCategories = async () => {
  const { data } = await api.get("/categories");
  return data.categories || [];
};

const fetchProducts = async () => {
  const { data } = await api.get("/products");
  return data.products || [];
};

const areHomeHighlightsEqual = (first, second) =>
  first.todaysSpecialId === second.todaysSpecialId &&
  first.featuredProductIds.length === second.featuredProductIds.length &&
  first.featuredProductIds.every((value, index) => value === second.featuredProductIds[index]);

export default function Menu() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { data: settings } = useSettings();
  const { theme } = useTheme();
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    size: "",
    minPrice: "",
    maxPrice: "",
    sort: "newest",
    showUnavailable: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [highlightDraft, setHighlightDraft] = useState({
    todaysSpecialId: "",
    featuredProductIds: [],
  });
  const [isHighlightSyncing, setIsHighlightSyncing] = useState(false);
  const [highlightPickerError, setHighlightPickerError] = useState("");
  const highlightSaveTimeoutRef = useRef(null);
  const highlightSaveInFlightRef = useRef(false);
  const queuedHighlightDraftRef = useRef(null);
  const lastSavedHighlightsRef = useRef({
    todaysSpecialId: "",
    featuredProductIds: [],
  });
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const isAdminHomePicker =
    ["Admin", "Staff"].includes(user?.role) &&
    searchParams.get("adminPicker") === "home-highlights";
  const orderEditSession = useMemo(
    () => {
      void location.key;
      return loadOrderEditSession();
    },
    [location.key],
  );
  const isDayTheme = theme === "day";
  const orderEditBannerClass = cn(
    "flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border px-5 py-4 shadow-[0_18px_34px_rgba(19,14,12,0.14)]",
    isDayTheme
      ? "border-[#3f7674]/18 bg-[#f8fcfc] text-espresso"
      : "border-gold/18 bg-[#17110f] text-cream",
  );
  const adminPickerBannerClass = cn(
    "flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border px-5 py-4 shadow-[0_18px_34px_rgba(19,14,12,0.14)]",
    isDayTheme
      ? "border-[#3f7674]/18 bg-[#eef7f6] text-espresso"
      : "border-gold/18 bg-[#17110f] text-cream",
  );
  const highlightPickerErrorClass = cn(
    "mt-3 rounded-[1.1rem] border px-4 py-3 text-sm font-medium shadow-[0_12px_24px_rgba(35,18,18,0.12)]",
    isDayTheme
      ? "border-rose-300/80 bg-rose-50 text-rose-800"
      : "border-rose-500/35 bg-rose-950/30 text-rose-200",
  );
  const realtimeBindings = useMemo(
    () => [
      { event: "catalog:changed", queryKeys: [["categories"], ["products"]] },
      { event: "order:new", queryKeys: [["products"]] },
      { event: "order:status", queryKeys: [["products"]] },
    ],
    [],
  );
  useRealtimeInvalidation(realtimeBindings);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat._id, cat.name])),
    [categories],
  );

  const sizes = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      if (product.sizePrices?.length) {
        product.sizePrices.forEach((entry) => set.add(entry.size));
      } else {
        product.sizeOptions?.forEach((size) => set.add(size));
      }
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const min = filters.minPrice ? Number(filters.minPrice) : null;
    const max = filters.maxPrice ? Number(filters.maxPrice) : null;
    const resolvePrice = (product) => {
      if (filters.size && product.sizePrices?.length) {
        const match = product.sizePrices.find(
          (entry) => entry.size === filters.size,
        );
        if (match) return match.price;
      }
      return product.price;
    };
    let list = products.filter((product) => {
      const matchesCategory = filters.category
        ? product.categoryId === filters.category
        : true;
      const matchesSearch = filters.search
        ? `${product.name} ${product.description || ""}`
            .toLowerCase()
            .includes(filters.search.toLowerCase())
        : true;
      const availableSizes = product.sizePrices?.length
        ? product.sizePrices.map((entry) => entry.size)
        : product.sizeOptions || [];
      const matchesSize = filters.size
        ? availableSizes.includes(filters.size)
        : true;
      const priceValue = resolvePrice(product);
      const matchesMin = min !== null ? priceValue >= min : true;
      const matchesMax = max !== null ? priceValue <= max : true;
      const matchesAvailability = filters.showUnavailable
        ? true
        : product.isAvailable !== false;
      return (
        matchesCategory &&
        matchesSearch &&
        matchesSize &&
        matchesMin &&
        matchesMax &&
        matchesAvailability
      );
    });

    switch (filters.sort) {
      case "price-asc":
        list = list.sort((a, b) => resolvePrice(a) - resolvePrice(b));
        break;
      case "price-desc":
        list = list.sort((a, b) => resolvePrice(b) - resolvePrice(a));
        break;
      case "name-asc":
        list = list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
      default:
        list = list.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        break;
    }
    return list.map((product) => ({
      ...product,
      categoryName: categoryMap.get(product.categoryId),
    }));
  }, [products, filters, categoryMap]);

  const resetFilters = () => {
    setFilters({
      category: "",
      search: "",
      size: "",
      minPrice: "",
      maxPrice: "",
      sort: "newest",
      showUnavailable: false,
    });
    setShowFilters(false);
  };

  const currentTodaysSpecialId = highlightDraft.todaysSpecialId;
  const currentFeaturedIds = highlightDraft.featuredProductIds;

  const handleReturnToOrder = () => {
    if (!orderEditSession?.orderId) return;
    navigate("/orders", {
      state: {
        restoreOrderEditor: true,
        orderId: orderEditSession.orderId,
      },
    });
  };

  const handleReturnToAdminHighlights = () => {
    navigate("/admin?tab=brand");
  };

  const processQueuedHighlightSave = useCallback(async () => {
    if (highlightSaveInFlightRef.current || !queuedHighlightDraftRef.current) {
      return;
    }

    const draftToSave = queuedHighlightDraftRef.current;
    queuedHighlightDraftRef.current = null;
    highlightSaveInFlightRef.current = true;
    setIsHighlightSyncing(true);
    setHighlightPickerError("");

    try {
      const formData = new FormData();
      formData.append("todaysSpecialProductId", draftToSave.todaysSpecialId);
      formData.append(
        "featuredProductIds",
        JSON.stringify(draftToSave.featuredProductIds),
      );
      const { data } = await api.put("/admin/settings", formData);
      const confirmedHighlights = {
        todaysSpecialId:
          data?.settings?.todaysSpecialProductId ?? draftToSave.todaysSpecialId,
        featuredProductIds:
          data?.settings?.featuredProductIds ?? draftToSave.featuredProductIds,
      };

      lastSavedHighlightsRef.current = confirmedHighlights;

      if (data?.settings) {
        queryClient.setQueryData(["settings"], data.settings);
      }

      setHighlightDraft((currentDraft) =>
        areHomeHighlightsEqual(currentDraft, confirmedHighlights)
          ? currentDraft
          : confirmedHighlights,
      );
    } catch {
      if (!queuedHighlightDraftRef.current) {
        setHighlightDraft(lastSavedHighlightsRef.current);
      }
      setHighlightPickerError("Couldn't update the Home highlights right now.");
    } finally {
      highlightSaveInFlightRef.current = false;
      if (queuedHighlightDraftRef.current) {
        void processQueuedHighlightSave();
      } else {
        setIsHighlightSyncing(false);
      }
    }
  }, [queryClient]);

  useEffect(() => {
    const nextHighlights = {
      todaysSpecialId: settings?.todaysSpecialProductId || "",
      featuredProductIds: settings?.featuredProductIds || [],
    };

    lastSavedHighlightsRef.current = nextHighlights;
    setHighlightDraft((currentDraft) =>
      areHomeHighlightsEqual(currentDraft, nextHighlights)
        ? currentDraft
        : nextHighlights,
    );
  }, [settings?.featuredProductIds, settings?.todaysSpecialProductId]);

  useEffect(() => {
    if (!isAdminHomePicker) return undefined;
    if (areHomeHighlightsEqual(highlightDraft, lastSavedHighlightsRef.current)) {
      return undefined;
    }

    if (highlightSaveTimeoutRef.current) {
      clearTimeout(highlightSaveTimeoutRef.current);
    }

    highlightSaveTimeoutRef.current = setTimeout(() => {
      queuedHighlightDraftRef.current = {
        todaysSpecialId: highlightDraft.todaysSpecialId,
        featuredProductIds: [...highlightDraft.featuredProductIds],
      };
      void processQueuedHighlightSave();
    }, 220);

    return () => {
      if (highlightSaveTimeoutRef.current) {
        clearTimeout(highlightSaveTimeoutRef.current);
      }
    };
  }, [highlightDraft, isAdminHomePicker, processQueuedHighlightSave]);

  useEffect(
    () => () => {
      if (highlightSaveTimeoutRef.current) {
        clearTimeout(highlightSaveTimeoutRef.current);
      }
    },
    [],
  );

  const handleSetTodaysSpecial = (productId) => {
    setHighlightPickerError("");
    setHighlightDraft((prev) => ({
      ...prev,
      todaysSpecialId: productId,
    }));
  };

  const handleToggleFeaturedProduct = (productId) => {
    setHighlightPickerError("");
    setHighlightDraft((prev) => {
      const alreadySelected = prev.featuredProductIds.includes(productId);
      if (!alreadySelected && prev.featuredProductIds.length >= 6) {
        setHighlightPickerError("You can only keep up to 6 products on Home.");
        return prev;
      }

      return {
        ...prev,
        featuredProductIds: alreadySelected
          ? prev.featuredProductIds.filter((id) => id !== productId)
          : [...prev.featuredProductIds, productId],
      };
    });
  };

  if (categoriesLoading || productsLoading) {
    return <PageHeroSkeleton cards={6} sidebar />;
  }

  return (
    <section className="section-shell">
      {isAdminHomePicker && (
        <div className="sticky top-24 z-20 mb-6 pt-2">
          <div className={adminPickerBannerClass}>
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isDayTheme ? "text-espresso" : "text-cream",
                )}
              >
                Home highlights picker
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  isDayTheme ? "text-cocoa/68" : "text-cocoa/78",
                )}
              >
                Choose items directly from the menu. Use{" "}
                <span className="font-semibold">Add to Home</span> or{" "}
                <span className="font-semibold">Today&apos;s Special</span>,
                then head back when you&apos;re done.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isHighlightSyncing && <Badge>Syncing...</Badge>}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleReturnToAdminHighlights}
              >
                Back
              </Button>
            </div>
          </div>
          {highlightPickerError && (
            <div className={highlightPickerErrorClass}>{highlightPickerError}</div>
          )}
        </div>
      )}
      {orderEditSession?.orderId && (
        <div className="sticky top-24 z-20 mb-6 pt-2">
          <div className={orderEditBannerClass}>
            <div>
              <p className={cn("text-sm font-semibold", isDayTheme ? "text-espresso" : "text-cream")}>
                Adding to order #{orderEditSession.orderId}
              </p>
              <p className={cn("mt-1 text-xs", isDayTheme ? "text-cocoa/68" : "text-cocoa/78")}>
                Pick a menu item, open it, then attach it to the same order.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={handleReturnToOrder}>
                Back To Your Order
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="card relative overflow-hidden p-8">
        <div className="absolute right-[-120px] top-[-80px] h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-espresso sm:text-4xl">
              Menu
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cocoa/70 sm:text-base">
              Crafted blends, signature espresso, and elevated moments. Filter
              by taste, size, and price to find your perfect cup.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SparkIcon className="h-6 w-6 text-gold" />
            <span className="text-xs uppercase tracking-[0.3em] text-cocoa/70">
              Luxury
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            className="lg:hidden"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <FilterIcon className="h-4 w-4" />
            Filters
          </Button>
          <Badge>{filteredProducts.length} items</Badge>
          <Badge variant="highlight">Luxury Selection</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside
          className={`card p-5 ${showFilters ? "block" : "hidden lg:block"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-espresso">Filters</h2>
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/70" />
              <Input
                type="text"
                placeholder="Search drinks..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-9"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-cocoa/70">Category</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button
                  size="sm"
                  variant={!filters.category ? "default" : "secondary"}
                  className="w-full text-xs"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, category: "" }))
                  }
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    size="sm"
                    variant={
                      filters.category === category._id
                        ? "default"
                        : "secondary"
                    }
                    className="w-full text-xs"
                    key={category._id}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        category: category._id,
                      }))
                    }
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <SelectMenu
              label="Size"
              value={filters.size}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, size: value }))
              }
              placeholder="Any size"
              options={sizes.map((size) => ({ label: size, value: size }))}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                placeholder="Min JD"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minPrice: e.target.value }))
                }
              />
              <Input
                type="number"
                placeholder="Max JD"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))
                }
              />
            </div>

            <SelectMenu
              label="Sort by"
              value={filters.sort}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, sort: value }))
              }
              placeholder="Newest"
              options={[
                { label: "Newest", value: "newest" },
                { label: "Price: Low to High", value: "price-asc" },
                { label: "Price: High to Low", value: "price-desc" },
                { label: "Name: A to Z", value: "name-asc" },
              ]}
            />

            <label className="flex items-center gap-2 text-xs text-cocoa/70">
              <input
                type="checkbox"
                checked={filters.showUnavailable}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    showUnavailable: e.target.checked,
                  }))
                }
                className="accent-gold"
              />
              Show unavailable items
            </label>
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-cocoa/70">
              Showing {filteredProducts.length} curated items
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-cocoa/60">
                No items match these filters.
              </p>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAdd={addItem}
                  orderEditSession={orderEditSession}
                  customActions={
                    isAdminHomePicker ? (
                      <>
                        <Button
                          type="button"
                          variant={
                            currentTodaysSpecialId === product._id
                              ? "default"
                              : "secondary"
                          }
                          className="w-full"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetTodaysSpecial(product._id);
                          }}
                        >
                          {currentTodaysSpecialId === product._id
                            ? "Today's Special"
                            : "Set as Today's Special"}
                        </Button>
                        <Button
                          type="button"
                          variant={
                            currentFeaturedIds.includes(product._id)
                              ? "default"
                              : "outline"
                          }
                          className="w-full"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleFeaturedProduct(product._id);
                          }}
                        >
                          {currentFeaturedIds.includes(product._id)
                            ? "Remove from Home"
                            : "Add to Home"}
                        </Button>
                      </>
                    ) : null
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
