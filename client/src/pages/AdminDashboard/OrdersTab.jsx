import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import SelectMenu from "../../components/common/SelectMenu";
import {
  formatOrderDateTime,
  formatOrderDayLabel,
  groupOrdersByDay,
  matchesOrderDateFilter,
  orderDateFilterOptions,
  orderFeedbackFilterOptions,
  statusOptions,
} from "./shared.js";
import { DashboardSectionHeading } from "./components.jsx";
import { resolveImageUrl } from "../../services/api";

export default function OrdersTab({
  orders,
  dashboardPanelClass,
  orderCardClass,
  orderFiltersCardClass,
  orderGroupClass,
  orderItemsListClass,
  orderLineItemClass,
  orderSummaryPillClass,
  isDayTheme,
}) {
  const queryClient = useQueryClient();
  const [orderFilters, setOrderFilters] = useState({
    status: "All",
    payment: "All",
    search: "",
    day: "All Dates",
    feedback: "All Ratings",
  });
  const [updatingOrderIds, setUpdatingOrderIds] = useState({});

  const filteredOrders = useMemo(() => {
    const status = orderFilters.status;
    const payment = orderFilters.payment;
    const search = orderFilters.search.trim().toLowerCase();
    const day = orderFilters.day;
    const feedback = orderFilters.feedback;

    return orders.filter((order) => {
      const matchesStatus = status === "All" ? true : order.status === status;
      const matchesPayment =
        payment === "All" ? true : (order.paymentMethod || "Cash") === payment;
      const matchesSearch = search
        ? [
            String(order._id),
            order.userId?.fullName || "",
            order.userId?.phone || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true;
      const matchesDay = matchesOrderDateFilter(order.createdAt, day);
      const rating = Number(order.feedback?.rating || 0);
      const matchesFeedback =
        feedback === "All Ratings"
          ? true
          : feedback === "Has Feedback"
            ? Boolean(order.feedback?.rating)
            : feedback === "No Feedback"
              ? !order.feedback?.rating
              : rating === Number(feedback.split(" ")[0]);

      return (
        matchesStatus &&
        matchesPayment &&
        matchesSearch &&
        matchesDay &&
        matchesFeedback
      );
    });
  }, [orders, orderFilters]);

  const groupedOrders = useMemo(
    () => groupOrdersByDay(filteredOrders),
    [filteredOrders],
  );

  const receivedOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "Received").length,
    [orders],
  );
  const inProgressOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "InProgress").length,
    [orders],
  );
  const readyOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "Ready").length,
    [orders],
  );

  const patchOrderCache = (orderId, updater) => {
    queryClient.setQueryData(["admin-orders"], (current = []) =>
      current.map((order) => {
        if (order._id !== orderId) return order;
        return typeof updater === "function"
          ? updater(order)
          : { ...order, ...updater };
      }),
    );
  };

  const updateOrderStatus = async (orderId, status) => {
    const previousOrders = queryClient.getQueryData(["admin-orders"]);

    setUpdatingOrderIds((prev) => ({ ...prev, [orderId]: true }));
    patchOrderCache(orderId, { status });

    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status });
      const updatedOrder = data?.order;

      patchOrderCache(orderId, (order) => ({
        ...order,
        ...(updatedOrder || {}),
        items: order.items,
      }));

      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch {
      queryClient.setQueryData(["admin-orders"], previousOrders);
    } finally {
      setUpdatingOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  return (
    <div className={dashboardPanelClass}>
      <DashboardSectionHeading
        eyebrow="Order Operations"
        title="Live Orders"
        description={`${filteredOrders.length} of ${orders.length} orders shown in the current queue.`}
      />
      <div className={cn(orderFiltersCardClass, "mt-5 flex flex-col gap-4 p-4")}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cocoa/55">
              Filters
            </p>
            <p className="mt-1 text-xs text-cocoa/60">
              Narrow the queue by status, payment, date, rating, customer, or order ID.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={orderSummaryPillClass}>Received: {receivedOrdersCount}</span>
            <span className={orderSummaryPillClass}>In Progress: {inProgressOrdersCount}</span>
            <span className={orderSummaryPillClass}>Ready: {readyOrdersCount}</span>
          </div>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SelectMenu
            value={orderFilters.status}
            onChange={(value) =>
              setOrderFilters((prev) => ({ ...prev, status: value }))
            }
            className="w-full"
            menuClassName="w-full"
            options={["All", ...statusOptions].map((status) => ({
              label: status,
              value: status,
            }))}
          />
          <SelectMenu
            value={orderFilters.payment}
            onChange={(value) =>
              setOrderFilters((prev) => ({ ...prev, payment: value }))
            }
            className="w-full"
            menuClassName="w-full"
            options={["All", "Cash", "Card"].map((method) => ({
              label: method,
              value: method,
            }))}
          />
          <SelectMenu
            value={orderFilters.day}
            onChange={(value) =>
              setOrderFilters((prev) => ({ ...prev, day: value }))
            }
            className="w-full"
            menuClassName="w-full"
            options={orderDateFilterOptions.map((option) => ({
              label: option,
              value: option,
            }))}
          />
          <SelectMenu
            value={orderFilters.feedback}
            onChange={(value) =>
              setOrderFilters((prev) => ({ ...prev, feedback: value }))
            }
            className="w-full"
            menuClassName="w-full"
            options={orderFeedbackFilterOptions.map((option) => ({
              label: option,
              value: option,
            }))}
          />
          <Input
            type="text"
            placeholder="Search order, customer, or phone"
            value={orderFilters.search}
            onChange={(e) =>
              setOrderFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
            className="w-full"
          />
        </div>
      </div>
      <div className="mt-4 space-y-4 text-sm">
        {groupedOrders.map((group) => (
          <div key={group.dateKey} className={orderGroupClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-espresso">
                  {formatOrderDayLabel(group.labelSource)}
                </h3>
                <p className="mt-1 text-xs text-cocoa/60">
                  {group.entries.length} order{group.entries.length > 1 ? "s" : ""} in this group
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{group.entries.length} orders</Badge>
                <Badge variant="highlight">{group.totalAmount.toFixed(2)} JD total</Badge>
              </div>
            </div>

            <div className="space-y-3">
              {group.entries.map((order) => (
                <div key={order._id} className={orderCardClass}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-medium text-cocoa/68">Order #{order._id}</p>
                      {order.userId?.fullName && (
                        <p className="mt-1 text-sm font-semibold text-espresso">
                          {order.userId.fullName}
                        </p>
                      )}
                      {order.userId?.phone && (
                        <p className="mt-1 text-xs text-cocoa/68">Phone: {order.userId.phone}</p>
                      )}
                      <p className="mt-1 text-sm text-cocoa/76">Payment: {order.paymentMethod || "Cash"}</p>
                      <p className="mt-1 text-xs text-cocoa/66">Placed: {formatOrderDateTime(order.createdAt)}</p>
                      {order.lastEditedAt && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="highlight">Edited</Badge>
                          <p className="text-xs text-cocoa/66">
                            Edited: {formatOrderDateTime(order.lastEditedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[220px]">
                      <SelectMenu
                        value={order.status}
                        onChange={(value) => updateOrderStatus(order._id, value)}
                        disabled={Boolean(updatingOrderIds[order._id])}
                        className="w-full"
                        menuClassName="w-full"
                        portal
                        options={statusOptions.map((status) => ({
                          label: status,
                          value: status,
                        }))}
                      />
                      <Badge className="justify-center self-start">
                        {order.totalAmount?.toFixed(2)} JD
                      </Badge>
                    </div>
                  </div>
                  <div className={orderItemsListClass}>
                    {(order.items || []).map((item) => (
                      <div key={item._id} className={orderLineItemClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {item.productId?.imageUrl ? (
                              <img
                                src={resolveImageUrl(item.productId.imageUrl)}
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
                                {item.isRewardRedemption && <Badge>Redeemed</Badge>}
                              </div>
                              <p className="text-xs text-cocoa/72">
                                {item.quantity}x {item.selectedSize || "Regular"} - {" "}
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
                          <span className="shrink-0 text-xs font-medium text-cocoa/72">
                            {item.isRewardRedemption
                              ? "Free"
                              : `${(item.lineTotal || 0).toFixed(2)} JD`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.specialInstructions && (
                    <div
                      className={cn(
                        "mt-3 rounded-[1rem] border px-3 py-2.5 text-xs",
                        isDayTheme
                          ? "border-[#3f7674]/14 bg-[#f3f9f8] text-cocoa/78"
                          : "border-gold/14 bg-[rgba(27,21,18,0.88)] text-cocoa/74",
                      )}
                    >
                      Notes: {order.specialInstructions}
                    </div>
                  )}
                  {order.feedback?.rating ? (
                    <div
                      className={cn(
                        "mt-3 rounded-[1rem] border px-3 py-3 text-xs",
                        isDayTheme
                          ? "border-[#3f7674]/14 bg-[#eef7f6] text-cocoa/78"
                          : "border-gold/14 bg-[rgba(27,21,18,0.88)] text-cocoa/74",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-espresso">Customer Feedback</p>
                          <p className="mt-1 text-xs text-cocoa/62">
                            Rated {formatOrderDateTime(order.feedback.submittedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-gold">
                          {Array.from({ length: 5 }, (_, index) => (
                            <svg
                              key={`${order._id}-feedback-${index + 1}`}
                              viewBox="0 0 24 24"
                              fill={index + 1 <= Number(order.feedback.rating) ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className={cn(
                                "h-4 w-4",
                                index + 1 <= Number(order.feedback.rating)
                                  ? "text-gold"
                                  : "text-cocoa/30",
                              )}
                            >
                              <path d="m12 3.8 2.6 5.27 5.82.84-4.21 4.1.99 5.79L12 17.05 6.8 19.8l.99-5.79-4.21-4.1 5.82-.84L12 3.8Z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-cocoa/82">Name:</span>{" "}
                          {order.feedback.customerName || order.userId?.fullName || "Customer"}
                        </p>
                        <p>
                          <span className="font-semibold text-cocoa/82">Phone:</span>{" "}
                          {order.feedback.customerPhone || order.userId?.phone || "Unavailable"}
                        </p>
                      </div>
                      {order.feedback.comment && (
                        <p className="mt-3 rounded-[0.9rem] border border-current/10 bg-white/30 px-3 py-2 text-xs leading-5 text-cocoa/78 dark:bg-black/15">
                          {order.feedback.comment}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
        {groupedOrders.length === 0 && (
          <p className="text-sm text-cocoa/60">No orders found.</p>
        )}
      </div>
    </div>
  );
}
