import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../services/api";
import useAuth from "../hooks/useAuth";
import { Button } from "../components/ui/button";

const fetchHistory = async () => {
  const { data } = await api.get("/rewards/history");
  return data.redemptions || [];
};

export default function Points() {
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const { data: history = [] } = useQuery({
    queryKey: ["reward-history"],
    queryFn: fetchHistory,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    refreshProfile?.();

    const handleFocus = () => refreshProfile?.();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProfile?.();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, refreshProfile]);

  const getRedemptionStatusLabel = (status) => {
    switch (status) {
      case "Applied":
        return "Used in checkout";
      case "Redeemed":
        return "Ready for checkout";
      default:
        return status || "Unknown";
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-espresso">Points</h1>
        <p className="mt-4 text-sm text-cocoa/70">
          Please sign in to view points.
        </p>
      </section>
    );
  }

  return (
    <section className="section-shell max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-espresso">Points</h1>
          <p className="mt-2 text-sm text-cocoa/70">
            Available points:{" "}
            <span className="font-semibold text-espresso">
              {user?.loyaltyPoints}
            </span>
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/rewards">Back to Redeem</Link>
        </Button>
      </div>

      <div className="mt-6 card p-6">
        <h2 className="text-lg font-semibold text-espresso">
          Redemption History
        </h2>
        <div className="mt-4 space-y-3 text-sm">
          {history.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between rounded-xl2 border border-gold/20 bg-obsidian/50 p-3"
            >
              <span>{item.rewardId?.title || "Reward"}</span>
              <span className="pill">
                {getRedemptionStatusLabel(item.status)}
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-sm text-cocoa/60">No redemptions yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
