import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import SelectMenu from "../components/common/SelectMenu";
import OrderStatus from "../components/order/OrderStatus";
import { io } from "socket.io-client";
import { getApiErrorMessage } from "../utils/apiErrors";
import { ListSkeleton } from "../components/common/PageSkeleton";
import useTheme from "../hooks/useTheme";
import { cn } from "../lib/utils";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const orderDateFilterOptions = ["All Dates", "Today", "Yesterday", "Last 7 Days", "This Month", "This Year"];

const matchesOrderDateFilter = (value, filter) => {
  if (!filter || filter === "All Dates") return true;
  if (!value) return true;

  const orderDate = new Date(value);
  if (Number.isNaN(orderDate.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

  if (filter === "Today") {
    return orderDate >= startOfToday && orderDate < startOfTomorrow;
  }

  if (filter === "Yesterday") {
    return orderDate >= startOfYesterday && orderDate < startOfToday;
  }

  if (filter === "Last 7 Days") {
    return orderDate >= startOfLast7Days && orderDate < startOfTomorrow;
  }

  if (filter === "This Month") {
    return orderDate >= startOfMonth && orderDate < startOfNextMonth;
  }

  if (filter === "This Year") {
    return orderDate >= startOfYear && orderDate < startOfNextYear;
  }

  return true;
};

const formatOrderDateTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getLocalDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-CA");
};

const formatOrderDayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown Day";

  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  const currentKey = getLocalDateKey(date);

  if (currentKey === todayKey) return "Today";
  if (currentKey === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const groupOrdersByDay = (orders) => {
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const grouped = new Map();

  sortedOrders.forEach((order) => {
    const dateKey = getLocalDateKey(order.createdAt);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        dateKey,
        labelSource: order.createdAt,
        entries: [],
        totalAmount: 0,
      });
    }

    const group = grouped.get(dateKey);
    group.entries.push(order);
    group.totalAmount += Number(order.totalAmount || 0);
  });

  return Array.from(grouped.values());
};

export default function Profile() {
  const { user, login, register, logout, isAuthenticated, refreshProfile } =
    useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderDayFilter, setOrderDayFilter] = useState("All Dates");
  const isDayTheme = theme === "day";
  const orderFiltersCardClass = cn(
    "rounded-[1.2rem] border p-3 transition-colors",
    isDayTheme
      ? "border-[#3f7674]/18 bg-[#fbfdfd] shadow-[0_10px_24px_rgba(34,71,70,0.045)]"
      : "border-gold/18 bg-[rgba(21,16,14,0.94)] shadow-[0_18px_34px_rgba(10,7,6,0.18)]",
  );
  const orderCardClass = cn(
    "rounded-[1.35rem] border p-4 text-sm transition-colors",
    isDayTheme
      ? "border-[#3f7674]/18 bg-[#fbfdfd] shadow-[0_10px_24px_rgba(34,71,70,0.05)]"
      : "border-gold/18 bg-[rgba(21,16,14,0.96)] shadow-[0_20px_40px_rgba(10,7,6,0.20)]",
  );
  const orderLineItemClass = cn(
    "flex flex-wrap items-center justify-between gap-3 rounded-xl2 border px-3 py-3 transition-colors",
    isDayTheme
      ? "border-[#3f7674]/16 bg-[#f3f9f8]"
      : "border-gold/16 bg-[rgba(30,23,20,0.92)]",
  );
  const orderGroupClass = cn(
    "rounded-[1.2rem] border p-4 transition-colors",
    isDayTheme
      ? "border-[#3f7674]/14 bg-[#f8fcfc] shadow-[0_8px_20px_rgba(34,71,70,0.04)]"
      : "border-gold/14 bg-[rgba(23,17,15,0.94)] shadow-[0_18px_34px_rgba(10,7,6,0.16)]",
  );
  const orderNotesClass = cn(
    "mt-3 rounded-[1rem] border px-3 py-2.5 text-xs transition-colors",
    isDayTheme
      ? "border-[#3f7674]/14 bg-[#eef7f6] text-cocoa/82"
      : "border-gold/14 bg-[rgba(27,21,18,0.88)] text-cocoa/76",
  );

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderDateFilter(order.createdAt, orderDayFilter)),
    [orders, orderDayFilter],
  );
  const groupedOrders = useMemo(
    () => groupOrdersByDay(filteredOrders),
    [filteredOrders],
  );

  const validateForm = () => {
    if (mode === "login") {
      if (!form.email && !form.phone) {
        return "Enter email, username, or phone to sign in.";
      }
      if (!form.password) {
        return "Password is required.";
      }
      return "";
    }
    if (!form.fullName) return "Full name is required.";
    if (!form.email) return "Email is required.";
    if (!form.phone) return "Phone is required.";
    if (!form.password) return "Password is required.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }
      if (mode === "login") {
        const data = await login({
          identifier: form.email || undefined,
          phone: form.phone || undefined,
          password: form.password,
        });
        navigate(
          ["Admin", "Staff"].includes(data?.user?.role) ? "/admin" : "/",
          { replace: true },
        );
      } else {
        const data = await register(form);
        navigate(
          ["Admin", "Staff"].includes(data?.user?.role) ? "/admin" : "/",
          { replace: true },
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Authentication failed."));
    }
  };

  const loadOrders = useCallback(() => {
    setLoadingOrders(true);
    api
      .get("/orders")
      .then((response) => {
        setOrders(response.data.orders || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load orders.");
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      loadOrders();
      refreshProfile?.();
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadOrders, refreshProfile]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadOrders]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const socket = io(socketUrl);
    const handler = (payload) => {
      if (!payload?.orderId) return;
      let updated = false;
      setOrders((prev) =>
        prev.map((order) => {
          if (String(order._id) !== String(payload.orderId)) return order;
          updated = true;
          return {
            ...order,
            status: payload.status || order.status,
          };
        }),
      );
      if (payload.status === "Completed") {
        refreshProfile?.();
      }
      if (!updated) {
        loadOrders();
      }
    };
    socket.on("order:status", handler);
    socket.on("order:new", handler);
    return () => socket.disconnect();
  }, [isAuthenticated, user?.id, loadOrders, refreshProfile]);

  if (!isAuthenticated) {
    return (
      <section className="section-shell max-w-xl">
        <h1 className="text-3xl font-semibold text-espresso">Orders</h1>
        <div className="mt-6 card p-6">
          <div className="flex gap-2">
            <button
              className={`pill ${mode === "login" ? "border-espresso/40" : ""}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={`pill ${mode === "register" ? "border-espresso/40" : ""}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-3">
            {mode === "register" && (
              <Input
                type="text"
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            )}
            <Input
              type={mode === "login" ? "text" : "email"}
              placeholder={mode === "login" ? "Email or username" : "Email"}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {mode === "register" && (
              <Input
                type="text"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            )}
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {error && <p className="form-error">{error}</p>}
            <Button type="submit" className="w-full justify-center">
              {mode === "login" ? "Login" : "Create account"}
            </Button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-espresso">Your Orders</h1>
          <p className="text-sm text-cocoa/70">Welcome back, {user.fullName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {error && <p className="form-error">{error}</p>}
        <div className={orderFiltersCardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cocoa/55">
                Order Filters
              </p>
              <p className="mt-1 text-xs text-cocoa/68">
                Filter your order history by day range.
              </p>
            </div>
            <SelectMenu
              value={orderDayFilter}
              onChange={setOrderDayFilter}
              className="w-full sm:w-[14rem]"
              menuClassName="w-full sm:w-[14rem]"
              options={orderDateFilterOptions.map((option) => ({
                label: option,
                value: option,
              }))}
            />
          </div>
        </div>
        {loadingOrders && orders.length === 0 ? (
          <ListSkeleton items={3} />
        ) : (
          groupedOrders.map((group) => (
            <div key={group.dateKey} className={orderGroupClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-espresso">
                    {formatOrderDayLabel(group.labelSource)}
                  </h2>
                  <p className="mt-1 text-xs text-cocoa/60">
                    {group.entries.length} order
                    {group.entries.length > 1 ? "s" : ""} in this group
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{group.entries.length} orders</Badge>
                  <Badge variant="highlight">
                    {group.totalAmount.toFixed(2)} JD total
                  </Badge>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {group.entries.map((order) => (
                  <div
                    key={order._id}
                    className={orderCardClass}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-cocoa/68">Order #{order._id}</p>
                        <p className="mt-1 text-sm text-cocoa/76">
                          Payment: {order.paymentMethod || "Cash"}
                        </p>
                        <p className="mt-1 text-xs text-cocoa/66">
                          Placed: {formatOrderDateTime(order.createdAt)}
                        </p>
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                    <div className="mt-3">
                      <OrderStatus status={order.status} />
                    </div>
                    <div className="mt-3 space-y-2">
                      {(order.items || []).map((item) => (
                        <div
                          key={item._id}
                          className={orderLineItemClass}
                        >
                          <div className="flex items-center gap-3">
                            {item.productId?.imageUrl ? (
                              <img
                                src={item.productId.imageUrl}
                                alt={item.productId?.name || "Item"}
                                className="h-12 w-12 rounded-xl2 object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
                            )}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-espresso">
                                  {item.productId?.name || "Item"}
                                </p>
                                {item.isRewardRedemption && (
                                  <span className="pill">Redeemed</span>
                                )}
                              </div>
                              <p className="text-xs text-cocoa/72">
                                {item.quantity}x {item.selectedSize || "Regular"} -{" "}
                                {item.isRewardRedemption
                                  ? "Free reward item"
                                  : `${(item.unitPrice || 0).toFixed(2)} JD`}
                              </p>
                              {item.selectedAddOns?.length > 0 && (
                                <p className="text-xs text-cocoa/72">
                                  Add-ons: {item.selectedAddOns.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-medium text-cocoa/72">
                            {item.isRewardRedemption
                              ? "Free"
                              : `${(item.lineTotal || 0).toFixed(2)} JD`}
                          </p>
                        </div>
                      ))}
                    </div>
                    {order.specialInstructions && (
                      <div className={orderNotesClass}>
                        Notes: {order.specialInstructions}
                      </div>
                    )}
                    <p className="mt-3 text-sm font-medium text-cocoa/78">
                      Total: {order.totalAmount?.toFixed(2)} JD
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        {!loadingOrders && groupedOrders.length === 0 && (
          <p className="text-sm text-cocoa/60">
            {orders.length === 0 ? "No orders yet." : "No orders match this date filter."}
          </p>
        )}
      </div>
    </section>
  );
}
