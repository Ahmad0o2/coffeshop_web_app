export const normalizeSizePrices = (product) => {
  if (product?.sizePrices?.length) return product.sizePrices;
  if (product?.sizeOptions?.length && Number.isFinite(product.price)) {
    return product.sizeOptions.map((size) => ({ size, price: product.price }));
  }
  if (Number.isFinite(product?.price)) {
    return [{ size: "Regular", price: product.price }];
  }
  return [];
};

export const getUnitPrice = (product, selectedSize) => {
  const sizePrices = normalizeSizePrices(product);
  if (sizePrices.length) {
    if (selectedSize) {
      const match = sizePrices.find((entry) => entry.size === selectedSize);
      if (match) return match.price;
    }
    return Math.min(...sizePrices.map((entry) => entry.price));
  }
  return Number.isFinite(product?.price) ? product.price : 0;
};

export const getDisplayPrice = (product) => {
  const sizePrices = normalizeSizePrices(product);
  if (!sizePrices.length) {
    return {
      price: Number.isFinite(product?.price) ? product.price : 0,
      isFrom: false,
    };
  }
  const min = Math.min(...sizePrices.map((entry) => entry.price));
  return { price: min, isFrom: sizePrices.length > 1 };
};
