import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import useCart from '../hooks/useCart'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { getUnitPrice } from '../utils/pricing'

const fetchRewardHistory = async () => {
  const { data } = await api.get('/rewards/history')
  return data.redemptions || []
}

export default function Checkout() {
  const {
    items,
    total,
    clearCart,
    selectedRewardRedemptions,
    setSelectedRewardRedemptions,
  } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [cardDetails, setCardDetails] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    data: rewardHistory = [],
    isFetched: rewardsFetched,
    isFetching: rewardsFetching,
  } = useQuery({
    queryKey: ['reward-history'],
    queryFn: fetchRewardHistory,
    enabled: isAuthenticated,
    refetchOnMount: 'always',
  })

  const availableRewardRedemptions = useMemo(
    () =>
      rewardHistory.filter(
        (entry) => entry.status === 'Redeemed' && entry.rewardId?.product
      ),
    [rewardHistory]
  )

  const selectedRewardEntries = useMemo(
    () =>
      availableRewardRedemptions.filter((entry) =>
        selectedRewardRedemptions.includes(entry._id)
      ),
    [availableRewardRedemptions, selectedRewardRedemptions]
  )

  useEffect(() => {
    if (!rewardsFetched || rewardsFetching) return

    setSelectedRewardRedemptions((prev) =>
      prev.filter((id) =>
        availableRewardRedemptions.some((entry) => entry._id === id)
      )
    )
  }, [
    availableRewardRedemptions,
    rewardsFetched,
    rewardsFetching,
    setSelectedRewardRedemptions,
  ])

  const itemCount = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.quantity, 0) +
      selectedRewardRedemptions.length,
    [items, selectedRewardRedemptions.length]
  )

  const hasCheckoutItems = items.length > 0 || selectedRewardRedemptions.length > 0

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to place an order.')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (
        paymentMethod === 'Card' &&
        (!cardDetails.name ||
          !cardDetails.number ||
          !cardDetails.expiry ||
          !cardDetails.cvc)
      ) {
        setError('Please fill in card details.')
        setLoading(false)
        return
      }
      const payload = {
        items: items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedAddOns: item.selectedAddOns,
        })),
        rewardRedemptionIds: selectedRewardRedemptions,
        paymentMethod,
        specialInstructions: notes,
      }
      const { data } = await api.post('/orders', payload)
      queryClient.setQueriesData({ queryKey: ['reward-history'] }, (current) => {
        if (!Array.isArray(current)) return current

        return current.map((entry) =>
          selectedRewardRedemptions.includes(entry._id)
            ? { ...entry, status: 'Applied' }
            : entry
        )
      })
      await queryClient.invalidateQueries({ queryKey: ['reward-history'] })
      clearCart()
      navigate('/orders', {
        state: {
          justPlacedOrderId: data.order._id,
        },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section-shell max-w-5xl">
      <div className="card p-8">
        <h1 className="text-3xl font-semibold text-espresso">Checkout</h1>
        <p className="mt-2 text-sm text-cocoa/70">
          Confirm your order and choose your payment method.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="mt-4 rounded-xl2 border border-gold/20 bg-obsidian/50 p-4 text-sm text-cocoa/70">
          Please sign in to place an order.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-espresso">Payment</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl2 border border-gold/20 bg-obsidian/50 px-3 py-3 text-xs">
                <input
                  type="radio"
                  checked={paymentMethod === 'Cash'}
                  onChange={() => setPaymentMethod('Cash')}
                  className="accent-gold"
                />
                Pay with cash at pickup
              </label>
              <label className="flex items-center gap-2 rounded-xl2 border border-gold/20 bg-obsidian/50 px-3 py-3 text-xs">
                <input
                  type="radio"
                  checked={paymentMethod === 'Card'}
                  onChange={() => setPaymentMethod('Card')}
                  className="accent-gold"
                />
                Pay with card
              </label>
            </div>

            <div>
              <label className="text-sm font-semibold text-espresso">
                Special Instructions
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
              />
            </div>

            {paymentMethod === 'Card' && (
              <Card className="bg-obsidian/60">
                <CardHeader>
                  <CardTitle>Card Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Name on card"
                    value={cardDetails.name}
                    onChange={(e) =>
                      setCardDetails((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Card number"
                    value={cardDetails.number}
                    onChange={(e) =>
                      setCardDetails((prev) => ({ ...prev, number: e.target.value }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(e) =>
                        setCardDetails((prev) => ({
                          ...prev,
                          expiry: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="CVC"
                      value={cardDetails.cvc}
                      onChange={(e) =>
                        setCardDetails((prev) => ({ ...prev, cvc: e.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {error && <p className="form-error">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={loading || !hasCheckoutItems || !isAuthenticated}
              className={`w-full justify-center ${
                !isAuthenticated ? 'opacity-50' : ''
              }`}
            >
              {loading ? 'Placing order...' : 'Place Order'}
            </Button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-espresso">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl2 border border-gold/10 bg-obsidian/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-12 w-12 rounded-xl2 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
                    )}
                    <div>
                      <p className="font-semibold text-espresso">{item.product.name}</p>
                      <p className="text-xs text-cocoa/60">
                        {item.quantity}x {item.selectedSize || 'Regular'}
                      </p>
                      {item.selectedAddOns?.length > 0 && (
                        <p className="max-w-md text-xs text-cocoa/60">
                          Add-ons: {item.selectedAddOns.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-espresso">
                    {(
                      getUnitPrice(item.product, item.selectedSize) * item.quantity
                    ).toFixed(2)}{' '}
                    JD
                  </p>
                </div>
              </div>
            ))}
            {selectedRewardEntries.map((entry) => (
              <div
                key={entry._id}
                className="rounded-xl2 border border-gold/20 bg-caramel/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {entry.rewardId?.imageUrl ? (
                      <img
                        src={entry.rewardId.imageUrl}
                        alt={entry.rewardId?.title || 'Reward'}
                        className="h-12 w-12 rounded-xl2 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-espresso">
                          {entry.rewardId?.title || 'Reward'}
                        </p>
                        <Badge>Redeemed Reward</Badge>
                      </div>
                      <p className="text-xs text-cocoa/60">
                        1x Free item added from your rewards
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-espresso">
                    Free
                  </p>
                </div>
              </div>
            ))}
            {selectedRewardEntries.length === 0 &&
              selectedRewardRedemptions.length > 0 && (
                <div className="rounded-xl2 border border-gold/15 bg-obsidian/40 p-3 text-xs text-cocoa/70">
                  Loading redeemed reward items...
                </div>
              )}
            {notes && (
              <div className="rounded-xl2 border border-gold/20 bg-obsidian/50 p-3 text-xs text-cocoa/70">
                <span className="font-semibold text-espresso">Notes:</span> {notes}
                </div>
              )}
            <div className="mt-2 border-t border-espresso/10 pt-3 text-sm text-cocoa/70">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{itemCount}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-semibold text-espresso">
                <span>Total</span>
                <span>{total.toFixed(2)} JD</span>
              </div>
              {selectedRewardRedemptions.length > 0 && (
                <p className="mt-2 text-xs text-cocoa/60">
                  Redeemed rewards selected in your cart are added free after
                  order confirmation.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
