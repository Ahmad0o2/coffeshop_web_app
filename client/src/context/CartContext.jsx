import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { getUnitPrice } from '../utils/pricing'
import { CartContext } from './cart-context'

const persistItems = (nextItems) => {
  try {
    localStorage.setItem('cartItems', JSON.stringify(nextItems))
  } catch {
    // Ignore storage write failures and keep in-memory state working.
  }
}

const persistSelectedRewardRedemptions = (nextSelectedRewardRedemptions) => {
  try {
    localStorage.setItem(
      'selectedRewardRedemptions',
      JSON.stringify(nextSelectedRewardRedemptions)
    )
  } catch {
    // Ignore storage write failures and keep in-memory state working.
  }
}

const buildSignature = (productId, selectedSize = '', selectedAddOns = []) =>
  `${productId}-${selectedSize || 'Regular'}-${[...selectedAddOns]
    .sort()
    .join('|')}`

const createLineId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const syncStateUpdate = (updater) => {
  try {
    flushSync(updater)
  } catch {
    updater()
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('cartItems')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [lastAdded, setLastAdded] = useState(null)
  const [selectedRewardRedemptions, setSelectedRewardRedemptions] = useState(() => {
    try {
      const stored = localStorage.getItem('selectedRewardRedemptions')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const addItem = useCallback((product, options = {}) => {
    const selectedSize = options.selectedSize || ''
    const selectedAddOns = options.selectedAddOns || []
    const signature = buildSignature(product._id, selectedSize, selectedAddOns)
    const maxInventory =
      Number.isInteger(product?.inventoryQuantity) && product.inventoryQuantity >= 0
        ? product.inventoryQuantity
        : null
    let didAddItem = false
    syncStateUpdate(() => {
      setItems((prev) => {
        const existing = prev.find((item) => item.signature === signature)
        if (maxInventory !== null && maxInventory <= 0) {
          return prev
        }
        if (existing && maxInventory !== null && existing.quantity >= maxInventory) {
          return prev
        }
        const nextItems = existing
          ? prev.map((item) =>
              item.id === existing.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [
              ...prev,
              {
                id: createLineId(),
                signature,
                product,
                quantity: 1,
                selectedSize,
                selectedAddOns,
              },
            ]
        didAddItem = nextItems !== prev
        persistItems(nextItems)
        return nextItems
      })
      if (didAddItem) {
        setLastAdded({
          id: product._id,
          name: product.name,
          at: Date.now(),
        })
      }
    })
  }, [])

  useEffect(() => {
    if (!lastAdded) return undefined
    const timeout = setTimeout(() => setLastAdded(null), 2400)
    return () => clearTimeout(timeout)
  }, [lastAdded])

  useEffect(() => {
    persistItems(items)
  }, [items])

  useEffect(() => {
    persistSelectedRewardRedemptions(selectedRewardRedemptions)
  }, [selectedRewardRedemptions])

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      syncStateUpdate(() => {
        setItems((prev) => {
          const nextItems = prev.filter((item) => item.id !== itemId)
          persistItems(nextItems)
          return nextItems
        })
      })
      return
    }
    syncStateUpdate(() => {
      setItems((prev) => {
        const currentItem = prev.find((item) => item.id === itemId)
        const maxInventory =
          Number.isInteger(currentItem?.product?.inventoryQuantity) &&
          currentItem.product.inventoryQuantity >= 0
            ? currentItem.product.inventoryQuantity
            : null
        if (maxInventory === 0) {
          return prev
        }
        const safeQuantity =
          maxInventory !== null ? Math.min(quantity, maxInventory) : quantity
        const nextItems = prev.map((item) =>
          item.id === itemId ? { ...item, quantity: safeQuantity } : item
        )
        persistItems(nextItems)
        return nextItems
      })
    })
  }, [])

  const updateOptions = useCallback((itemId, options) => {
    syncStateUpdate(() => {
      setItems((prev) => {
        const currentIndex = prev.findIndex((item) => item.id === itemId)
        if (currentIndex === -1) return prev
        const current = prev[currentIndex]
        const selectedSize = options.selectedSize ?? current.selectedSize
        const selectedAddOns = options.selectedAddOns ?? current.selectedAddOns
        const nextSignature = buildSignature(
          current.product._id,
          selectedSize,
          selectedAddOns
        )

        let nextItems

        if (current.quantity > 1 && nextSignature !== current.signature) {
          nextItems = [...prev]
          nextItems[currentIndex] = {
            ...current,
            quantity: current.quantity - 1,
          }
          nextItems.splice(currentIndex + 1, 0, {
            ...current,
            id: createLineId(),
            signature: nextSignature,
            quantity: 1,
            selectedSize,
            selectedAddOns,
          })
        } else {
          nextItems = [...prev]
          nextItems[currentIndex] = {
            ...current,
            signature: nextSignature,
            selectedSize,
            selectedAddOns,
          }
        }

        persistItems(nextItems)
        return nextItems
      })
    })
  }, [])

  const removeItem = useCallback((itemId) => {
    syncStateUpdate(() => {
      setItems((prev) => {
        const nextItems = prev.filter((item) => item.id !== itemId)
        persistItems(nextItems)
        return nextItems
      })
    })
  }, [])

  const toggleRewardRedemption = useCallback((redemptionId) => {
    syncStateUpdate(() => {
      setSelectedRewardRedemptions((prev) => {
        const next = prev.includes(redemptionId)
          ? prev.filter((id) => id !== redemptionId)
          : [...prev, redemptionId]
        persistSelectedRewardRedemptions(next)
        return next
      })
    })
  }, [])

  const clearRewardRedemptions = useCallback(() => {
    persistSelectedRewardRedemptions([])
    syncStateUpdate(() => {
      setSelectedRewardRedemptions([])
    })
  }, [])

  const clearCart = useCallback(() => {
    persistItems([])
    persistSelectedRewardRedemptions([])
    syncStateUpdate(() => {
      setItems([])
      setSelectedRewardRedemptions([])
    })
  }, [])

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + getUnitPrice(item.product, item.selectedSize) * item.quantity,
        0
      ),
    [items]
  )

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      updateOptions,
      removeItem,
      clearCart,
      selectedRewardRedemptions,
      toggleRewardRedemption,
      clearRewardRedemptions,
      setSelectedRewardRedemptions,
      total,
      lastAdded,
    }),
    [
      items,
      addItem,
      updateQuantity,
      updateOptions,
      removeItem,
      clearCart,
      selectedRewardRedemptions,
      toggleRewardRedemption,
      clearRewardRedemptions,
      total,
      lastAdded,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
