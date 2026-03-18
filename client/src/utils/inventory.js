export const getInventoryQuantity = (product) =>
  Number.isInteger(product?.inventoryQuantity) && product.inventoryQuantity >= 0
    ? product.inventoryQuantity
    : null

export const getLowStockThreshold = (product) =>
  Number.isInteger(product?.lowStockThreshold) && product.lowStockThreshold >= 0
    ? product.lowStockThreshold
    : 5

export const isInventoryTracked = (product) => getInventoryQuantity(product) !== null

export const isProductOutOfStock = (product) => {
  const inventoryQuantity = getInventoryQuantity(product)
  return inventoryQuantity !== null && inventoryQuantity <= 0
}

export const isProductLowStock = (product) => {
  const inventoryQuantity = getInventoryQuantity(product)
  if (inventoryQuantity === null || inventoryQuantity <= 0) {
    return false
  }

  return inventoryQuantity <= getLowStockThreshold(product)
}

export const canOrderProduct = (product) =>
  product?.isAvailable !== false && !isProductOutOfStock(product)

export const getInventoryStatusLabel = (product) => {
  if (product?.isAvailable === false) {
    return 'Unavailable'
  }

  const inventoryQuantity = getInventoryQuantity(product)
  if (inventoryQuantity === null) {
    return 'Inventory open'
  }

  if (inventoryQuantity <= 0) {
    return 'Out of stock'
  }

  if (isProductLowStock(product)) {
    return `Low stock: ${inventoryQuantity}`
  }

  return `${inventoryQuantity} in stock`
}
