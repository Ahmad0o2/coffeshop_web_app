import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import useCart from '../hooks/useCart'
import useAuth from '../hooks/useAuth'
import SelectMenu from '../components/common/SelectMenu'
import { Button } from '../components/ui/button'
import { DetailSkeleton } from '../components/common/PageSkeleton'
import { getUnitPrice, normalizeSizePrices } from '../utils/pricing'
import useRealtimeInvalidation from '../hooks/useRealtimeInvalidation'
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
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedAddOns, setSelectedAddOns] = useState([])
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
  const inventoryQuantity = getInventoryQuantity(product)
  const canOrder = canOrderProduct(product)
  const isLowStock = isProductLowStock(product)

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

  return (
    <section className="section-shell max-w-4xl">
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
            onClick={() =>
              addItem(product, { selectedSize: resolvedSize, selectedAddOns })
            }
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
              ? 'Add to cart'
              : 'Sign in to order'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>
    </section>
  )
}
