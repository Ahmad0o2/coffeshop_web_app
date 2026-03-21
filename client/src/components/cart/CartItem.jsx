import SelectMenu from "../common/SelectMenu";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { getUnitPrice, normalizeSizePrices } from "../../utils/pricing";
import { resolveImageUrl } from "../../services/api";
import {
  canOrderProduct,
  getInventoryQuantity,
  isProductLowStock,
} from "../../utils/inventory";

export default function CartItem({
  item,
  onRemove,
  onUpdate,
  onUpdateOptions,
}) {
  const sizePrices = normalizeSizePrices(item.product);
  const sizeOptions = sizePrices.map((entry) => entry.size);
  const unitPrice = getUnitPrice(item.product, item.selectedSize);
  const inventoryQuantity = getInventoryQuantity(item.product);
  const canOrder = canOrderProduct(item.product);
  const isLowStock = isProductLowStock(item.product);

  const toggleAddOn = (addOn) => {
    const exists = item.selectedAddOns.includes(addOn);
    const next = exists
      ? item.selectedAddOns.filter((value) => value !== addOn)
      : [...item.selectedAddOns, addOn];
    onUpdateOptions(item.id, { selectedAddOns: next });
  };

  return (
    <div className="rounded-xl2 border border-gold/20 bg-obsidian/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {item.product.imageUrl ? (
            <img
              src={resolveImageUrl(item.product.imageUrl)}
              alt={item.product.name}
              className="h-16 w-16 rounded-xl2 object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
          )}
          <div>
            <p className="text-sm font-semibold text-espresso">
              {item.product.name}
            </p>
            <p className="text-xs text-cocoa/60">
              {item.selectedSize || "Regular"} - {unitPrice.toFixed(2)} JD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min="1"
            max={inventoryQuantity ?? undefined}
            value={item.quantity}
            onChange={(e) => {
              const nextQuantity = Number(e.target.value);
              if (
                inventoryQuantity !== null &&
                nextQuantity > inventoryQuantity
              ) {
                onUpdate(item.id, inventoryQuantity);
                return;
              }
              onUpdate(item.id, nextQuantity);
            }}
            className="w-20"
          />
          <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
            Remove
          </Button>
        </div>
      </div>

      {!canOrder && (
        <div className="mt-4 rounded-xl2 border border-rose-200/60 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {item.product.isAvailable === false
            ? "This product is unavailable right now. Please remove it before checkout."
            : "This product is no longer in stock. Please remove it before checkout."}
        </div>
      )}
      {canOrder && isLowStock && inventoryQuantity !== null && (
        <div className="mt-4 rounded-xl2 border border-gold/20 bg-caramel/10 px-3 py-2 text-xs font-medium text-espresso">
          Only {inventoryQuantity} left right now.
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        <SelectMenu
          label="Size"
          value={item.selectedSize}
          onChange={(value) =>
            onUpdateOptions(item.id, { selectedSize: value })
          }
          placeholder="Select size"
          options={sizeOptions.map((size) => {
            const price = sizePrices.find(
              (entry) => entry.size === size,
            )?.price;
            return {
              label: `${size} ${price ? `- ${price.toFixed(2)} JD` : ""}`,
              value: size,
            };
          })}
        />
        <div>
          <p className="text-xs font-semibold text-cocoa/70">Add-ons</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(item.product.addOns || []).map((addOn) => (
              <Button
                key={addOn}
                type="button"
                size="sm"
                variant={
                  item.selectedAddOns.includes(addOn) ? "default" : "secondary"
                }
                onClick={() => toggleAddOn(addOn)}
              >
                {addOn}
              </Button>
            ))}
            {item.product.addOns?.length === 0 && (
              <span className="text-xs text-cocoa/60">No add-ons</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
