import { getUnitPrice, normalizeSizePrices } from "./pricing";

const ORDER_EDIT_SESSION_KEY = "pendingOrderEditSession";

export const createOrderDraftLineId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildOrderDraftItem = (product, overrides = {}) => {
  const sizePrices = normalizeSizePrices(product);
  const selectedSize =
    overrides.selectedSize ??
    sizePrices.find((entry) => entry.size === "Regular")?.size ??
    sizePrices[0]?.size ??
    "";

  return {
    id: overrides.id || createOrderDraftLineId(),
    productId: overrides.productId || product?._id || "",
    product,
    name: overrides.name || product?.name || "Item",
    imageUrl: overrides.imageUrl || product?.imageUrl || "",
    quantity: Number(overrides.quantity) || 1,
    selectedSize,
    selectedAddOns: overrides.selectedAddOns || [],
    unitPrice:
      Number(overrides.unitPrice) || getUnitPrice(product, selectedSize),
  };
};

export const buildEditableOrderDraft = (order) => ({
  items: (order.items || [])
    .filter((item) => !item.isRewardRedemption)
    .map((item) =>
      buildOrderDraftItem(
        item.productId && typeof item.productId === "object" ? item.productId : null,
        {
          id: item._id,
          productId: item.productId?._id || item.productId,
          name: item.productId?.name || "Item",
          imageUrl: item.productId?.imageUrl || "",
          quantity: Number(item.quantity) || 1,
          selectedSize: item.selectedSize || "",
          selectedAddOns: item.selectedAddOns || [],
          unitPrice: Number(item.unitPrice || 0),
        },
      ),
    ),
  rewardItems: (order.items || []).filter((item) => item.isRewardRedemption),
  specialInstructions: order.specialInstructions || "",
});

export const saveOrderEditSession = (session) => {
  try {
    localStorage.setItem(ORDER_EDIT_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage write errors and keep the UI working in-memory.
  }
};

export const loadOrderEditSession = () => {
  try {
    const stored = localStorage.getItem(ORDER_EDIT_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearOrderEditSession = () => {
  try {
    localStorage.removeItem(ORDER_EDIT_SESSION_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
};
