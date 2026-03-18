import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Link, useLocation } from "react-router-dom";
import useCart from "../../hooks/useCart";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import api from "../../services/api";
import {
  CartIcon,
  CloseIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
} from "./Icons";
import { Button } from "../ui/button";
import useTheme from "../../hooks/useTheme";

const fetchRewardHistory = async () => {
  const { data } = await api.get("/rewards/history");
  return data.redemptions || [];
};
const defaultLogoSrc = "/brand_logo.webp";

export default function Navbar() {
  const { items, lastAdded, selectedRewardRedemptions } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const { data: settings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const itemCount =
    items.reduce((sum, item) => sum + item.quantity, 0) +
    selectedRewardRedemptions.length;
  const { data: rewardHistory = [] } = useQuery({
    queryKey: ["reward-history"],
    queryFn: fetchRewardHistory,
    enabled: isAuthenticated,
    refetchOnMount: 'always',
  });
  const redeemedReadyCount = rewardHistory.filter(
    (entry) => entry.status === "Redeemed",
  ).length;
  const isDashboardUser = ["Admin", "Staff"].includes(user?.role);
  const showAdminMobileNav = isDashboardUser && !isDesktopViewport;
  const isAdmin = user?.role === "Admin";
  const permissions = user?.permissions || [];
  const canManageOrders = isAdmin || permissions.includes("manageOrders");
  const canManageProducts = isAdmin || permissions.includes("manageProducts");
  const canManageEvents = isAdmin || permissions.includes("manageEvents");
  const canManageRewards = isAdmin || permissions.includes("manageRewards");
  const canManageBrand = isAdmin || permissions.includes("manageBrand");
  const isDayTheme = theme === "day";
  const navClass = ({ isActive }) =>
    isDayTheme
      ? isActive
        ? "text-[#315f5e]"
        : "text-cocoa/88 hover:text-[#315f5e]"
      : isActive
        ? "text-gold"
        : "text-cocoa/80 hover:text-cream";
  const headerClass = isDayTheme
    ? "sticky top-0 z-30 border-b border-[#3f7674]/12 bg-[rgba(248,252,252,0.96)] backdrop-blur md:z-30"
    : "sticky top-0 z-30 border-b border-gold/20 bg-obsidian md:bg-obsidian/90 backdrop-blur md:z-30";
  const brandTitleClass = isDayTheme
    ? "text-sm font-semibold text-espresso"
    : "text-sm font-semibold text-cream";
  const brandSubtitleClass = isDayTheme ? "text-xs text-cocoa/78" : "text-xs text-cocoa/70";
  const mobileIconButtonClass = isDayTheme
    ? "relative inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] px-3 text-espresso shadow-[0_10px_24px_rgba(34,71,70,0.08)]"
    : "relative inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-gold/30 bg-obsidian/70 px-3 text-cream shadow-card";
  const mobileMenuCircleClass = isDayTheme
    ? "flex h-9 w-9 items-center justify-center rounded-full border border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)]"
    : "flex h-9 w-9 items-center justify-center rounded-full border border-gold/30";
  const mobileMenuIconClass = isDayTheme ? "h-5 w-5 text-espresso" : "h-5 w-5 text-cream";
  const mobileOverlayClass = isDayTheme
    ? "fixed inset-0 z-50 overscroll-none bg-[rgba(34,71,70,0.18)] backdrop-blur-sm"
    : "fixed inset-0 z-50 overscroll-none bg-obsidian/70 backdrop-blur-sm";
  const mobileDrawerClass = isDayTheme
    ? "absolute right-0 top-0 z-[60] flex h-[100dvh] w-[86%] max-w-sm flex-col overflow-hidden bg-[#f8fcfc] shadow-2xl ring-1 ring-[#3f7674]/12 sm:w-[85%]"
    : "absolute right-0 top-0 z-[60] flex h-[100dvh] w-[86%] max-w-sm flex-col overflow-hidden bg-obsidian shadow-2xl ring-1 ring-gold/20 sm:w-[85%]";
  const mobileDrawerHeaderClass = isDayTheme
    ? "flex items-center justify-between border-b border-[#3f7674]/12 px-5 py-4"
    : "flex items-center justify-between border-b border-gold/20 px-5 py-4";
  const mobileDrawerTitleClass = isDayTheme
    ? "text-sm font-semibold text-espresso"
    : "text-sm font-semibold text-cream";
  const mobileDrawerBodyClass = isDayTheme
    ? "flex min-h-0 flex-1 flex-col bg-[#f8fcfc] text-xl font-semibold leading-8 text-espresso"
    : "flex min-h-0 flex-1 flex-col bg-obsidian text-xl font-semibold leading-8 text-cream";
  const mobileDrawerLinksClass = isDayTheme
    ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 pr-4 [touch-action:pan-y]"
    : "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 pr-4 [touch-action:pan-y]";
  const mobileDrawerLinksInnerClass = "flex flex-col gap-6 pb-14";
  const mobileCloseClass = isDayTheme ? "btn-ghost text-espresso" : "btn-ghost";
  const mobileActivityBubbleClass = isDayTheme
    ? "pointer-events-none absolute -bottom-11 right-0 whitespace-nowrap rounded-full border border-[#3f7674]/14 bg-[#f8fcfc] px-3 py-1 text-[11px] font-semibold text-espresso shadow-[0_8px_18px_rgba(34,71,70,0.08)] animate-[fade-up_0.35s_ease]"
    : "pointer-events-none absolute -bottom-11 right-0 whitespace-nowrap rounded-full border border-gold/30 bg-obsidian px-3 py-1 text-[11px] font-semibold text-cream shadow-card animate-[fade-up_0.35s_ease]";
  const rewardReadyBubbleClass = isDayTheme
    ? "pointer-events-none absolute -bottom-11 right-0 whitespace-nowrap rounded-full border border-[#3f7674]/18 bg-[#e7f2f1] px-3 py-1 text-[11px] font-semibold text-[#315f5e] shadow-[0_8px_18px_rgba(34,71,70,0.08)] animate-[fade-up_0.35s_ease]"
    : "pointer-events-none absolute -bottom-11 right-0 whitespace-nowrap rounded-full border border-gold/35 bg-[#221814] px-3 py-1 text-[11px] font-semibold text-gold shadow-card animate-[fade-up_0.35s_ease]";
  const desktopThemeButtonClass = isDayTheme
    ? "gap-2 rounded-full border border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] px-3 text-espresso shadow-[0_10px_24px_rgba(34,71,70,0.06)] hover:bg-[#deeeee]"
    : "gap-2 rounded-full !border !border-gold/40 !bg-obsidian/60 px-3 !text-espresso !shadow-none outline-none focus-visible:!ring-0 focus-visible:!outline-none hover:!border-gold/55 hover:!bg-obsidian/75";
  const mobileThemeButtonClass = isDayTheme
    ? "w-fit gap-2 rounded-full border border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] px-3 text-espresso shadow-[0_10px_24px_rgba(34,71,70,0.06)] hover:bg-[#deeeee]"
    : "w-fit gap-2 rounded-full !border !border-gold/40 !bg-obsidian/60 px-3 !text-espresso !shadow-none outline-none focus-visible:!ring-0 focus-visible:!outline-none hover:!border-gold/55 hover:!bg-obsidian/75";
  const mobileLogoutButtonClass = isDayTheme
    ? "mt-2 w-fit border-[#3f7674]/16 text-espresso hover:bg-[#deeeee]"
    : "mt-2 w-fit border-gold/30 text-cream hover:bg-cream/10";
  const adminMenuSectionTitleClass =
    "text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55";
  const adminDrawerItemClass = ({ isActive }) =>
    [
      "group flex items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-3 text-left text-base font-semibold transition-all",
      isDayTheme
        ? isActive
          ? "border-[#3f7674]/30 bg-[#deeeee] text-[#315f5e]"
          : "border-[#3f7674]/10 bg-[rgba(248,252,252,0.92)] text-espresso hover:border-[#3f7674]/20 hover:bg-[#eef6f5]"
        : isActive
          ? "border-gold/35 bg-gold/12 text-gold"
          : "border-gold/12 bg-obsidian/45 text-cream hover:border-gold/22 hover:bg-obsidian/60",
    ].join(" ");
  const adminMobileNavItems = [
    { to: "/admin", label: "Dashboard", enabled: isDashboardUser },
    { to: "/admin?tab=orders", label: "Orders", enabled: canManageOrders },
    { to: "/admin?tab=products", label: "Products", enabled: canManageProducts },
    { to: "/admin?tab=inventory", label: "Inventory", enabled: canManageProducts },
    { to: "/admin?tab=rewards", label: "Rewards", enabled: canManageRewards },
    { to: "/admin?tab=brand", label: "Home Media", enabled: canManageBrand },
    { to: "/admin?tab=gallery", label: "Gallery", enabled: canManageBrand },
    { to: "/admin?tab=events", label: "Events", enabled: canManageEvents },
    { to: "/admin?tab=manage", label: "Manage", enabled: isAdmin },
    { to: "/admin/activity", label: "Activity Log", enabled: isAdmin },
  ].filter((item) => item.enabled);
  const isAdminDrawerItemActive = (to) => {
    const [pathname, search = ""] = to.split("?");
    if (location.pathname !== pathname) return false;
    if (pathname === "/admin") {
      if (!search) return !location.search;
      return location.search === `?${search}`;
    }
    return true;
  };
  useEffect(() => {
    if (open || !menuVisible) return undefined;

    const timeoutId = setTimeout(() => setMenuVisible(false), 260);
    return () => clearTimeout(timeoutId);
  }, [open, menuVisible]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = (event) => setIsDesktopViewport(event.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!menuVisible) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
    };
  }, [menuVisible]);

  const handleOpenMenu = () => {
    setMenuVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true));
    });
  };

  const handleCloseMenu = () => {
    setOpen(false);
  };
  const logoSrc = settings?.logoUrl || defaultLogoSrc;
  const handleLogoError = (event) => {
    if (event.currentTarget.src.endsWith(defaultLogoSrc)) return;
    event.currentTarget.src = defaultLogoSrc;
  };

  return (
    <>
      <header className={headerClass}>
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Cortina.D logo"
              className="h-10 w-10 rounded-full object-cover"
              loading="eager"
              onError={handleLogoError}
            />
            <div>
              <p className={brandTitleClass}>Cortina.D</p>
              <p className={brandSubtitleClass}>Coffee House</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/menu" className={navClass}>
              Menu
            </NavLink>
            <NavLink to="/gallery" className={navClass}>
              Gallery
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/rewards" className={navClass}>
                Rewards
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/events" className={navClass}>
                Events
              </NavLink>
            )}
            <NavLink to="/location" className={navClass}>
              Location
            </NavLink>
            {isAuthenticated && (
              <>
                {isDashboardUser && (
                  <NavLink to="/admin" className={navClass}>
                    Admin Dashboard
                  </NavLink>
                )}
                <NavLink to="/orders" className={navClass}>
                  Orders
                </NavLink>
              </>
            )}
            <button className="pill">AR</button>
            <Button variant="ghost" size="sm" className={desktopThemeButtonClass} onClick={toggleTheme}>
              {theme === "day" ? (
                <>
                  <MoonIcon className="h-4 w-4" />
                  Night
                </>
              ) : (
                <>
                  <SunIcon className="h-4 w-4" />
                  Day
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div className="relative">
                <Link
                  to="/cart"
                  className={mobileIconButtonClass}
                  title={
                    redeemedReadyCount > 0
                      ? `${redeemedReadyCount} redeemed reward${
                          redeemedReadyCount > 1 ? "s are" : " is"
                        } ready for checkout`
                      : "Open cart"
                  }
                >
                  <CartIcon className="h-4 w-4" />
                  {itemCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-obsidian">
                      {itemCount}
                    </span>
                  )}
                  {redeemedReadyCount > 0 && (
                    <span className="absolute -left-1 -bottom-1 inline-flex min-w-5 items-center justify-center rounded-full bg-mint px-1.5 py-0.5 text-[10px] font-semibold text-cream">
                      {redeemedReadyCount}
                    </span>
                  )}
                </Link>
                {lastAdded && (
                  <div className={mobileActivityBubbleClass}>
                    +1 {lastAdded.name}
                  </div>
                )}
                {!lastAdded && redeemedReadyCount > 0 && (
                  <div className={rewardReadyBubbleClass}>
                    {redeemedReadyCount} redeemed reward
                    {redeemedReadyCount > 1 ? "s" : ""} ready
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleOpenMenu}
              className={mobileCloseClass}
              aria-label="Open menu"
            >
              <span className={mobileMenuCircleClass}>
                <MenuIcon className={mobileMenuIconClass} />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {menuVisible && (
        <div
          className={`${mobileOverlayClass} transition-opacity ${
              open
                ? "duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                : "duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          } ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleCloseMenu}
        >
          <div
            className={`${mobileDrawerClass} transform-gpu transition-all ${
              open
                ? "duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                : "duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            } ${
              open
                ? "translate-x-0 scale-100 opacity-100"
                : "translate-x-8 scale-[0.985] opacity-0"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={mobileDrawerHeaderClass}>
              <p className={mobileDrawerTitleClass}>
                {showAdminMobileNav ? "Admin" : "Menu"}
              </p>
              <button className={mobileCloseClass} onClick={handleCloseMenu}>
                <CloseIcon className={isDayTheme ? "h-4 w-4 text-espresso" : "h-4 w-4 text-cream"} />
              </button>
            </div>
            <div className={mobileDrawerBodyClass}>
              <div className={mobileDrawerLinksClass}>
                <div className={mobileDrawerLinksInnerClass}>
                  {showAdminMobileNav ? (
                    <>
                      <div className="space-y-2">
                        <p className={adminMenuSectionTitleClass}>Admin Navigation</p>
                        <div className="space-y-2">
                          {adminMobileNavItems.map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={adminDrawerItemClass({
                                isActive: isAdminDrawerItemActive(item.to),
                              })}
                              onClick={handleCloseMenu}
                            >
                              <span>{item.label}</span>
                              <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>
                                &gt;
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <p className={adminMenuSectionTitleClass}>Cafe Pages</p>
                        <NavLink
                          to="/"
                          className={navClass}
                          onClick={handleCloseMenu}
                          end
                        >
                          Home
                        </NavLink>
                        <NavLink
                          to="/menu"
                          className={navClass}
                          onClick={handleCloseMenu}
                        >
                          Menu
                        </NavLink>
                        <NavLink
                          to="/gallery"
                          className={navClass}
                          onClick={handleCloseMenu}
                        >
                          Gallery
                        </NavLink>
                        <NavLink
                          to="/location"
                          className={navClass}
                          onClick={handleCloseMenu}
                        >
                          Location
                        </NavLink>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <p className={adminMenuSectionTitleClass}>Cafe Pages</p>
                        <NavLink
                          to="/"
                          className={({ isActive }) =>
                            adminDrawerItemClass({ isActive })
                          }
                          onClick={handleCloseMenu}
                          end
                        >
                          <span>Home</span>
                          <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                        </NavLink>
                        <NavLink
                          to="/menu"
                          className={({ isActive }) =>
                            adminDrawerItemClass({ isActive })
                          }
                          onClick={handleCloseMenu}
                        >
                          <span>Menu</span>
                          <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                        </NavLink>
                        <NavLink
                          to="/gallery"
                          className={({ isActive }) =>
                            adminDrawerItemClass({ isActive })
                          }
                          onClick={handleCloseMenu}
                        >
                          <span>Gallery</span>
                          <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                        </NavLink>
                        {isAuthenticated && (
                          <NavLink
                            to="/rewards"
                            className={({ isActive }) =>
                              adminDrawerItemClass({ isActive })
                            }
                            onClick={handleCloseMenu}
                          >
                            <span>Rewards</span>
                            <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                          </NavLink>
                        )}
                        {isAuthenticated && (
                          <NavLink
                            to="/events"
                            className={({ isActive }) =>
                              adminDrawerItemClass({ isActive })
                            }
                            onClick={handleCloseMenu}
                          >
                            <span>Events</span>
                            <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                          </NavLink>
                        )}
                        <NavLink
                          to="/location"
                          className={({ isActive }) =>
                            adminDrawerItemClass({ isActive })
                          }
                          onClick={handleCloseMenu}
                        >
                          <span>Location</span>
                          <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                        </NavLink>
                      </div>

                      <div className="space-y-2 pt-2">
                        <p className={adminMenuSectionTitleClass}>Account</p>
                        {isDashboardUser && (
                          <NavLink
                            to="/admin"
                            className={({ isActive }) =>
                              adminDrawerItemClass({ isActive })
                            }
                            onClick={handleCloseMenu}
                          >
                            <span>Admin Dashboard</span>
                            <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                          </NavLink>
                        )}
                        {isAuthenticated ? (
                          <>
                            <NavLink
                              to="/orders"
                              className={({ isActive }) =>
                                adminDrawerItemClass({ isActive })
                              }
                              onClick={handleCloseMenu}
                            >
                              <span>Orders</span>
                              <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                            </NavLink>
                            <NavLink
                              to="/cart"
                              className={({ isActive }) =>
                                adminDrawerItemClass({ isActive })
                              }
                              onClick={handleCloseMenu}
                            >
                              <span>Cart</span>
                              <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                            </NavLink>
                          </>
                        ) : (
                          <NavLink
                            to="/orders"
                            className={({ isActive }) =>
                              adminDrawerItemClass({ isActive })
                            }
                            onClick={handleCloseMenu}
                          >
                            <span>Sign in</span>
                            <span className={isDayTheme ? "text-[#315f5e]/60" : "text-cocoa/45"}>&gt;</span>
                          </NavLink>
                        )}
                      </div>
                    </>
                  )}
                  <button className="pill w-fit">AR</button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={mobileThemeButtonClass}
                    onClick={toggleTheme}
                  >
                    {theme === "day" ? (
                      <>
                        <MoonIcon className="h-4 w-4" />
                        Night
                      </>
                    ) : (
                      <>
                        <SunIcon className="h-4 w-4" />
                        Day
                      </>
                    )}
                  </Button>
                  {user && (
                    <Button
                      variant="outline"
                      className={mobileLogoutButtonClass}
                      onClick={() => {
                        logout();
                        handleCloseMenu();
                      }}
                    >
                      Logout
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
