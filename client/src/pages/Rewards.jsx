import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import RewardCard from "../components/rewards/RewardCard";
import api from "../services/api";
import useAuth from "../hooks/useAuth";
import useTheme from "../hooks/useTheme";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { PageHeroSkeleton } from "../components/common/PageSkeleton";
import { cn } from "../lib/utils";

const fetchRewards = async () => {
  const { data } = await api.get("/rewards");
  return data.rewards || [];
};

const fetchHistory = async () => {
  const { data } = await api.get("/rewards/history");
  return data.redemptions || [];
};

export default function Rewards() {
  const { isAuthenticated, user, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [redeemingId, setRedeemingId] = useState("");
  const [confirmReward, setConfirmReward] = useState(null);
  const [recentRedeemAt, setRecentRedeemAt] = useState({});
  const isDayTheme = theme === "day";
  const popupBackdropClass = cn(
    "fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm",
    isDayTheme ? "bg-[rgba(34,71,70,0.24)]" : "bg-[#120d0b]/80",
  );
  const popupPanelClass = cn(
    "w-full max-w-md rounded-xl3 border p-6 shadow-2xl transition-colors",
    isDayTheme
      ? "border-[#3f7674]/18 bg-[#f8fcfc] text-espresso shadow-[0_24px_50px_rgba(34,71,70,0.16)]"
      : "border-gold/20 bg-[#17110f] text-cream",
  );
  const {
    data: rewards = [],
    refetch,
    isLoading: rewardsLoading,
  } = useQuery({
    queryKey: ["rewards"],
    queryFn: fetchRewards,
    enabled: isAuthenticated,
  });
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["reward-history"],
    queryFn: fetchHistory,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    refreshProfile?.();
  }, [isAuthenticated, refreshProfile]);

  const rewardStats = useMemo(() => {
    return history.reduce((acc, entry) => {
      const rewardId = entry.rewardId?._id;
      if (!rewardId) return acc;

      if (!acc[rewardId]) {
        acc[rewardId] = { readyCount: 0 };
      }

      if (entry.status === "Redeemed") {
        acc[rewardId].readyCount += 1;
      }

      return acc;
    }, {});
  }, [history]);

  const performRedeem = async (reward) => {
    try {
      setRedeemingId(reward._id);
      await api.post("/rewards/redeem", { rewardId: reward._id });
      setRecentRedeemAt((prev) => ({ ...prev, [reward._id]: Date.now() }));
      await refreshProfile();
      await Promise.all([
        refetch(),
        queryClient.fetchQuery({
          queryKey: ["reward-history"],
          queryFn: fetchHistory,
        }),
      ]);
    } finally {
      setRedeemingId("");
    }
  };

  const handleRedeem = async (reward) => {
    const lastRedeemedAt = recentRedeemAt[reward._id] || 0;
    const wasRedeemedInCurrentSession = lastRedeemedAt > 0;

    if (wasRedeemedInCurrentSession) {
      setConfirmReward(reward);
      return;
    }

    await performRedeem(reward);
  };

  if (isAuthenticated && (rewardsLoading || historyLoading)) {
    return <PageHeroSkeleton cards={4} />;
  }

  return (
    <section className="section-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-espresso">Rewards</h1>
          <p className="mt-2 text-sm text-cocoa/70">
            Use your points to unlock Cortina.D specials.
          </p>
        </div>
        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Points: {user?.loyaltyPoints || 0}</Badge>
            <Button asChild variant="secondary" size="sm">
              <Link to="/points">Redemption History</Link>
            </Button>
          </div>
        )}
      </div>

      {!isAuthenticated && (
        <p className="mt-4 text-sm text-cocoa/60">
          Please sign in to view rewards.
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => (
          <RewardCard
            key={reward._id}
            reward={reward}
            onRedeem={handleRedeem}
            redeeming={redeemingId === reward._id}
            disabled={(user?.loyaltyPoints || 0) < reward.pointsRequired}
            readyCount={rewardStats[reward._id]?.readyCount || 0}
            sessionRedeemed={Boolean(recentRedeemAt[reward._id])}
          />
        ))}
      </div>

      {confirmReward && (
        <div
          className={popupBackdropClass}
          onClick={() => setConfirmReward(null)}
        >
          <div
            className={popupPanelClass}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className={cn("text-xl font-semibold", isDayTheme ? "text-espresso" : "text-cream")}>
              Redeem again?
            </h2>
            <p className={cn("mt-3 text-sm leading-7", isDayTheme ? "text-cocoa/76" : "text-cocoa/80")}>
              You already redeemed{" "}
              <span className={cn("font-semibold", isDayTheme ? "text-espresso" : "text-cream")}>
                {confirmReward.title}
              </span>
              . Do you want to redeem it one more time?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmReward(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const rewardToRedeem = confirmReward;
                  setConfirmReward(null);
                  await performRedeem(rewardToRedeem);
                }}
              >
                Redeem Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
