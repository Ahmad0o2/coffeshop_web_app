import { describe, expect, it } from 'vitest'
import {
  getDisplayPrice,
  getUnitPrice,
  normalizeSizePrices,
} from './pricing'

describe('pricing utils', () => {
  it('returns explicit size prices when they already exist', () => {
    const product = {
      sizePrices: [
        { size: 'Regular', price: 2.5 },
        { size: 'Large', price: 3.25 },
      ],
      price: 99,
    }

    expect(normalizeSizePrices(product)).toEqual(product.sizePrices)
  })

  it('builds size prices from sizeOptions and a numeric base price', () => {
    expect(
      normalizeSizePrices({
        sizeOptions: ['Regular', 'Large'],
        price: 4,
      })
    ).toEqual([
      { size: 'Regular', price: 4 },
      { size: 'Large', price: 4 },
    ])
  })

  it('falls back to a regular size when only a single numeric price exists', () => {
    expect(normalizeSizePrices({ price: 3.75 })).toEqual([
      { size: 'Regular', price: 3.75 },
    ])
  })

  it('returns an empty list when no valid price information exists', () => {
    expect(normalizeSizePrices({ sizeOptions: ['Regular'] })).toEqual([])
    expect(normalizeSizePrices({ price: Number.NaN })).toEqual([])
    expect(normalizeSizePrices(null)).toEqual([])
  })

  it('returns the matching unit price for a selected size', () => {
    const product = {
      sizePrices: [
        { size: 'Regular', price: 2.5 },
        { size: 'Large', price: 3.5 },
      ],
    }

    expect(getUnitPrice(product, 'Large')).toBe(3.5)
  })

  it('falls back to the minimum available size price when selection is missing', () => {
    const product = {
      sizePrices: [
        { size: 'Large', price: 4.1 },
        { size: 'Regular', price: 3.2 },
      ],
    }

    expect(getUnitPrice(product)).toBe(3.2)
    expect(getUnitPrice(product, 'Medium')).toBe(3.2)
  })

  it('falls back to product.price when there are no size prices', () => {
    expect(getUnitPrice({ price: 6.25 }, 'Large')).toBe(6.25)
    expect(getUnitPrice({ price: '6.25' }, 'Large')).toBe(0)
  })

  it('returns the minimum display price and whether it should be shown as from-price', () => {
    expect(
      getDisplayPrice({
        sizePrices: [
          { size: 'Regular', price: 2.8 },
          { size: 'Large', price: 3.6 },
        ],
      })
    ).toEqual({ price: 2.8, isFrom: true })

    expect(getDisplayPrice({ price: 5 })).toEqual({ price: 5, isFrom: false })
    expect(getDisplayPrice({})).toEqual({ price: 0, isFrom: false })
  })
})
