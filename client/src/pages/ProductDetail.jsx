import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import api from '../services/api'
import useCart from '../hooks/useCart'
import useAuth from '../hooks/useAuth'
import useTheme from '../hooks/useTheme'
import SelectMenu from '../components/common/SelectMenu'
import { Button } from '../components/ui/button'
import { DetailSkeleton } from '../components/common/PageSkeleton'
import { getUnitPrice, normalizeSizePrices } from '../utils/pricing'
import useRealtimeInvalidation from '../hooks/useRealtimeInvalidation'
import { cn } from '../lib/utils'
import {
  buildOrderDraftItem,
  loadOrderEditSession,
  saveOrderEditSession,
} from '../utils/orderEditSession'
import {
  canOrderProduct,
  getInventoryQuantity,
  isProductLowStock,
} from '../utils/inventory'

const fetchProduct = async (id) => {
  const { data } = await api.get(`/products/${id}`)
  return data.product
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const orderEditSession = useMemo(
    () => {
      void location.key
      return loadOrderEditSession()
    },
    [location.key]
  )
  const realtimeBindings = useMemo(
    () => [
      { event: 'catalog:changed', queryKeys: [['product', id]] },
      { event: 'order:new', queryKeys: [['product', id]] },
      { event: 'order:status', queryKeys: [['product', id]] },
    ],
    [id]
  )
  useRealtimeInvalidation(realtimeBindings)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
  })

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!product) {
    return <DetailSkeleton />
  }

  const sizePrices = normalizeSizePrices(product)
  const resolvedSize =
    selectedSize ||
    sizePrices.find((entry) => entry.size === 'Regular')?.size ||
    sizePrices[0]?.size ||
    ''
  const unitPrice = getUnitPrice(product, resolvedSize)
  const previousPath = location.state?.from
  const sessionOrderId =
    location.state?.orderEditSession?.orderId || orderEditSession?.orderId || ''
  const activeOrderEditSession = sessionOrderId
    ? {
        ...(orderEditSession || {}),
        orderId: sessionOrderId,
      }
    : null
  const inventoryQuantity = getInventoryQuantity(product)
  const canOrder = canOrderProduct(product)
  const isLowStock = isProductLowStock(product)
  const isDayTheme = theme === 'day'
  const siteOrigin =
    typeof window !== 'undefined' ? window.location.origin : ''
  const productImageUrl = product.imageUrl
    ? product.imageUrl.startsWith('data:')
      ? siteOrigin
        ? `${siteOrigin}/api/v1/products/${product._id}/image`
        : product.imageUrl
      : product.imageUrl.startsWith('http')
      ? product.imageUrl
      : siteOrigin
      ? new URL(product.imageUrl, siteOrigin).toString()
      : product.imageUrl
    : ''
  const productMetaDescription =
    product.description || `Discover ${product.name} at Cortina.D Coffee House.`
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productMetaDescription,
    image: productImageUrl || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'JOD',
      price: unitPrice.toFixed(2),
      availability: canOrder
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: siteOrigin ? `${siteOrigin}/menu/${product._id}` : `/menu/${product._id}`,
    },
  }
  const orderEditBannerClass = cn(
    'flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border px-5 py-4 shadow-[0_18px_34px_rgba(19,14,12,0.14)]',
    isDayTheme
      ? 'border-[#3f7674]/18 bg-[#f8fcfc] text-espresso'
      : 'border-gold/18 bg-[#17110f] text-cream'
  )

  const handleReturnToOrder = () => {
    if (!activeOrderEditSession?.orderId) return
    navigate('/orders', {
      state: {
        restoreOrderEditor: true,
        orderId: activeOrderEditSession.orderId,
      },
    })
  }

  const handleCancelOrderEditFlow = () => {
    if (!activeOrderEditSession?.orderId) return
    navigate('/orders', {
      state: {
        restoreOrderEditor: true,
        orderId: activeOrderEditSession.orderId,
      },
    })
  }

  const handleBack = () => {
    if (previousPath) {
      navigate(previousPath)
      return
    }

    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/menu')
  }

  const toggleAddOn = (value) => {
    setSelectedAddOns((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  const handlePrimaryAction = () => {
    if (activeOrderEditSession?.orderId) {
      const nextDraft = {
        ...activeOrderEditSession.draft,
        items: [
          ...(activeOrderEditSession.draft?.items || []),
          buildOrderDraftItem(product, {
            selectedSize: resolvedSize,
            selectedAddOns,
          }),
        ],
      }

      saveOrderEditSession({
        ...activeOrderEditSession,
        draft: nextDraft,
      })
      navigate('/orders', {
        state: {
          restoreOrderEditor: true,
          orderId: activeOrderEditSession.orderId,
          addedToOrderName: product.name,
        },
      })
      return
    }

    addItem(product, { selectedSize: resolvedSize, selectedAddOns })
  }

  return (
    <>
      <Helmet>
        <title>{`${product.name} — Cortina.D`}</title>
        <meta name="description" content={productMetaDescription} />
        <meta property="og:title" content={`${product.name} — Cortina.D`} />
        <meta property="og:description" content={productMetaDescription} />
        <meta property="og:type" content="product" />
        {productImageUrl ? <meta property="og:image" content={productImageUrl} /> : null}
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>

      <section className="section-shell max-w-4xl">
      {activeOrderEditSession?.orderId && (
        <div className="sticky top-24 z-20 mb-6 pt-2">
          <div className={orderEditBannerClass}>
            <div>
              <p
                className={cn(
                  'text-sm font-semibold',
                  isDayTheme ? 'text-espresso' : 'text-cream'
                )}
              >
                Adding to order #{activeOrderEditSession.orderId}
              </p>
              <p
                className={cn(
                  'mt-1 text-xs',
                  isDayTheme ? 'text-cocoa/68' : 'text-cocoa/78'
                )}
              >
                Customize this item, then attach it to the order and jump back to
                your order.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={handleReturnToOrder}>
                Back To Your Order
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelOrderEditFlow}>
                Cancel Adding
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="card p-8">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="mt-4 h-96 w-full rounded-xl2 object-cover sm:h-[28rem]"
          />
        ) : (
          <div className="mt-4 h-96 w-full rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream sm:h-[28rem]" />
        )}
        <h1 className="mt-6 text-3xl font-semibold text-espresso">
          {product.name}
        </h1>
        <p className="mt-2 text-sm text-cocoa/70">{product.description}</p>
        <p className="mt-4 text-xl font-semibold text-espresso">
          {unitPrice.toFixed(2)} JD
        </p>
        {!canOrder && (
          <div className="mt-4 rounded-xl2 border border-rose-200/60 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {product.isAvailable === false
              ? 'This item is currently unavailable.'
              : 'This item is currently out of stock.'}
          </div>
        )}
        {canOrder && isLowStock && inventoryQuantity !== null && (
          <div className="mt-4 rounded-xl2 border border-gold/20 bg-caramel/10 px-4 py-3 text-sm font-medium text-espresso">
            Only {inventoryQuantity} left in stock.
          </div>
        )}

        {sizePrices.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-espresso">Size</p>
            <SelectMenu
              value={resolvedSize}
              onChange={setSelectedSize}
              placeholder="Select size"
              options={sizePrices.map((entry) => ({
                label: `${entry.size} - ${entry.price.toFixed(2)} JD`,
                value: entry.size,
              }))}
            />
          </div>
        )}

        {product.addOns?.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-espresso">Add-ons</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.addOns.map((addOn) => (
                <Button
                  key={addOn}
                  onClick={() => toggleAddOn(addOn)}
                  size="sm"
                  variant={
                    selectedAddOns.includes(addOn) ? 'default' : 'secondary'
                  }
                >
                  {addOn}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button
            onClick={handlePrimaryAction}
            disabled={!isAuthenticated || !canOrder}
            className={
              !isAuthenticated || !canOrder ? 'cursor-not-allowed opacity-50' : ''
            }
          >
            {!canOrder
              ? product.isAvailable === false
                ? 'Unavailable'
                : 'Out of stock'
              : isAuthenticated
              ? activeOrderEditSession?.orderId
                ? 'Add to order'
                : 'Add to cart'
              : 'Sign in to order'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>
      </section>
    </>
  )
}
