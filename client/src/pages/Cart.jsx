import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import CartItem from '../components/cart/CartItem'
import CartSummary from '../components/cart/CartSummary'
import useCart from '../hooks/useCart'
import useAuth from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import api from '../services/api'

const fetchRewardHistory = async () => {
  const { data } = await api.get('/rewards/history')
  return data.redemptions || []
}

export default function Cart() {
  const {
    items,
    updateQuantity,
    updateOptions,
    removeItem,
    total,
    selectedRewardRedemptions,
    toggleRewardRedemption,
    setSelectedRewardRedemptions,
  } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [preparingCheckout, setPreparingCheckout] = useState(false)
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
  const hasSelectedRewardRedemptions = selectedRewardRedemptions.length > 0
  const hasCartContent = items.length > 0 || hasSelectedRewardRedemptions

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

  const handleCheckout = async () => {
    if (!isAuthenticated || preparingCheckout) return

    if (selectedRewardRedemptions.length > 0) {
      setPreparingCheckout(true)
      try {
        await queryClient.fetchQuery({
          queryKey: ['reward-history'],
          queryFn: fetchRewardHistory,
        })
      } catch {
        // If reward history refetch fails, still continue to checkout so the user
        // is not blocked; checkout will show its own loading/error state.
      } finally {
        setPreparingCheckout(false)
      }
    }

    navigate('/checkout')
  }

  return (
    <section className="section-shell max-w-5xl">
      <h1 className="text-3xl font-semibold text-espresso">Your Cart</h1>
      {!isAuthenticated && (
        <div className="mt-4 rounded-xl2 border border-gold/20 bg-obsidian/50 p-4 text-sm text-cocoa/70">
          Please sign in to view your cart and place orders.
          <Link
            to="/sign-in"
            state={{ redirectTo: "/cart" }}
            className="ml-2 text-espresso underline"
          >
            Sign in
          </Link>
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {!hasCartContent ? (
            <p className="text-sm text-cocoa/60">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={removeItem}
                onUpdate={updateQuantity}
                onUpdateOptions={updateOptions}
              />
            ))
          )}

          {isAuthenticated &&
            (availableRewardRedemptions.length > 0 || hasSelectedRewardRedemptions) && (
            <Card className="bg-obsidian/60">
              <CardHeader>
                <CardTitle>Redeemed Rewards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-cocoa/70">
                  Choose any redeemed reward you want to add to your cart for
                  free before checkout.
                </p>
                {availableRewardRedemptions.map((entry) => {
                  const isSelected = selectedRewardRedemptions.includes(entry._id)
                  return (
                    <button
                      key={entry._id}
                      type="button"
                      onClick={() => toggleRewardRedemption(entry._id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl2 border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-gold/40 bg-caramel/10'
                          : 'border-gold/15 bg-obsidian/50 hover:border-gold/30'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {entry.rewardId?.imageUrl ? (
                          <img
                            src={entry.rewardId.imageUrl}
                            alt={entry.rewardId?.title || 'Reward'}
                            className="h-12 w-12 rounded-xl2 object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-espresso">
                            {entry.rewardId?.title || 'Reward'}
                          </p>
                          <p className="truncate text-xs text-cocoa/60">
                            {entry.rewardId?.description || 'Free reward item'}
                          </p>
                        </div>
                      </div>
                      <Badge className="shrink-0">
                        {isSelected ? 'Added Free' : 'Use Free'}
                      </Badge>
                    </button>
                  )
                })}
                {availableRewardRedemptions.length === 0 && hasSelectedRewardRedemptions && (
                  <div className="rounded-xl2 border border-gold/15 bg-obsidian/50 px-3 py-3 text-xs text-cocoa/70">
                    Loading your redeemed rewards...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <CartSummary total={total} />
          {selectedRewardEntries.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-espresso">
                Free Rewards in Cart
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                {selectedRewardEntries.map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between rounded-xl2 border border-gold/20 bg-caramel/10 p-3"
                  >
                    <div>
                      <p className="font-semibold text-espresso">
                        {entry.rewardId?.title || 'Reward'}
                      </p>
                      <p className="text-xs text-cocoa/60">
                        This redeemed reward will be added free at checkout.
                      </p>
                    </div>
                    <Badge>Free</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAuthenticated ? (
            <Button
              type="button"
              className="w-full justify-center"
              disabled={preparingCheckout}
              onClick={handleCheckout}
            >
              {preparingCheckout ? 'Preparing checkout...' : 'Checkout'}
            </Button>
          ) : (
            <Button className="w-full justify-center opacity-50" disabled>
              Checkout
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
