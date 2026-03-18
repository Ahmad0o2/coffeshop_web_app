import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";

export default function RewardCard({
  reward,
  onRedeem,
  disabled = false,
  redeeming = false,
  readyCount = 0,
  sessionRedeemed = false,
}) {
  const showInsufficientPoints = disabled && !redeeming;
  const hasReadyReward = readyCount > 0;

  return (
    <Card className="overflow-hidden">
      {reward.imageUrl ? (
        <div className="h-44 overflow-hidden rounded-t-xl3">
          <img
            src={reward.imageUrl}
            alt={reward.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <CardHeader>
        <CardTitle>{reward.title}</CardTitle>
        <p className="text-sm text-cocoa/70">{reward.description}</p>
        {hasReadyReward && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge>Redeemed and ready</Badge>
          </div>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge>{reward.pointsRequired} pts</Badge>
          {showInsufficientPoints ? (
            <span className="text-xs font-medium text-cocoa/60">
              Not enough points
            </span>
          ) : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRedeem(reward)}
          disabled={disabled || redeeming}
          className={showInsufficientPoints ? "opacity-60 grayscale" : ""}
        >
          {redeeming
            ? "Redeeming..."
            : sessionRedeemed
              ? "Redeem Again"
              : "Redeem"}
        </Button>
      </CardFooter>
    </Card>
  );
}
