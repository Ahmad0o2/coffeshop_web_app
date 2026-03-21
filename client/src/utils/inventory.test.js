import { describe, expect, it } from 'vitest'
import {
  canOrderProduct,
  getInventoryStatusLabel,
  isProductLowStock,
  isProductOutOfStock,
} from './inventory'

describe('inventory utils', () => {
  it('detects out-of-stock products only when tracked inventory reaches zero', () => {
    expect(isProductOutOfStock({ inventoryQuantity: 0 })).toBe(true)
    expect(isProductOutOfStock({ inventoryQuantity: 3 })).toBe(false)
    expect(isProductOutOfStock({ inventoryQuantity: -1 })).toBe(false)
    expect(isProductOutOfStock({})).toBe(false)
  })

  it('detects low stock only for tracked positive inventory at or below the threshold', () => {
    expect(
      isProductLowStock({ inventoryQuantity: 3, lowStockThreshold: 5 })
    ).toBe(true)
    expect(
      isProductLowStock({ inventoryQuantity: 6, lowStockThreshold: 5 })
    ).toBe(false)
    expect(isProductLowStock({ inventoryQuantity: 0, lowStockThreshold: 5 })).toBe(
      false
    )
    expect(isProductLowStock({ inventoryQuantity: 2 })).toBe(true)
    expect(isProductLowStock({})).toBe(false)
  })

  it('allows ordering only when the product is available and not out of stock', () => {
    expect(canOrderProduct({ isAvailable: true, inventoryQuantity: 4 })).toBe(true)
    expect(canOrderProduct({ isAvailable: true, inventoryQuantity: 0 })).toBe(false)
    expect(canOrderProduct({ isAvailable: false, inventoryQuantity: 10 })).toBe(
      false
    )
    expect(canOrderProduct({})).toBe(true)
  })

  it('returns the correct inventory label for each inventory state', () => {
    expect(getInventoryStatusLabel({ isAvailable: false, inventoryQuantity: 8 })).toBe(
      'Unavailable'
    )
    expect(getInventoryStatusLabel({})).toBe('Inventory open')
    expect(getInventoryStatusLabel({ inventoryQuantity: -2 })).toBe('Inventory open')
    expect(getInventoryStatusLabel({ inventoryQuantity: 0 })).toBe('Out of stock')
    expect(
      getInventoryStatusLabel({ inventoryQuantity: 2, lowStockThreshold: 3 })
    ).toBe('Low stock: 2')
    expect(
      getInventoryStatusLabel({ inventoryQuantity: 9, lowStockThreshold: 3 })
    ).toBe('9 in stock')
  })
})
