import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import SelectMenu from "../components/common/SelectMenu";
import OrderStatus from "../components/order/OrderStatus";
import OrderStars from "../components/order/OrderStars";
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

const formatFeedbackDateTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

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

const isOrderEditableForCustomer = (status) =>
  !["Ready", "Completed", "Cancelled"].includes(status);

const buildEditableOrderDraft = (order) => ({
  items: (order.items || [])
    .filter((item) => !item.isRewardRedemption)
    .map((item) => ({
      id: item._id,
      productId: item.productId?._id || item.productId,
      name: item.productId?.name || "Item",
      imageUrl: item.productId?.imageUrl || "",
      quantity: Number(item.quantity) || 1,
      selectedSize: item.selectedSize || "",
      selectedAddOns: item.selectedAddOns || [],
      unitPrice: Number(item.unitPrice || 0),
    })),
  rewardItems: (order.items || []).filter((item) => item.isRewardRedemption),
  specialInstructions: order.specialInstructions || "",
});

const buildFeedbackDraft = (order) => ({
  rating: Number(order.feedback?.rating || 0),
  comment: order.feedback?.comment || "",
});

export default function Profile() {
  const { user, login, register, logout, isAuthenticated, refreshProfile } =
    useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [editingOrderId, setEditingOrderId] = useState("");
  const [orderDrafts, setOrderDrafts] = useState({});
  const [savingOrderId, setSavingOrderId] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [submittingFeedbackOrderId, setSubmittingFeedbackOrderId] = useState("");
  const isDayTheme = theme === "day";
  const justPlacedOrderId = location.state?.justPlacedOrderId || "";
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
  const orderEditorClass = cn(
    "mt-4 rounded-[1.1rem] border p-4 transition-colors",
    isDayTheme
      ? "border-[#3f7674]/16 bg-[#f3f9f8]"
      : "border-gold/14 bg-[rgba(27,21,18,0.9)]",
  );
  const feedbackPanelClass = cn(
    "mt-4 rounded-[1.1rem] border p-4 transition-colors",
    isDayTheme
      ? "border-[#3f7674]/16 bg-[#eef7f6]"
      : "border-gold/14 bg-[rgba(27,21,18,0.9)]",
  );
  const highlightedOrderClass = isDayTheme
    ? "ring-2 ring-[#3f7674]/18 ring-offset-2 ring-offset-[#f8fcfc]"
    : "ring-2 ring-gold/20 ring-offset-2 ring-offset-[rgba(23,17,15,0.94)]";

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderDateFilter(order.createdAt, orderDayFilter)),
    [orders, orderDayFilter],
  );
  const groupedOrders = useMemo(
    () => groupOrdersByDay(filteredOrders),
    [filteredOrders],
  );

  const replaceOrderInState = useCallback((nextOrder) => {
    setOrders((prev) =>
      prev.map((order) => (order._id === nextOrder._id ? nextOrder : order)),
    );
  }, []);

  const startEditingOrder = (order) => {
    setError("");
    setEditingOrderId(order._id);
    setOrderDrafts((prev) => ({
      ...prev,
      [order._id]: buildEditableOrderDraft(order),
    }));
  };

  const stopEditingOrder = useCallback((orderId) => {
    setEditingOrderId((current) => (current === orderId ? "" : current));
    setOrderDrafts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, []);

  const patchOrderDraft = useCallback((orderId, updater) => {
    setOrderDrafts((prev) => {
      const currentDraft = prev[orderId];
      if (!currentDraft) return prev;
      return {
        ...prev,
        [orderId]: updater(currentDraft),
      };
    });
  }, []);

  const updateDraftItemQuantity = (orderId, itemId, value) => {
    patchOrderDraft(orderId, (draft) => ({
      ...draft,
      items: draft.items.map((item) =>
        item.id === itemId ? { ...item, quantity: value } : item,
      ),
    }));
  };

  const removeDraftItem = (orderId, itemId) => {
    patchOrderDraft(orderId, (draft) => ({
      ...draft,
      items: draft.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleSaveEditedOrder = async (orderId) => {
    const draft = orderDrafts[orderId];
    if (!draft) return;

    const hasInvalidQuantity = draft.items.some(
      (item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0,
    );

    if (hasInvalidQuantity) {
      setError("Use whole quantities greater than zero before saving the order.");
      return;
    }

    setSavingOrderId(orderId);
    setError("");

    try {
      const { data } = await api.patch(`/orders/${orderId}`, {
        items: draft.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          selectedSize: item.selectedSize,
          selectedAddOns: item.selectedAddOns,
        })),
        specialInstructions: draft.specialInstructions,
      });
      replaceOrderInState(data.order);
      stopEditingOrder(orderId);
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't update that order right now."));
    } finally {
      setSavingOrderId("");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order now?")) return;

    setCancellingOrderId(orderId);
    setError("");

    try {
      const { data } = await api.post(`/orders/${orderId}/cancel`);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, status: data.order?.status || "Cancelled" }
            : order,
        ),
      );
      stopEditingOrder(orderId);
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't cancel that order right now."));
    } finally {
      setCancellingOrderId("");
    }
  };

  const ensureFeedbackDraft = (order) => {
    if (feedbackDrafts[order._id]) return feedbackDrafts[order._id];
    const nextDraft = buildFeedbackDraft(order);
    setFeedbackDrafts((prev) => ({
      ...prev,
      [order._id]: nextDraft,
    }));
    return nextDraft;
  };

  const handleFeedbackChange = (orderId, changes) => {
    setFeedbackDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || { rating: 0, comment: "" }),
        ...changes,
      },
    }));
  };

  const handleSubmitFeedback = async (order) => {
    const draft = feedbackDrafts[order._id] || ensureFeedbackDraft(order);

    if (!draft.rating) {
      setError("Please choose a star rating before sending feedback.");
      return;
    }

    setSubmittingFeedbackOrderId(order._id);
    setError("");

    try {
      const { data } = await api.post(`/orders/${order._id}/feedback`, {
        rating: draft.rating,
        comment: draft.comment?.trim() || "",
      });
      replaceOrderInState(data.order);
      setFeedbackDrafts((prev) => ({
        ...prev,
        [order._id]: buildFeedbackDraft(data.order),
      }));
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't send your feedback right now."));
    } finally {
      setSubmittingFeedbackOrderId("");
    }
  };

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
        setError(getApiErrorMessage(err, "Failed to load orders."));
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
      if (payload.event === "order:updated" || payload.event === "order:feedback") {
        loadOrders();
        return;
      }
      let updated = false;
      setOrders((prev) =>
        prev.map((order) => {
          if (String(order._id) !== String(payload.orderId)) return order;
          updated = true;
          return {
            ...order,
            status: payload.status || order.status,
            feedback: payload.feedback || order.feedback,
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
    socket.on("order:updated", handler);
    socket.on("order:feedback", handler);
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
                {group.entries.map((order) => {
                  const isEditable = isOrderEditableForCustomer(order.status);
                  const isEditing = editingOrderId === order._id;
                  const editDraft =
                    orderDrafts[order._id] || buildEditableOrderDraft(order);
                  const feedbackDraft =
                    feedbackDrafts[order._id] || buildFeedbackDraft(order);

                  return (
                    <div
                      key={order._id}
                      data-order-id={order._id}
                      className={cn(
                        orderCardClass,
                        justPlacedOrderId === order._id && highlightedOrderClass,
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-medium text-cocoa/68">
                              Order #{order._id}
                            </p>
                            {justPlacedOrderId === order._id && (
                              <Badge variant="highlight">Just placed</Badge>
                            )}
                          </div>
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
                          <div key={item._id} className={orderLineItemClass}>
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

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {isEditable && (
                          <>
                            <Button
                              size="sm"
                              variant={isEditing ? "default" : "secondary"}
                              onClick={() =>
                                isEditing
                                  ? stopEditingOrder(order._id)
                                  : startEditingOrder(order)
                              }
                            >
                              {isEditing ? "Close Editor" : "Edit Order"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={cancellingOrderId === order._id}
                              onClick={() => handleCancelOrder(order._id)}
                            >
                              {cancellingOrderId === order._id
                                ? "Cancelling..."
                                : "Cancel Order"}
                            </Button>
                          </>
                        )}
                        {!isEditable && order.status === "Ready" && (
                          <p className="text-xs text-cocoa/62">
                            This order is already ready, so changes are locked.
                          </p>
                        )}
                      </div>

                      {isEditing && (
                        <div className={orderEditorClass}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-espresso">
                                Edit this order
                              </p>
                              <p className="mt-1 text-xs text-cocoa/65">
                                You can adjust quantities and notes until the order
                                reaches Ready.
                              </p>
                            </div>
                            <Badge>{editDraft.items.length} editable items</Badge>
                          </div>

                          <div className="mt-4 space-y-3">
                            {editDraft.items.map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  "rounded-[1rem] border px-3 py-3",
                                  isDayTheme
                                    ? "border-[#3f7674]/14 bg-[#fbfdfd]"
                                    : "border-gold/14 bg-[rgba(21,16,14,0.84)]",
                                )}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="h-11 w-11 rounded-xl2 object-cover"
                                      />
                                    ) : (
                                      <div className="h-11 w-11 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
                                    )}
                                    <div>
                                      <p className="text-sm font-semibold text-espresso">
                                        {item.name}
                                      </p>
                                      <p className="text-xs text-cocoa/65">
                                        {item.selectedSize || "Regular"} -{" "}
                                        {(item.unitPrice || 0).toFixed(2)} JD
                                      </p>
                                      {item.selectedAddOns?.length > 0 && (
                                        <p className="text-xs text-cocoa/65">
                                          Add-ons: {item.selectedAddOns.join(", ")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(event) =>
                                        updateDraftItemQuantity(
                                          order._id,
                                          item.id,
                                          Number(event.target.value),
                                        )
                                      }
                                      className="w-20"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeDraftItem(order._id, item.id)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {editDraft.rewardItems.length > 0 && (
                              <div
                                className={cn(
                                  "rounded-[1rem] border px-3 py-2.5 text-xs",
                                  isDayTheme
                                    ? "border-[#3f7674]/14 bg-[#eaf5f4] text-cocoa/78"
                                    : "border-gold/14 bg-[rgba(27,21,18,0.88)] text-cocoa/74",
                                )}
                              >
                                Redeemed reward items stay attached to this order and
                                stay free during editing.
                              </div>
                            )}

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                                Special Instructions
                              </p>
                              <Textarea
                                rows="3"
                                value={editDraft.specialInstructions}
                                onChange={(event) =>
                                  patchOrderDraft(order._id, (draft) => ({
                                    ...draft,
                                    specialInstructions: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={savingOrderId === order._id}
                                onClick={() => handleSaveEditedOrder(order._id)}
                              >
                                {savingOrderId === order._id
                                  ? "Saving..."
                                  : "Save Changes"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => stopEditingOrder(order._id)}
                              >
                                Discard
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {order.status === "Completed" && (
                        <div className={feedbackPanelClass}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-espresso">
                                Order Feedback
                              </p>
                              <p className="mt-1 text-xs text-cocoa/65">
                                Rate this order and send a quick note to the cafe
                                team.
                              </p>
                            </div>
                            {order.feedback?.submittedAt && (
                              <Badge variant="highlight">
                                Sent {formatFeedbackDateTime(order.feedback.submittedAt)}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-4 space-y-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                                Your Rating
                              </p>
                              <OrderStars
                                value={feedbackDraft.rating}
                                onChange={(rating) =>
                                  handleFeedbackChange(order._id, { rating })
                                }
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                                Notes for the team
                              </p>
                              <Textarea
                                rows="3"
                                placeholder="Tell us how the order went."
                                value={feedbackDraft.comment}
                                onChange={(event) =>
                                  handleFeedbackChange(order._id, {
                                    comment: event.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                size="sm"
                                disabled={submittingFeedbackOrderId === order._id}
                                onClick={() => handleSubmitFeedback(order)}
                              >
                                {submittingFeedbackOrderId === order._id
                                  ? "Sending..."
                                  : order.feedback
                                    ? "Update Feedback"
                                    : "Send Feedback"}
                              </Button>
                              {order.feedback?.rating ? (
                                <div className="flex items-center gap-2 text-xs text-cocoa/68">
                                  <OrderStars
                                    value={Number(order.feedback.rating)}
                                    readOnly
                                  />
                                  <span>
                                    Shared with the cafe team under your order
                                    details.
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="mt-3 text-sm font-medium text-cocoa/78">
                        Total: {order.totalAmount?.toFixed(2)} JD
                      </p>
                    </div>
                  );
                })}
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
