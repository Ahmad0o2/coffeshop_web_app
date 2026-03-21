import { useMemo, useState } from "react";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import SelectMenu from "../../components/common/SelectMenu";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { DashboardSectionHeading } from "./components.jsx";
import { resolveImageUrl } from "../../services/api";

const createEmptyRewardForm = () => ({
  id: "",
  productId: "",
  pointsRequired: "",
  isActive: true,
});

export default function RewardsTab({
  adminRewards,
  products,
  refetchRewards,
  dashboardItemClass,
  dashboardPanelClass,
}) {
  const [rewardForm, setRewardForm] = useState(createEmptyRewardForm);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardError, setRewardError] = useState("");

  const selectedRewardProduct = useMemo(
    () => products.find((product) => product._id === rewardForm.productId) || null,
    [products, rewardForm.productId],
  );

  const rewardProductOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product._id,
        label: product.name,
        imageUrl: product.imageUrl || "",
      })),
    [products],
  );

  const resetRewardForm = () => {
    setRewardForm(createEmptyRewardForm());
    setRewardError("");
  };

  const handleRewardSubmit = async (event) => {
    event.preventDefault();
    setRewardSaving(true);
    setRewardError("");

    try {
      if (!rewardForm.productId) {
        setRewardError("Select a menu item for this reward.");
        return;
      }

      const pointsRequired = Number(rewardForm.pointsRequired);
      if (!Number.isInteger(pointsRequired) || pointsRequired <= 0) {
        setRewardError("Points must be a positive whole number.");
        return;
      }

      const payload = {
        productId: rewardForm.productId,
        pointsRequired,
        isActive: rewardForm.isActive,
      };

      if (rewardForm.id) {
        await api.put(`/admin/rewards/${rewardForm.id}`, payload);
      } else {
        await api.post("/admin/rewards", payload);
      }

      resetRewardForm();
      await refetchRewards();
    } catch (err) {
      setRewardError(getApiErrorMessage(err, "Failed to save reward."));
    } finally {
      setRewardSaving(false);
    }
  };

  const handleRewardEdit = (reward) => {
    setRewardForm({
      id: reward._id,
      productId: reward.product?._id || reward.productId?._id || reward.productId || "",
      pointsRequired: String(reward.pointsRequired ?? ""),
      isActive: reward.isActive !== false,
    });
    setRewardError("");
  };

  const handleRewardDelete = async (rewardId) => {
    setRewardSaving(true);
    setRewardError("");
    try {
      await api.delete(`/admin/rewards/${rewardId}`);
      if (rewardForm.id === rewardId) {
        resetRewardForm();
      }
      await refetchRewards();
    } catch (err) {
      setRewardError(getApiErrorMessage(err, "Failed to delete reward."));
    } finally {
      setRewardSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <form noValidate onSubmit={handleRewardSubmit} className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Loyalty Setup"
          title={rewardForm.id ? "Edit Reward" : "Add Reward"}
          description="Choose a menu item, assign the points cost, and control whether it is redeemable."
        />

        <div className="mt-5 space-y-4 text-sm">
          {products.length === 0 && (
            <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/45 p-4 text-sm text-cocoa/60">
              No menu items found yet. Add products first, then create rewards from them.
            </div>
          )}
          <div className="space-y-2">
            <SelectMenu
              value={rewardForm.productId}
              label="Menu Item"
              placeholder="Select an item from the menu"
              className="w-full"
              menuClassName="w-full"
              disabled={products.length === 0}
              options={rewardProductOptions}
              renderValue={(option) => (
                <span className="flex items-center gap-3">
                  {option.imageUrl ? (
                    <img src={resolveImageUrl(option.imageUrl)} alt={option.label} className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-espresso via-caramel to-cream" />
                  )}
                  <span>{option.label}</span>
                </span>
              )}
              renderOption={(option) => (
                <span className="flex items-center gap-3">
                  {option.imageUrl ? (
                    <img src={resolveImageUrl(option.imageUrl)} alt={option.label} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-espresso via-caramel to-cream" />
                  )}
                  <span>{option.label}</span>
                </span>
              )}
              onChange={(value) =>
                setRewardForm((prev) => ({
                  ...prev,
                  productId: value,
                }))
              }
            />
          </div>

          {selectedRewardProduct && (
            <div className={dashboardItemClass}>
              <div className="flex items-center gap-3">
                {selectedRewardProduct.imageUrl ? (
                  <img
                    src={resolveImageUrl(selectedRewardProduct.imageUrl)}
                    alt={selectedRewardProduct.name}
                    className="h-16 w-16 rounded-xl2 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-espresso">{selectedRewardProduct.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-cocoa/60">
                    {selectedRewardProduct.description || "No description for this item."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Input
            type="number"
            min="1"
            step="1"
            placeholder="Points required"
            value={rewardForm.pointsRequired}
            onChange={(e) =>
              setRewardForm((prev) => ({
                ...prev,
                pointsRequired: e.target.value,
              }))
            }
          />
          <label className="flex items-center gap-2 text-xs text-cocoa/70">
            <input
              type="checkbox"
              checked={rewardForm.isActive}
              onChange={(e) =>
                setRewardForm((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
              className="accent-gold"
            />
            Reward is active
          </label>

          {rewardError && <p className="form-error">{rewardError}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1 justify-center" disabled={rewardSaving}>
              {rewardSaving
                ? "Saving..."
                : rewardForm.id
                  ? "Update Reward"
                  : "Create Reward"}
            </Button>
            {rewardForm.id && (
              <Button type="button" variant="secondary" onClick={resetRewardForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Reward Library"
          title="Rewards List"
          description={`${adminRewards.length} reward${adminRewards.length === 1 ? "" : "s"} configured for customers.`}
        />

        <div className="mt-4 space-y-3 text-sm">
          {adminRewards.map((reward) => (
            <div key={reward._id} className={dashboardItemClass}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {reward.imageUrl ? (
                    <img src={resolveImageUrl(reward.imageUrl)} alt={reward.title} className="h-14 w-14 rounded-xl2 object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                  )}
                  <div className="min-w-0">
                    {reward.product?.name && (
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cocoa/50">
                        Menu Item Reward
                      </p>
                    )}
                    <p className="font-semibold text-espresso">{reward.title}</p>
                    <p className="mt-1 text-xs text-cocoa/60">{reward.pointsRequired} pts</p>
                  </div>
                </div>
                <Badge>{reward.isActive === false ? "Inactive" : "Active"}</Badge>
              </div>
              {reward.description && (
                <p className="mt-3 text-sm text-cocoa/70">{reward.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => handleRewardEdit(reward)}>
                  Edit
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleRewardDelete(reward._id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {adminRewards.length === 0 && (
            <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/45 p-4 text-sm text-cocoa/60">
              No rewards yet. Add the first reward from the form.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
