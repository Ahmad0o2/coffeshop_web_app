import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useTheme from "../../hooks/useTheme";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { connectSocket } from "../../services/socketClient";
import { cn } from "../../lib/utils";
import OrdersTab from "./OrdersTab";
import ProductsTab from "./ProductsTab";
import InventoryTab from "./InventoryTab";
import EventsTab from "./EventsTab";
import RewardsTab from "./RewardsTab";
import BrandTab from "./BrandTab";
import StaffTab from "./StaffTab";
import {
  fetchAdminEvents,
  fetchAdminRewards,
  fetchCategories,
  fetchOrders,
  fetchProducts,
  fetchStaff,
  socketUrl,
} from "./shared.js";
import {
  DashboardSidebarNavItems,
  DashboardStatCard,
  DashboardUtilityIcon,
} from "./components.jsx";
import {
  isProductLowStock,
  isProductOutOfStock,
} from "../../utils/inventory";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNavCompact, setIsNavCompact] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "Admin";
  const permissions = user?.permissions || [];
  const canManageOrders = isAdmin || permissions.includes("manageOrders");
  const canManageProducts = isAdmin || permissions.includes("manageProducts");
  const canManageEvents = isAdmin || permissions.includes("manageEvents");
  const canManageRewards = isAdmin || permissions.includes("manageRewards");
  const canManageBrand = isAdmin || permissions.includes("manageBrand");

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(api),
    enabled: isAuthenticated && canManageOrders,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(api),
    enabled: isAuthenticated && (canManageProducts || canManageRewards),
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(api),
    enabled: isAuthenticated && canManageProducts,
  });

  const { data: adminEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => fetchAdminEvents(api),
    enabled: isAuthenticated && canManageEvents,
  });

  const { data: adminRewards = [], refetch: refetchRewards } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: () => fetchAdminRewards(api),
    enabled: isAuthenticated && canManageRewards,
  });

  const { data: staffList = [], refetch: refetchStaff } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => fetchStaff(api),
    enabled: isAuthenticated && isAdmin,
  });

  const { data: settings, refetch: refetchSettings } = useSettings();

  const patchOrderCache = useCallback(
    (orderId, updater) => {
      queryClient.setQueryData(["admin-orders"], (current = []) =>
        current.map((order) => {
          if (order._id !== orderId) return order;
          return typeof updater === "function"
            ? updater(order)
            : { ...order, ...updater };
        }),
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;

    const socket = connectSocket(socketUrl, {
      auth: { userId: String(user.id), role: user.role },
    });

    const handleCatalogChange = () => {
      if (canManageProducts || canManageRewards) {
        refetchProducts();
      }
      if (canManageProducts) {
        refetchCategories();
      }
      if (canManageRewards) {
        refetchRewards();
      }
    };

    const handleEventsChange = (payload) => {
      if (
        payload?.action === "registration-updated" &&
        payload?.eventId &&
        typeof payload?.registrationsCount === "number"
      ) {
        queryClient.setQueryData(["admin-events"], (current = []) =>
          current.map((event) =>
            event._id === payload.eventId
              ? { ...event, registrationsCount: payload.registrationsCount }
              : event,
          ),
        );
      }
      if (canManageEvents) {
        refetchEvents();
      }
    };

    const handleRewardsChange = () => {
      if (canManageRewards) {
        refetchRewards();
      }
    };

    const handleOrderChange = (payload) => {
      if (payload?.orderId) {
        patchOrderCache(payload.orderId, (order) => ({
          ...order,
          status: payload.status || order.status,
          feedback: payload.feedback || order.feedback,
        }));
      }
      if (canManageOrders) {
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      }
      if (canManageProducts || canManageRewards) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    };

    const handleStaffChange = () => {
      if (isAdmin) {
        refetchStaff();
      }
    };

    socket.on("catalog:changed", handleCatalogChange);
    socket.on("events:changed", handleEventsChange);
    socket.on("rewards:changed", handleRewardsChange);
    socket.on("order:new", handleOrderChange);
    socket.on("order:status", handleOrderChange);
    socket.on("order:updated", handleOrderChange);
    socket.on("order:feedback", handleOrderChange);
    socket.on("staff:changed", handleStaffChange);

    return () => {
      socket.off("catalog:changed", handleCatalogChange);
      socket.off("events:changed", handleEventsChange);
      socket.off("rewards:changed", handleRewardsChange);
      socket.off("order:new", handleOrderChange);
      socket.off("order:status", handleOrderChange);
      socket.off("order:updated", handleOrderChange);
      socket.off("order:feedback", handleOrderChange);
      socket.off("staff:changed", handleStaffChange);
    };
  }, [
    canManageEvents,
    canManageOrders,
    canManageProducts,
    canManageRewards,
    isAdmin,
    isAuthenticated,
    patchOrderCache,
    queryClient,
    refetchCategories,
    refetchEvents,
    refetchProducts,
    refetchRewards,
    refetchStaff,
    user,
  ]);

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (canManageOrders) tabs.push("orders");
    if (canManageProducts) tabs.push("products");
    if (canManageProducts) tabs.push("inventory");
    if (canManageRewards) tabs.push("rewards");
    if (canManageBrand) tabs.push("brand");
    if (canManageBrand) tabs.push("gallery");
    if (canManageEvents) tabs.push("events");
    if (isAdmin) tabs.push("manage");
    return tabs;
  }, [
    canManageBrand,
    canManageEvents,
    canManageOrders,
    canManageProducts,
    canManageRewards,
    isAdmin,
  ]);

  const activeTab = useMemo(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab && availableTabs.includes(requestedTab)) {
      return requestedTab;
    }
    return availableTabs[0] || "orders";
  }, [availableTabs, searchParams]);

  const activeProductEditId = activeTab === "products" ? searchParams.get("editProduct") || "" : "";

  const updateSearchParams = useCallback(
    (updater) => {
      const nextParams = new URLSearchParams(searchParams);
      updater(nextParams);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setActiveTab = useCallback(
    (nextTab) => {
      updateSearchParams((nextParams) => {
        if (nextTab === (availableTabs[0] || "orders")) {
          nextParams.delete("tab");
        } else {
          nextParams.set("tab", nextTab);
        }

        if (nextTab !== "products") {
          nextParams.delete("editProduct");
        }
      });
    },
    [availableTabs, updateSearchParams],
  );

  const handleDashboardTabChange = useCallback(
    (nextTab) => {
      setActiveTab(nextTab);
      setIsMobileNavOpen(false);
    },
    [setActiveTab],
  );

  const openProductEditor = useCallback(
    (productId) => {
      updateSearchParams((nextParams) => {
        if (availableTabs[0] === "products") {
          nextParams.delete("tab");
        } else {
          nextParams.set("tab", "products");
        }
        nextParams.set("editProduct", productId);
      });
    },
    [availableTabs, updateSearchParams],
  );

  const clearProductEditor = useCallback(() => {
    updateSearchParams((nextParams) => {
      nextParams.delete("editProduct");
    });
  }, [updateSearchParams]);

  useEffect(() => {
    if (!availableTabs.length) return;
    const requestedTab = searchParams.get("tab");
    if (requestedTab && !availableTabs.includes(requestedTab)) {
      updateSearchParams((nextParams) => {
        nextParams.delete("tab");
        nextParams.delete("editProduct");
      });
    }
  }, [availableTabs, searchParams, updateSearchParams]);

  useEffect(() => {
    if (activeTab === "products") return;
    if (!searchParams.has("editProduct")) return;
    updateSearchParams((nextParams) => {
      nextParams.delete("editProduct");
    });
  }, [activeTab, searchParams, updateSearchParams]);

  useEffect(() => {
    if (!isMobileNavOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  const isDayTheme = theme === "day";
  const dashboardHeroClass =
    "card relative overflow-hidden border border-gold/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)),rgba(16,12,11,0.95)] p-6 shadow-[0_24px_64px_rgba(18,11,9,0.12)]";
  const dashboardPanelClass =
    "card relative h-fit overflow-hidden border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)),rgba(17,13,12,0.94)] p-6 shadow-[0_24px_60px_rgba(15,9,8,0.12)]";
  const ordersPanelClass = cn(dashboardPanelClass, "overflow-visible pb-10");
  const dashboardItemClass =
    "rounded-[1.35rem] border border-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(19,14,12,0.56)] p-4 transition-colors hover:border-gold/20";
  const dashboardCompactItemClass =
    "rounded-[1.2rem] border border-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(19,14,12,0.56)] p-3 transition-colors hover:border-gold/20";
  const dashboardSidebarClass =
    theme === "day"
      ? "card relative overflow-hidden rounded-[2.4rem] border border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] p-4 shadow-[0_6px_16px_rgba(34,71,70,0.025)] transition-all duration-300"
      : "card relative overflow-hidden rounded-[2.4rem] border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)),rgba(14,11,10,0.94)] p-4 shadow-[0_24px_56px_rgba(13,9,8,0.12)] transition-all duration-300";
  const orderSummaryPillClass = cn(
    "rounded-full border px-3 py-2 text-xs font-semibold",
    isDayTheme
      ? "border-[#3f7674]/16 bg-[#eef7f6] text-[#315f5e]"
      : "border-gold/16 bg-[rgba(28,21,19,0.9)] text-cocoa/82",
  );
  const orderFiltersCardClass = cn(
    dashboardCompactItemClass,
    isDayTheme
      ? "border-[#3f7674]/20 bg-[#f7fbfb] shadow-[0_9px_20px_rgba(34,71,70,0.045)]"
      : "border-gold/20 bg-[rgba(23,17,15,0.96)] shadow-[0_20px_40px_rgba(11,8,7,0.22)]",
  );
  const orderCardClass = cn(
    dashboardItemClass,
    isDayTheme
      ? "border-[#3f7674]/18 bg-[#fbfdfd] shadow-[0_10px_22px_rgba(34,71,70,0.05)]"
      : "border-gold/18 bg-[rgba(21,16,14,0.96)] shadow-[0_22px_44px_rgba(10,7,6,0.24)]",
  );
  const orderGroupClass = cn(
    "space-y-4 border-l pl-4",
    isDayTheme ? "border-[#3f7674]/18" : "border-gold/16",
  );
  const orderItemsListClass = cn(
    "mt-3 divide-y",
    isDayTheme ? "divide-[#3f7674]/10" : "divide-gold/10",
  );
  const orderLineItemClass = "py-3 first:pt-0 last:pb-0";

  const dashboardUserLabel =
    user?.fullName || user?.username || user?.email || "Team member";
  const homeDisplayGallery = settings?.homeDisplayUrls || [];
  const galleryDisplay = settings?.galleryUrls || [];
  const openOrdersCount = orders.filter(
    (order) => !["Completed", "Cancelled"].includes(order.status),
  ).length;
  const activeEventsCount = adminEvents.filter((event) => event.isActive).length;
  const activeRewardsCount = adminRewards.filter(
    (reward) => reward.isActive !== false,
  ).length;
  const trackedInventoryProductsCount = products.filter(
    (product) =>
      product.inventoryQuantity !== null &&
      product.inventoryQuantity !== undefined,
  ).length;
  const lowStockProductsCount = products.filter((product) => isProductLowStock(product)).length;
  const outOfStockProductsCount = products.filter((product) => isProductOutOfStock(product)).length;
  const inventoryAlertCount = lowStockProductsCount + outOfStockProductsCount;
  const inventoryAlertTone = outOfStockProductsCount > 0 ? "danger" : "warning";

  const dashboardStats = [
    canManageOrders
      ? {
          key: "orders",
          label: "Open Orders",
          value: openOrdersCount,
          note: `${orders.length} total in queue`,
        }
      : null,
    canManageProducts
      ? {
          key: "products",
          label: "Menu Items",
          value: products.length,
          note: `${categories.length} categories live`,
        }
      : null,
    canManageProducts
      ? {
          key: "inventory",
          label: "Tracked Inventory",
          value: trackedInventoryProductsCount,
          note: `${lowStockProductsCount} low stock alerts`,
        }
      : null,
    canManageRewards
      ? {
          key: "rewards",
          label: "Active Rewards",
          value: activeRewardsCount,
          note: `${adminRewards.length} configured rewards`,
        }
      : null,
    canManageEvents
      ? {
          key: "events",
          label: "Live Events",
          value: activeEventsCount,
          note: `${adminEvents.length} events on the calendar`,
        }
      : null,
    isAdmin
      ? {
          key: "team",
          label: "Team Access",
          value: staffList.length,
          note: "staff accounts managed here",
        }
      : null,
  ].filter(Boolean);

  const activeDashboardStat = (() => {
    const statKey =
      activeTab === "manage"
        ? "team"
        : ["orders", "products", "inventory", "rewards", "events"].includes(activeTab)
          ? activeTab
          : null;

    if (!statKey) return null;
    return dashboardStats.find((stat) => stat.key === statKey) || null;
  })();

  const dashboardTabs = [
    canManageOrders
      ? {
          key: "orders",
          label: "Orders",
          caption: "Queue and status flow",
          count: orders.length,
          icon: "orders",
        }
      : null,
    canManageProducts
      ? {
          key: "products",
          label: "Products",
          caption: "Menu and categories",
          count: products.length,
          icon: "products",
        }
      : null,
    canManageProducts
      ? {
          key: "inventory",
          label: "Inventory",
          caption: "Stock and availability",
          count: trackedInventoryProductsCount,
          alertCount: inventoryAlertCount,
          alertTone: inventoryAlertTone,
          icon: "inventory",
        }
      : null,
    canManageRewards
      ? {
          key: "rewards",
          label: "Rewards",
          caption: "Points and redemption setup",
          count: adminRewards.length,
          icon: "rewards",
        }
      : null,
    canManageBrand
      ? {
          key: "brand",
          label: "Home Media",
          caption: "Branding and homepage assets",
          count: homeDisplayGallery.length,
          icon: "gallery",
        }
      : null,
    canManageBrand
      ? {
          key: "gallery",
          label: "Gallery",
          caption: "Gallery page visuals",
          count: galleryDisplay.length,
          icon: "brand",
        }
      : null,
    canManageEvents
      ? {
          key: "events",
          label: "Events",
          caption: "Registrations and highlights",
          count: adminEvents.length,
          icon: "events",
        }
      : null,
    isAdmin
      ? {
          key: "manage",
          label: "Manage",
          caption: "Staff roles and permissions",
          count: staffList.length,
          icon: "manage",
        }
      : null,
  ].filter(Boolean);

  const activeTabMeta =
    dashboardTabs.find((tab) => tab.key === activeTab) || dashboardTabs[0] || null;

  if (!isAuthenticated || availableTabs.length === 0) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-espresso">Admin Dashboard</h1>
        <p className="mt-4 text-sm text-cocoa/70">
          You do not have access to this dashboard. Please sign in with a staff or admin account.
        </p>
      </section>
    );
  }

  const dashboardLayoutClass = cn(
    "mt-6 grid gap-6 2xl:gap-8",
    isNavCompact
      ? "xl:grid-cols-[96px_minmax(0,1fr)]"
      : "xl:grid-cols-[290px_minmax(0,1fr)]",
  );
  const dashboardAsideClass = cn(
    "transition-all duration-300 xl:sticky xl:top-24 xl:self-start",
    isNavCompact ? "xl:-ml-3" : "",
  );
  const dashboardSidebarFrameClass = cn(
    dashboardSidebarClass,
    "xl:h-[calc(100vh-7rem)]",
  );

  let tabContent = null;

  if (activeTab === "orders") {
    tabContent = (
      <OrdersTab
        orders={orders}
        dashboardPanelClass={dashboardPanelClass}
        orderCardClass={orderCardClass}
        orderFiltersCardClass={orderFiltersCardClass}
        orderGroupClass={orderGroupClass}
        orderItemsListClass={orderItemsListClass}
        orderLineItemClass={orderLineItemClass}
        orderSummaryPillClass={orderSummaryPillClass}
        isDayTheme={isDayTheme}
      />
    );
  }

  if (activeTab === "products") {
    tabContent = (
      <ProductsTab
        products={products}
        categories={categories}
        refetchProducts={refetchProducts}
        refetchCategories={refetchCategories}
        dashboardPanelClass={dashboardPanelClass}
        dashboardCompactItemClass={dashboardCompactItemClass}
        trackedInventoryProductsCount={trackedInventoryProductsCount}
        lowStockProductsCount={lowStockProductsCount}
        outOfStockProductsCount={outOfStockProductsCount}
        editProductId={activeProductEditId}
        onClearEditProduct={clearProductEditor}
      />
    );
  }

  if (activeTab === "inventory") {
    tabContent = (
      <InventoryTab
        products={products}
        categories={categories}
        refetchProducts={refetchProducts}
        onOpenProduct={openProductEditor}
        dashboardCompactItemClass={dashboardCompactItemClass}
        dashboardItemClass={dashboardItemClass}
        dashboardPanelClass={dashboardPanelClass}
        isDayTheme={isDayTheme}
      />
    );
  }

  if (activeTab === "rewards") {
    tabContent = (
      <RewardsTab
        adminRewards={adminRewards}
        products={products}
        refetchRewards={refetchRewards}
        dashboardItemClass={dashboardItemClass}
        dashboardPanelClass={dashboardPanelClass}
      />
    );
  }

  if (activeTab === "brand") {
    tabContent = (
      <BrandTab
        mode="brand"
        settings={settings}
        refetchSettings={refetchSettings}
        products={products}
        categories={categories}
        dashboardCompactItemClass={dashboardCompactItemClass}
        dashboardItemClass={dashboardItemClass}
        dashboardPanelClass={dashboardPanelClass}
        isDayTheme={isDayTheme}
      />
    );
  }

  if (activeTab === "gallery") {
    tabContent = (
      <BrandTab
        mode="gallery"
        settings={settings}
        refetchSettings={refetchSettings}
        products={products}
        categories={categories}
        dashboardCompactItemClass={dashboardCompactItemClass}
        dashboardItemClass={dashboardItemClass}
        dashboardPanelClass={dashboardPanelClass}
        isDayTheme={isDayTheme}
      />
    );
  }

  if (activeTab === "events") {
    tabContent = (
      <EventsTab
        adminEvents={adminEvents}
        settings={settings}
        refetchEvents={refetchEvents}
        refetchSettings={refetchSettings}
        dashboardItemClass={dashboardItemClass}
        dashboardPanelClass={dashboardPanelClass}
      />
    );
  }

  if (activeTab === "manage" && isAdmin) {
    tabContent = (
      <StaffTab
        isAdmin={isAdmin}
        staffList={staffList}
        refetchStaff={refetchStaff}
        dashboardItemClass={dashboardItemClass}
        dashboardPanelClass={dashboardPanelClass}
      />
    );
  }

  return (
    <section className="section-shell !max-w-[96rem] 2xl:!max-w-[112rem]">
      <div className={dashboardHeroClass}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="highlight" className="w-fit px-3 py-1 uppercase tracking-[0.22em]">
                Admin Workspace
              </Badge>
              <Badge>{isAdmin ? "Administrator" : "Staff"}</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-espresso sm:text-[2.35rem]">
                Admin Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cocoa/70">
                A cleaner control surface for orders, content, rewards, events, and team access, with the same functionality and better structure.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-cocoa/65 xl:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="border border-gold/15 bg-obsidian/50 xl:hidden"
              onClick={() => setIsMobileNavOpen(true)}
            >
              Navigation
            </Button>
            <span className="rounded-full border border-gold/15 bg-obsidian/55 px-3 py-1.5">
              Signed in as {dashboardUserLabel}
            </span>
            <span className="rounded-full border border-gold/15 bg-obsidian/55 px-3 py-1.5">
              Active workspace: {activeTabMeta?.label || "Dashboard"}
            </span>
          </div>
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-obsidian/65 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 w-[84vw] max-w-[21rem] p-3">
            <div className={cn(dashboardSidebarClass, "h-full rounded-[2rem] p-4")}>
              <div className="flex h-full flex-col">
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 border-b pb-4",
                    isDayTheme ? "border-[#3f7674]/12" : "border-gold/10",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] border",
                        isDayTheme
                          ? "border-[#3f7674]/14 bg-[#e7f2f1]"
                          : "border-gold/18 bg-gold/12",
                      )}
                    >
                      <DashboardUtilityIcon icon="workspace" isDayTheme={isDayTheme} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
                        Cortina.D Admin
                      </p>
                      <p className="mt-1 text-xs leading-5 text-cocoa/62">Workspace navigation</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      isDayTheme
                        ? "border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] text-espresso hover:border-[#3f7674]/24 hover:bg-[#eaf3f2]"
                        : "border-gold/15 bg-obsidian/60 text-espresso hover:border-gold/30 hover:bg-obsidian/75",
                    )}
                    aria-label="Close navigation"
                  >
                    X
                  </button>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <DashboardSidebarNavItems
                    dashboardTabs={dashboardTabs}
                    activeTab={activeTab}
                    onTabSelect={handleDashboardTabChange}
                    isAdmin={isAdmin}
                    onActivityNavigate={() => setIsMobileNavOpen(false)}
                    isDayTheme={isDayTheme}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={dashboardLayoutClass}>
        <aside className={cn(dashboardAsideClass, "hidden xl:block")}>
          <div className={dashboardSidebarFrameClass}>
            <div className="flex h-full flex-col pt-12">
              <button
                type="button"
                onClick={() => setIsNavCompact((prev) => !prev)}
                className={cn(
                  "absolute top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isDayTheme
                    ? "border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] text-espresso hover:border-[#3f7674]/24 hover:bg-[#eaf3f2]"
                    : "border-gold/15 bg-obsidian/60 text-espresso hover:border-gold/30 hover:bg-obsidian/75",
                  isNavCompact ? "left-1/2 -translate-x-1/2" : "right-3",
                )}
                aria-label={isNavCompact ? "Expand navigation" : "Collapse navigation"}
                title={isNavCompact ? "Expand navigation" : "Collapse navigation"}
              >
                {isNavCompact ? ">" : "<"}
              </button>

              <div
                className={cn(
                  "flex items-center gap-3 border-b pb-4",
                  isDayTheme ? "border-[#3f7674]/12" : "border-gold/10",
                  isNavCompact ? "hidden pr-0 xl:hidden" : "pr-12",
                )}
              >
                <div
                  className={cn(
                    "inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] border",
                    isDayTheme
                      ? "border-[#3f7674]/14 bg-[#e7f2f1]"
                      : "border-gold/18 bg-gold/12",
                  )}
                >
                  <DashboardUtilityIcon icon="workspace" isDayTheme={isDayTheme} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
                    Cortina.D Admin
                  </p>
                  <p className="mt-1 text-xs leading-5 text-cocoa/62">Workspace navigation</p>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <DashboardSidebarNavItems
                  dashboardTabs={dashboardTabs}
                  activeTab={activeTab}
                  onTabSelect={handleDashboardTabChange}
                  isCompact={isNavCompact}
                  isAdmin={isAdmin}
                  isDayTheme={isDayTheme}
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div
            className={cn(
              "grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-stretch",
              !activeDashboardStat && "xl:grid-cols-1",
            )}
          >
            <div className={ordersPanelClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
                    Current Workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-espresso">
                    {activeTabMeta?.label || "Dashboard"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-cocoa/62">
                    {activeTabMeta?.caption || "Switch between tabs to manage different areas."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{activeTabMeta?.count ?? 0} items</Badge>
                  <span className="rounded-full border border-gold/15 bg-obsidian/55 px-3 py-1.5 text-xs text-cocoa/65">
                    Access: {isAdmin ? "Administrator" : "Staff"}
                  </span>
                </div>
              </div>
            </div>

            {activeDashboardStat && (
              <div className="max-w-[14rem] xl:h-full xl:justify-self-end">
                <DashboardStatCard
                  label={activeDashboardStat.label}
                  value={activeDashboardStat.value}
                  note={activeDashboardStat.note}
                />
              </div>
            )}
          </div>

          {tabContent}
        </div>
      </div>
    </section>
  );
}
