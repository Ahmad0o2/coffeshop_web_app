import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import OrderStatus from "../components/order/OrderStatus";
import { DetailSkeleton } from "../components/common/PageSkeleton";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

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

export default function OrderStatusPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get(`/orders/${id}`).then((res) => {
      if (mounted) setOrder(res.data.order);
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      api
        .get(`/orders/${id}`)
        .then((res) => {
          setOrder(res.data.order);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const socket = io(socketUrl);
    socket.on("order:status", (payload) => {
      if (payload.orderId === id) {
        api.get(`/orders/${id}`).then((res) => {
          setOrder(res.data.order);
        });
      }
    });
    return () => socket.disconnect();
  }, [id]);

  if (!order) {
    return <DetailSkeleton />;
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-12">
      <h1 className="text-3xl font-semibold text-espresso">Order Status</h1>
      <div className="mt-6 card p-5 sm:p-6">
        <p className="text-sm font-medium text-cocoa/68">Order #{order._id}</p>
        <p className="mt-1 text-xs text-cocoa/66">
          Placed: {formatOrderDateTime(order.createdAt)}
        </p>
        <div className="mt-4">
          <OrderStatus status={order.status} />
        </div>
        <div className="mt-6 space-y-2 rounded-[1.1rem] border border-gold/14 bg-[rgba(27,21,18,0.88)] px-4 py-3 text-sm text-cocoa/76">
          <p>Total: {order.totalAmount?.toFixed(2)} JD</p>
          <p>Status: {order.status}</p>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          {(order.items || []).map((item) => (
            <div
              key={item._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-gold/16 bg-[rgba(30,23,20,0.92)] px-3 py-3"
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
              <span className="text-xs font-medium text-cocoa/72">
                {item.isRewardRedemption
                  ? "Free"
                  : `${(item.lineTotal || 0).toFixed(2)} JD`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
