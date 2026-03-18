import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import useSettings from '../hooks/useSettings'
import useTheme from '../hooks/useTheme'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import SelectMenu from '../components/common/SelectMenu'
import { getApiErrorMessage } from '../utils/apiErrors'
import { getInventoryStatusLabel, isProductLowStock, isProductOutOfStock } from '../utils/inventory'
import { cn } from '../lib/utils'

const fetchOrders = async () => {
  const { data } = await api.get('/orders')
  return data.orders || []
}

const fetchProducts = async () => {
  const { data } = await api.get('/products')
  return data.products || []
}

const fetchCategories = async () => {
  const { data } = await api.get('/categories')
  return data.categories || []
}

const fetchAdminEvents = async () => {
  const { data } = await api.get('/admin/events')
  return data.events || []
}

const fetchAdminRewards = async () => {
  const { data } = await api.get('/admin/rewards')
  return data.rewards || []
}

const fetchStaff = async () => {
  const { data } = await api.get('/admin/staff')
  return data.staff || []
}

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const statusOptions = ['Received', 'InProgress', 'Ready', 'Completed', 'Cancelled']
const sizeOptions = ['Small', 'Regular', 'Large']
const orderDateFilterOptions = ['All Dates', 'Today', 'Yesterday', 'Last 7 Days', 'This Month', 'This Year']
const inventoryStatusFilterOptions = [
  'All Items',
  'Tracked',
  'Open Inventory',
  'Low Stock',
  'Out of Stock',
  'Unavailable',
]
const staffPermissionOptions = [
  { value: 'manageOrders', label: 'Orders' },
  { value: 'manageProducts', label: 'Products & Categories' },
  { value: 'manageEvents', label: 'Events' },
  { value: 'manageRewards', label: 'Rewards' },
  { value: 'manageBrand', label: 'Brand & Home Media' },
]

const matchesOrderDateFilter = (value, filter) => {
  if (!filter || filter === 'All Dates') return true
  if (!value) return true

  const orderDate = new Date(value)
  if (Number.isNaN(orderDate.getTime())) return true

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfLast7Days = new Date(startOfToday)
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 6)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1)

  if (filter === 'Today') {
    return orderDate >= startOfToday && orderDate < startOfTomorrow
  }

  if (filter === 'Yesterday') {
    return orderDate >= startOfYesterday && orderDate < startOfToday
  }

  if (filter === 'Last 7 Days') {
    return orderDate >= startOfLast7Days && orderDate < startOfTomorrow
  }

  if (filter === 'This Month') {
    return orderDate >= startOfMonth && orderDate < startOfNextMonth
  }

  if (filter === 'This Year') {
    return orderDate >= startOfYear && orderDate < startOfNextYear
  }

  return true
}

const formatOrderDateTime = (value) => {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const matchesInventoryStatusFilter = (product, filter) => {
  if (!filter || filter === 'All Items') return true
  if (filter === 'Tracked') {
    return product.inventoryQuantity !== null && product.inventoryQuantity !== undefined
  }
  if (filter === 'Open Inventory') {
    return product.inventoryQuantity === null || product.inventoryQuantity === undefined
  }
  if (filter === 'Low Stock') return isProductLowStock(product)
  if (filter === 'Out of Stock') return isProductOutOfStock(product)
  if (filter === 'Unavailable') return product.isAvailable === false
  return true
}

function DashboardSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h2 className="text-lg font-semibold text-espresso">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-cocoa/60">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

const buildInventoryDraft = (product) => ({
  trackInventory:
    product?.inventoryQuantity !== null && product?.inventoryQuantity !== undefined,
  inventoryQuantity:
    product?.inventoryQuantity === null || product?.inventoryQuantity === undefined
      ? ''
      : String(product.inventoryQuantity),
  lowStockThreshold: String(product?.lowStockThreshold ?? 5),
  isAvailable: product?.isAvailable !== false,
})

const hasInventoryDraftChanges = (product, draft) => {
  const current = buildInventoryDraft(product)
  return (
    current.trackInventory !== draft.trackInventory ||
    current.inventoryQuantity !== draft.inventoryQuantity ||
    current.lowStockThreshold !== draft.lowStockThreshold ||
    current.isAvailable !== draft.isAvailable
  )
}

function DashboardStatCard({ label, value, note }) {
  return (
    <div className="flex h-full min-h-[7.75rem] w-full flex-col justify-between rounded-[1.4rem] border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)),rgba(15,11,10,0.88)] px-3.5 py-3 shadow-[0_16px_34px_rgba(16,10,8,0.11)] xl:w-[13.25rem]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cocoa/55">
        {label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[1.65rem] font-semibold tracking-tight text-espresso">{value}</p>
        {note ? (
          <p className="max-w-[6.6rem] text-right text-[11px] leading-4 text-cocoa/60">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function DashboardNavIcon({ icon, active = false, isDayTheme = false }) {
  const iconClass = cn(
    'h-[1.05rem] w-[1.05rem]',
    isDayTheme
      ? active
        ? 'text-[#315f5e]'
        : 'text-cocoa/75'
      : active
        ? 'text-espresso'
        : 'text-cocoa/75'
  )

  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
      {icon === 'orders' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      )}
      {icon === 'products' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z" />
          <path d="M4 7.5V16l8 4 8-4V7.5" />
          <path d="M12 11v9" />
        </svg>
      )}
      {icon === 'inventory' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <path d="M4 7.5h16" />
          <path d="M6 7.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1.5" />
          <rect x="4" y="7.5" width="16" height="12.5" rx="2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      )}
      {icon === 'rewards' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <circle cx="12" cy="8" r="4" />
          <path d="M8.5 12.5 7 20l5-2.8L17 20l-1.5-7.5" />
        </svg>
      )}
      {icon === 'brand' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 15l2.8-3 2.2 2.2 2.5-3 2.5 3.8" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      )}
      {icon === 'gallery' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      )}
      {icon === 'events' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M8 3v6M16 3v6M4 11h16" />
        </svg>
      )}
      {icon === 'manage' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="8" r="2.2" />
          <path d="M4.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
          <path d="M14.5 18c.4-1.8 1.8-3 4-3 1.1 0 2 .3 2.9.9" />
        </svg>
      )}
    </span>
  )
}

function DashboardUtilityIcon({ icon, className = '', isDayTheme = false }) {
  const iconClass = cn(
    'h-[1.05rem] w-[1.05rem]',
    isDayTheme ? 'text-[#315f5e]' : 'text-espresso',
    className
  )

  if (icon === 'workspace') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="5" rx="1.5" />
        <rect x="13" y="11" width="7" height="9" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
      </svg>
    )
  }

  if (icon === 'activity') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <path d="M4 14h3l2-5 4 9 2-4h5" />
        <path d="M4 6h16" opacity="0.35" />
      </svg>
    )
  }

  return null
}

function DashboardSidebarNavItems({
  dashboardTabs,
  activeTab,
  onTabSelect,
  isCompact = false,
  isAdmin = false,
  onActivityNavigate,
  isDayTheme = false,
}) {
  return (
    <div className="space-y-2">
      {dashboardTabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabSelect(tab.key)}
            className={cn(
              'group relative flex w-full items-center rounded-[1.35rem] border text-left transition-all',
              isCompact ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3',
              isDayTheme
                ? isActive
                  ? 'border-[#3f7674]/28 bg-[#e7f2f1] shadow-[0_7px_18px_rgba(34,71,70,0.035)]'
                  : 'border-[#3f7674]/12 bg-[rgba(248,252,252,0.92)] hover:border-[#3f7674]/20 hover:bg-[#eef6f5]'
                : isActive
                  ? 'border-gold/45 bg-gold/14 shadow-[0_14px_32px_rgba(19,13,9,0.12)]'
                  : 'border-gold/12 bg-obsidian/45 hover:border-gold/24 hover:bg-obsidian/55'
            )}
            title={tab.label}
          >
            {!isCompact && (
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
                  isActive ? (isDayTheme ? 'bg-[#315f5e] opacity-100' : 'bg-gold opacity-100') : 'opacity-0'
                )}
              />
            )}
            <DashboardNavIcon icon={tab.icon} active={isActive} isDayTheme={isDayTheme} />
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-sm font-semibold', isDayTheme ? 'text-espresso' : 'text-espresso')}>
                    {tab.label}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      isDayTheme
                        ? isActive
                          ? 'bg-[#315f5e] text-[#f8fcfc]'
                          : 'bg-[#deeeee] text-[#315f5e]'
                        : isActive
                          ? 'bg-obsidian/80 text-cream'
                          : 'bg-obsidian/70 text-cocoa/70'
                    )}
                  >
                    {tab.count}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-cocoa/58">
                  {tab.caption}
                </p>
              </div>
            )}
          </button>
        )
      })}

      {isAdmin && (
        <Link
          to="/admin/activity"
          onClick={onActivityNavigate}
          className={cn(
            'group relative flex w-full items-center rounded-[1.35rem] border text-left transition-all',
            isDayTheme
              ? 'border-[#3f7674]/12 bg-[rgba(248,252,252,0.92)] hover:border-[#3f7674]/20 hover:bg-[#eef6f5]'
              : 'border-gold/12 bg-obsidian/45 hover:border-gold/24 hover:bg-obsidian/55',
            isCompact ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3'
          )}
          title="Activity Log"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <DashboardUtilityIcon icon="activity" isDayTheme={isDayTheme} />
          </span>
          {!isCompact && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-espresso">
                  Activity Log
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-cocoa/58">
                Daily audit trail and changes
              </p>
            </div>
          )}
        </Link>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const emptyCategoryForm = {
    id: '',
    name: '',
    description: '',
  }
  const [form, setForm] = useState({
    id: '',
    name: '',
    categoryId: '',
    description: '',
    imageUrl: '',
    sizePrices: [],
    addOns: [],
    isAvailable: true,
    inventoryQuantity: '',
    lowStockThreshold: '5',
  })
  const [addOnDraft, setAddOnDraft] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandError, setBrandError] = useState('')
  const [gallerySaving, setGallerySaving] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [inventoryDrafts, setInventoryDrafts] = useState({})
  const [inventorySavingIds, setInventorySavingIds] = useState({})
  const [inventoryErrors, setInventoryErrors] = useState({})
  const [inventoryFilters, setInventoryFilters] = useState({
    search: '',
    status: 'All Items',
    categoryId: 'All Categories',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [heroFile, setHeroFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [heroPreview, setHeroPreview] = useState('')
  const [clearBrand, setClearBrand] = useState({
    logo: false,
    hero: false,
    homeDisplay: false,
  })
  const [orderFilters, setOrderFilters] = useState({
    status: 'All',
    payment: 'All',
    search: '',
    day: 'All Dates',
  })
  const [updatingOrderIds, setUpdatingOrderIds] = useState({})
  const [eventForm, setEventForm] = useState({
    id: '',
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    capacity: '',
    isActive: true,
  })
  const [eventSaving, setEventSaving] = useState(false)
  const [eventError, setEventError] = useState('')
  const [rewardForm, setRewardForm] = useState({
    id: '',
    productId: '',
    pointsRequired: '',
    isActive: true,
  })
  const [rewardSaving, setRewardSaving] = useState(false)
  const [rewardError, setRewardError] = useState('')
  const [featuredSelection, setFeaturedSelection] = useState([])
  const [featuredSaving, setFeaturedSaving] = useState(false)
  const [featuredError, setFeaturedError] = useState('')
  const [todaysSpecialId, setTodaysSpecialId] = useState('')
  const [featuredProductsSelection, setFeaturedProductsSelection] = useState([])
  const [homeProductsSaving, setHomeProductsSaving] = useState(false)
  const [homeProductsError, setHomeProductsError] = useState('')
  const [staffForm, setStaffForm] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'Staff',
    password: '',
    permissions: [],
  })
  const [staffSaving, setStaffSaving] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [isNavCompact, setIsNavCompact] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const queryClient = useQueryClient()

  const isAdmin = user?.role === 'Admin'
  const permissions = user?.permissions || []
  const canManageOrders = isAdmin || permissions.includes('manageOrders')
  const canManageProducts = isAdmin || permissions.includes('manageProducts')
  const canManageEvents = isAdmin || permissions.includes('manageEvents')
  const canManageRewards = isAdmin || permissions.includes('manageRewards')
  const canManageBrand = isAdmin || permissions.includes('manageBrand')

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: fetchOrders,
    enabled: isAuthenticated && canManageOrders,
  })

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: fetchProducts,
    enabled: isAuthenticated && (canManageProducts || canManageRewards),
  })

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategories,
    enabled: isAuthenticated && canManageProducts,
  })

  const { data: adminEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['admin-events'],
    queryFn: fetchAdminEvents,
    enabled: isAuthenticated && canManageEvents,
  })

  const { data: adminRewards = [], refetch: refetchRewards } = useQuery({
    queryKey: ['admin-rewards'],
    queryFn: fetchAdminRewards,
    enabled: isAuthenticated && canManageRewards,
  })

  const { data: staffList = [], refetch: refetchStaff } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: fetchStaff,
    enabled: isAuthenticated && isAdmin,
  })

  const { data: settings, refetch: refetchSettings } = useSettings()

  const patchOrderCache = useCallback((orderId, updater) => {
    queryClient.setQueryData(['admin-orders'], (current = []) =>
      current.map((order) => {
        if (order._id !== orderId) return order
        return typeof updater === 'function' ? updater(order) : { ...order, ...updater }
      })
    )
  }, [queryClient])

  useEffect(() => {
    if (!settings?.featuredEventIds) return

    const validEventIds = new Set(adminEvents.map((event) => event._id))
    const normalizedFeaturedIds = Array.from(
      new Set(
        settings.featuredEventIds.filter(
          (id) => !adminEvents.length || validEventIds.has(id)
        )
      )
    ).slice(0, 2)

    setFeaturedSelection(normalizedFeaturedIds)
  }, [settings?.featuredEventIds, adminEvents])

  useEffect(() => {
    setTodaysSpecialId(settings?.todaysSpecialProductId || '')
    setFeaturedProductsSelection(settings?.featuredProductIds || [])
  }, [settings?.todaysSpecialProductId, settings?.featuredProductIds])

  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat._id, cat.name])),
    [categories]
  )
  const selectedRewardProduct = useMemo(
    () => products.find((product) => product._id === rewardForm.productId) || null,
    [products, rewardForm.productId]
  )
  const rewardProductOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product._id,
        label: product.name,
        imageUrl: product.imageUrl || '',
      })),
    [products]
  )
  const permissionMap = useMemo(
    () => new Map(staffPermissionOptions.map((perm) => [perm.value, perm.label])),
    []
  )

  useEffect(() => {
    if (!isAuthenticated) return
    const socket = io(socketUrl)

    const handleCatalogChange = () => {
      if (canManageProducts || canManageRewards) {
        refetchProducts()
      }
      if (canManageProducts) {
        refetchCategories()
      }
      if (canManageRewards) {
        refetchRewards()
      }
    }

    const handleEventsChange = (payload) => {
      if (
        payload?.action === 'registration-updated' &&
        payload?.eventId &&
        typeof payload?.registrationsCount === 'number'
      ) {
        queryClient.setQueryData(['admin-events'], (current = []) =>
          current.map((event) =>
            event._id === payload.eventId
              ? {
                  ...event,
                  registrationsCount: payload.registrationsCount,
                }
              : event
          )
        )
      }
      if (canManageEvents) {
        refetchEvents()
      }
    }

    const handleRewardsChange = () => {
      if (canManageRewards) {
        refetchRewards()
      }
    }

    const handleOrderChange = (payload) => {
      if (payload?.orderId) {
        patchOrderCache(payload.orderId, (order) => ({
          ...order,
          status: payload.status || order.status,
        }))
      }
      if (canManageOrders) {
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      }
      if (canManageProducts || canManageRewards) {
        queryClient.invalidateQueries({ queryKey: ['products'] })
      }
    }

    const handleStaffChange = () => {
      if (isAdmin) {
        refetchStaff()
      }
    }

    socket.on('catalog:changed', handleCatalogChange)
    socket.on('events:changed', handleEventsChange)
    socket.on('rewards:changed', handleRewardsChange)
    socket.on('order:new', handleOrderChange)
    socket.on('order:status', handleOrderChange)
    socket.on('staff:changed', handleStaffChange)

    return () => {
      socket.off('catalog:changed', handleCatalogChange)
      socket.off('events:changed', handleEventsChange)
      socket.off('rewards:changed', handleRewardsChange)
      socket.off('order:new', handleOrderChange)
      socket.off('order:status', handleOrderChange)
      socket.off('staff:changed', handleStaffChange)
      socket.disconnect()
    }
  }, [
    isAuthenticated,
    canManageProducts,
    canManageEvents,
    canManageRewards,
    canManageOrders,
    isAdmin,
    queryClient,
    patchOrderCache,
    refetchProducts,
    refetchCategories,
    refetchEvents,
    refetchRewards,
    refetchStaff,
  ])

  const availableTabs = useMemo(() => {
    const tabs = []
    if (canManageOrders) tabs.push('orders')
    if (canManageProducts) tabs.push('products')
    if (canManageProducts) tabs.push('inventory')
    if (canManageRewards) tabs.push('rewards')
    if (canManageBrand) tabs.push('brand')
    if (canManageBrand) tabs.push('gallery')
    if (canManageEvents) tabs.push('events')
    if (isAdmin) tabs.push('manage')
    return tabs
  }, [canManageOrders, canManageProducts, canManageRewards, canManageBrand, canManageEvents, isAdmin])

  const activeTab = useMemo(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab && availableTabs.includes(requestedTab)) {
      return requestedTab
    }
    return availableTabs[0] || 'orders'
  }, [availableTabs, searchParams])

  useEffect(() => {
    if (!availableTabs.length) return
    const requestedTab = searchParams.get('tab')
    if (requestedTab && !availableTabs.includes(requestedTab)) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('tab')
      setSearchParams(nextParams, { replace: true })
    }
  }, [availableTabs, searchParams, setSearchParams])

  useEffect(() => {
    if (!isMobileNavOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileNavOpen])

  useEffect(() => {
    setInventoryDrafts(
      Object.fromEntries(products.map((product) => [product._id, buildInventoryDraft(product)]))
    )
    setInventoryErrors({})
  }, [products])

  const filteredOrders = useMemo(() => {
    const status = orderFilters.status
    const payment = orderFilters.payment
    const search = orderFilters.search.trim().toLowerCase()
    const day = orderFilters.day
    return orders.filter((order) => {
      const matchesStatus = status === 'All' ? true : order.status === status
      const matchesPayment =
        payment === 'All'
          ? true
          : (order.paymentMethod || 'Cash') === payment
      const matchesSearch = search
        ? String(order._id).toLowerCase().includes(search)
        : true
      const matchesDay = matchesOrderDateFilter(order.createdAt, day)
      return matchesStatus && matchesPayment && matchesSearch && matchesDay
    })
  }, [orders, orderFilters])

  const normalizeSizePrices = (product) => {
    if (product.sizePrices?.length) return product.sizePrices
    if (product.sizeOptions?.length && Number.isFinite(product.price)) {
      return product.sizeOptions.map((size) => ({
        size,
        price: product.price,
      }))
    }
    if (Number.isFinite(product.price)) {
      return [{ size: 'Regular', price: product.price }]
    }
    return []
  }

  if (!isAuthenticated || availableTabs.length === 0) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-espresso">Admin Dashboard</h1>
        <p className="mt-4 text-sm text-cocoa/70">
          You do not have access to this dashboard. Please sign in with a staff
          or admin account.
        </p>
      </section>
    )
  }

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      categoryId: '',
      description: '',
      imageUrl: '',
      sizePrices: [],
      addOns: [],
      isAvailable: true,
      inventoryQuantity: '',
      lowStockThreshold: '5',
    })
    setImageFile(null)
    setImagePreview('')
    setAddOnDraft('')
  }

  const resetBrand = () => {
    setLogoFile(null)
    setHeroFile(null)
    setLogoPreview('')
    setHeroPreview('')
    setClearBrand({
      logo: false,
      hero: false,
      homeDisplay: false,
    })
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      id: '',
      name: '',
      description: '',
    })
  }

  const resetRewardForm = () => {
    setRewardForm({
      id: '',
      productId: '',
      pointsRequired: '',
      isActive: true,
    })
  }

  const resetFileInput = (event) => {
    if (event?.target) {
      event.target.value = ''
    }
  }

  const handleEdit = (product) => {
    setForm({
      id: product._id,
      name: product.name,
      categoryId: product.categoryId,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      sizePrices: normalizeSizePrices(product),
      addOns: product.addOns || [],
      isAvailable: product.isAvailable ?? true,
      inventoryQuantity:
        product.inventoryQuantity === null || product.inventoryQuantity === undefined
          ? ''
          : String(product.inventoryQuantity),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
    })
    setImageFile(null)
    setImagePreview(product.imageUrl || '')
    setAddOnDraft('')
    setActiveTab('products')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.name.trim()) {
        setError('Product name is required.')
        setSaving(false)
        return
      }
      const normalizedSizes = form.sizePrices
        .map((entry) => ({
          size: entry.size,
          price: Number(entry.price),
        }))
        .filter(
          (entry) =>
            entry.size && Number.isFinite(entry.price) && entry.price > 0
        )

      if (normalizedSizes.length === 0) {
        setError('Select at least one size and price.')
        setSaving(false)
        return
      }
      if (!form.categoryId) {
        setError('Select a category.')
        setSaving(false)
        return
      }

      const basePrice = Math.min(...normalizedSizes.map((entry) => entry.price))
      const addOnsList = [
        ...form.addOns,
        addOnDraft ? addOnDraft.trim() : '',
      ]
        .map((item) => item.trim())
        .filter(Boolean)
      const normalizedAddOns = Array.from(new Set(addOnsList))

      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('categoryId', form.categoryId)
      formData.append('description', form.description)
      formData.append('price', String(basePrice))
      formData.append('sizePrices', JSON.stringify(normalizedSizes))
      formData.append('addOns', JSON.stringify(normalizedAddOns))
      formData.append('isAvailable', String(form.isAvailable))
      formData.append('inventoryQuantity', form.inventoryQuantity)
      formData.append('lowStockThreshold', form.lowStockThreshold || '5')
      if (imageFile) {
        formData.append('image', imageFile)
      }
      if (form.id) {
        await api.put(`/admin/products/${form.id}`, formData)
      } else {
        await api.post('/admin/products', formData)
      }
      resetForm()
      refetchProducts()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  const handleBrandSubmit = async (e) => {
    e.preventDefault()
    setBrandSaving(true)
    setBrandError('')
    try {
      const formData = new FormData()
      if (clearBrand.logo) formData.append('clearLogo', 'true')
      if (clearBrand.hero) formData.append('clearHero', 'true')
      if (clearBrand.homeDisplay) formData.append('clearHomeDisplay', 'true')
      if (logoFile) formData.append('logo', logoFile)
      if (heroFile) formData.append('heroImage', heroFile)
      const { data } = await api.put('/admin/settings', formData)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      resetBrand()
      refetchSettings()
    } catch (err) {
      setBrandError(err.response?.data?.message || 'Failed to update brand.')
    } finally {
      setBrandSaving(false)
    }
  }

  const handleDelete = async (productId) => {
    await api.delete(`/admin/products/${productId}`)
    refetchProducts()
  }

  const updateInventoryDraft = (productId, patch) => {
    setInventoryDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        ...patch,
      },
    }))
    setInventoryErrors((prev) => {
      if (!prev[productId]) return prev
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  const resetInventoryDraft = (product) => {
    setInventoryDrafts((prev) => ({
      ...prev,
      [product._id]: buildInventoryDraft(product),
    }))
    setInventoryErrors((prev) => {
      if (!prev[product._id]) return prev
      const next = { ...prev }
      delete next[product._id]
      return next
    })
  }

  const handleInventorySave = async (product) => {
    const draft = inventoryDrafts[product._id] || buildInventoryDraft(product)
    setInventorySavingIds((prev) => ({ ...prev, [product._id]: true }))
    setInventoryErrors((prev) => {
      const next = { ...prev }
      delete next[product._id]
      return next
    })

    try {
      let inventoryQuantity = null
      if (draft.trackInventory) {
        if (draft.inventoryQuantity === '') {
          throw new Error('Enter the stock count or disable inventory tracking.')
        }

        inventoryQuantity = Number(draft.inventoryQuantity)
        if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) {
          throw new Error('Inventory count must be a whole number of 0 or more.')
        }
      }

      const lowStockThreshold =
        draft.lowStockThreshold === '' ? 5 : Number(draft.lowStockThreshold)
      if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        throw new Error('Low-stock warning must be a whole number of 0 or more.')
      }

      await api.put(`/admin/products/${product._id}`, {
        inventoryQuantity,
        lowStockThreshold,
        isAvailable: draft.isAvailable,
      })
      await refetchProducts()
    } catch (err) {
      setInventoryErrors((prev) => ({
        ...prev,
        [product._id]:
          err instanceof Error && !err.response
            ? err.message
            : getApiErrorMessage(err, 'Failed to update inventory.'),
      }))
    } finally {
      setInventorySavingIds((prev) => {
        const next = { ...prev }
        delete next[product._id]
        return next
      })
    }
  }

  const handleCategorySave = async () => {
    setCategorySaving(true)
    setCategoryError('')
    try {
      if (!categoryForm.name.trim()) {
        setCategoryError('Category name is required.')
        setCategorySaving(false)
        return
      }
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
      }
      if (categoryForm.id) {
        await api.put(`/admin/categories/${categoryForm.id}`, payload)
      } else {
        await api.post('/admin/categories', payload)
      }
      resetCategoryForm()
      refetchCategories()
    } catch (err) {
      setCategoryError(getApiErrorMessage(err, 'Failed to save category.'))
    } finally {
      setCategorySaving(false)
    }
  }

  const handleCategoryEdit = (category) => {
    setCategoryForm({
      id: category._id,
      name: category.name || '',
      description: category.description || '',
    })
    setActiveTab('products')
  }

  const handleCategoryDelete = async (categoryId) => {
    setCategoryError('')
    try {
      await api.delete(`/admin/categories/${categoryId}`)
      if (categoryForm.id === categoryId) {
        resetCategoryForm()
      }
      refetchCategories()
    } catch (err) {
      setCategoryError(getApiErrorMessage(err, 'Failed to delete category.'))
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    const previousOrders = queryClient.getQueryData(['admin-orders'])

    setUpdatingOrderIds((prev) => ({ ...prev, [orderId]: true }))
    patchOrderCache(orderId, { status })

    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status })
      const updatedOrder = data?.order

      patchOrderCache(orderId, (order) => ({
        ...order,
        ...(updatedOrder || {}),
        items: order.items,
      }))

      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    } catch (err) {
      queryClient.setQueryData(['admin-orders'], previousOrders)
      throw err
    } finally {
      setUpdatingOrderIds((prev) => {
        const next = { ...prev }
        delete next[orderId]
        return next
      })
    }
  }

  const handleHomeDisplayReplace = async (index, file) => {
    if (!file) return
    setBrandSaving(true)
    setBrandError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await api.put(
        `/admin/settings/home-display/${index}`,
        formData
      )
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      refetchSettings()
    } catch (err) {
      setBrandError(err.response?.data?.message || 'Failed to update image.')
    } finally {
      setBrandSaving(false)
    }
  }

  const handleHomeDisplayDelete = async (index) => {
    setBrandSaving(true)
    setBrandError('')
    try {
      const { data } = await api.delete(`/admin/settings/home-display/${index}`)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      refetchSettings()
    } catch (err) {
      setBrandError(err.response?.data?.message || 'Failed to delete image.')
    } finally {
      setBrandSaving(false)
    }
  }

  const handleHomeDisplayAdd = async (file) => {
    if (!file) return
    if (homeDisplayGallery.length >= 8) {
      setBrandError('Maximum 8 images allowed.')
      return
    }
    await handleHomeDisplayReplace(homeDisplayGallery.length, file)
  }

  const handleGalleryReplace = async (index, file) => {
    if (!file) return
    setGallerySaving(true)
    setGalleryError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await api.put(`/admin/settings/gallery/${index}`, formData)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      refetchSettings()
    } catch (err) {
      setGalleryError(err.response?.data?.message || 'Failed to update image.')
    } finally {
      setGallerySaving(false)
    }
  }

  const handleGalleryDelete = async (index) => {
    setGallerySaving(true)
    setGalleryError('')
    try {
      const { data } = await api.delete(`/admin/settings/gallery/${index}`)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      refetchSettings()
    } catch (err) {
      setGalleryError(err.response?.data?.message || 'Failed to delete image.')
    } finally {
      setGallerySaving(false)
    }
  }

  const handleGalleryAdd = async (file) => {
    if (!file) return
    if (galleryDisplay.length >= 8) {
      setGalleryError('Maximum 8 images allowed.')
      return
    }
    await handleGalleryReplace(galleryDisplay.length, file)
  }

  const handleRewardSubmit = async (e) => {
    e.preventDefault()
    setRewardSaving(true)
    setRewardError('')
    try {
      if (!rewardForm.productId) {
        setRewardError('Select a menu item for this reward.')
        setRewardSaving(false)
        return
      }

      const pointsRequired = Number(rewardForm.pointsRequired)
      if (!Number.isInteger(pointsRequired) || pointsRequired <= 0) {
        setRewardError('Points must be a positive whole number.')
        setRewardSaving(false)
        return
      }

      const payload = {
        productId: rewardForm.productId,
        pointsRequired,
        isActive: rewardForm.isActive,
      }

      if (rewardForm.id) {
        await api.put(`/admin/rewards/${rewardForm.id}`, payload)
      } else {
        await api.post('/admin/rewards', payload)
      }

      resetRewardForm()
      refetchRewards()
    } catch (err) {
      setRewardError(getApiErrorMessage(err, 'Failed to save reward.'))
    } finally {
      setRewardSaving(false)
    }
  }

  const handleRewardEdit = (reward) => {
    setRewardForm({
      id: reward._id,
      productId:
        reward.product?._id ||
        reward.productId?._id ||
        reward.productId ||
        '',
      pointsRequired: String(reward.pointsRequired ?? ''),
      isActive: reward.isActive !== false,
    })
    setRewardError('')
    setActiveTab('rewards')
  }

  const handleRewardDelete = async (rewardId) => {
    setRewardSaving(true)
    setRewardError('')
    try {
      await api.delete(`/admin/rewards/${rewardId}`)
      if (rewardForm.id === rewardId) {
        resetRewardForm()
      }
      refetchRewards()
    } catch (err) {
      setRewardError(getApiErrorMessage(err, 'Failed to delete reward.'))
    } finally {
      setRewardSaving(false)
    }
  }

  const toggleFeaturedProduct = (productId) => {
    setHomeProductsError('')
    setFeaturedProductsSelection((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId)
      }
      if (prev.length >= 6) {
        setHomeProductsError('Select up to 6 popular products.')
        return prev
      }
      return [...prev, productId]
    })
  }

  const saveHomeProducts = async () => {
    setHomeProductsSaving(true)
    setHomeProductsError('')
    try {
      const formData = new FormData()
      formData.append('todaysSpecialProductId', todaysSpecialId)
      formData.append(
        'featuredProductIds',
        JSON.stringify(featuredProductsSelection)
      )
      const { data } = await api.put('/admin/settings', formData)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      refetchSettings()
    } catch (err) {
      setHomeProductsError(
        getApiErrorMessage(err, 'Failed to update home product highlights.')
      )
    } finally {
      setHomeProductsSaving(false)
    }
  }

  const logoDisplay = logoPreview || settings?.logoUrl
  const heroDisplay = heroPreview || settings?.heroImageUrl
  const homeDisplayGallery = settings?.homeDisplayUrls || []
  const galleryDisplay = settings?.galleryUrls || []

  const handleAddOnAdd = () => {
    const value = addOnDraft.trim()
    if (!value) return
    setForm((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(value) ? prev.addOns : [...prev.addOns, value],
    }))
    setAddOnDraft('')
  }

  const handleAddOnRemove = (value) => {
    setForm((prev) => ({
      ...prev,
      addOns: prev.addOns.filter((item) => item !== value),
    }))
  }

  const formatAdminEventDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'TBD'
    return date.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const formatAdminEventRange = (event) => ({
    startsAt: formatAdminEventDate(event.startDateTime),
    endsAt: formatAdminEventDate(event.endDateTime),
  })

  const resetEventForm = () => {
    setEventForm({
      id: '',
      title: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      capacity: '',
      isActive: true,
    })
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    setEventSaving(true)
    setEventError('')
    try {
      if (!eventForm.title.trim()) {
        setEventError('Event title is required.')
        setEventSaving(false)
        return
      }
      if (!eventForm.startDateTime || !eventForm.endDateTime) {
        setEventError('Start and end date/time are required.')
        setEventSaving(false)
        return
      }
      const capacityValue =
        eventForm.capacity === '' ? undefined : Number(eventForm.capacity)
      const payload = {
        title: eventForm.title,
        description: eventForm.description || '',
        startDateTime: eventForm.startDateTime,
        endDateTime: eventForm.endDateTime,
        capacity: Number.isFinite(capacityValue) ? capacityValue : 0,
        isActive: eventForm.isActive,
      }
      if (eventForm.id) {
        await api.put(`/admin/events/${eventForm.id}`, payload)
      } else {
        await api.post('/admin/events', payload)
      }
      resetEventForm()
      refetchEvents()
    } catch (err) {
      setEventError(err.response?.data?.message || 'Failed to save event.')
    } finally {
      setEventSaving(false)
    }
  }

  const handleEventEdit = (event) => {
    setEventForm({
      id: event._id,
      title: event.title || '',
      description: event.description || '',
      startDateTime: event.startDateTime
        ? new Date(event.startDateTime).toISOString().slice(0, 16)
        : '',
      endDateTime: event.endDateTime
        ? new Date(event.endDateTime).toISOString().slice(0, 16)
        : '',
      capacity: event.capacity ?? '',
      isActive: event.isActive ?? true,
    })
    setActiveTab('events')
  }

  const handleEventDelete = async (eventId) => {
    await api.delete(`/admin/events/${eventId}`)
    refetchEvents()
    if (featuredSelection.includes(eventId)) {
      const next = featuredSelection.filter((id) => id !== eventId)
      setFeaturedSelection(next)
      const formData = new FormData()
      formData.append('featuredEventIds', JSON.stringify(next))
      const { data } = await api.put('/admin/settings', formData)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
    }
  }

  const toggleFeatured = (eventId) => {
    setFeaturedError('')
    setFeaturedSelection((prev) => {
      const normalizedPrev = Array.from(new Set(prev))

      if (normalizedPrev.includes(eventId)) {
        return normalizedPrev.filter((id) => id !== eventId)
      }
      if (normalizedPrev.length >= 2) {
        setFeaturedError('Select up to 2 events for the Home page.')
        return normalizedPrev
      }
      return [...normalizedPrev, eventId]
    })
  }

  const saveFeatured = async () => {
    setFeaturedSaving(true)
    setFeaturedError('')
    try {
      const validEventIds = new Set(adminEvents.map((event) => event._id))
      const normalizedFeaturedIds = Array.from(
        new Set(featuredSelection.filter((id) => validEventIds.has(id)))
      ).slice(0, 2)

      const formData = new FormData()
      formData.append('featuredEventIds', JSON.stringify(normalizedFeaturedIds))
      const { data } = await api.put('/admin/settings', formData)
      if (data?.settings) {
        queryClient.setQueryData(['settings'], data.settings)
      }
      setFeaturedSelection(normalizedFeaturedIds)
      refetchSettings()
    } catch (err) {
      setFeaturedError(err.response?.data?.message || 'Failed to save featured events.')
    } finally {
      setFeaturedSaving(false)
    }
  }

  const resetStaffForm = () => {
    setStaffForm({
      id: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'Staff',
      password: '',
      permissions: [],
    })
  }

  const handleStaffSubmit = async (e) => {
    e.preventDefault()
    setStaffSaving(true)
    setStaffError('')
    try {
      if (!staffForm.email.trim()) {
        setStaffError('Email is required.')
        setStaffSaving(false)
        return
      }
      const payload = {
        email: staffForm.email.trim(),
        role: staffForm.role,
        permissions: staffForm.permissions,
      }
      if (staffForm.fullName.trim()) {
        payload.fullName = staffForm.fullName.trim()
      }
      if (staffForm.phone.trim()) {
        payload.phone = staffForm.phone.trim()
      }
      if (!staffForm.id && staffForm.password) {
        payload.password = staffForm.password
      }
      if (staffForm.id) {
        await api.patch(`/admin/staff/${staffForm.id}`, payload)
      } else {
        await api.post('/admin/staff', payload)
      }
      resetStaffForm()
      refetchStaff()
    } catch (err) {
      setStaffError(getApiErrorMessage(err, 'Failed to save staff.'))
    } finally {
      setStaffSaving(false)
    }
  }

  const handleStaffEdit = (member) => {
    setStaffForm({
      id: member.id,
      fullName: member.fullName || '',
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'Staff',
      password: '',
      permissions: member.permissions || [],
    })
    setActiveTab('manage')
  }

  const handleStaffDelete = async (member) => {
    await api.delete(`/admin/staff/${member.id}`)
    refetchStaff()
  }

  const togglePermission = (permission) => {
    setStaffForm((prev) => {
      const has = prev.permissions.includes(permission)
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((item) => item !== permission)
          : [...prev.permissions, permission],
      }
    })
  }

  const dashboardHeroClass =
    'card relative overflow-hidden border border-gold/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)),rgba(16,12,11,0.95)] p-6 shadow-[0_24px_64px_rgba(18,11,9,0.12)]'
  const dashboardPanelClass =
    'card relative overflow-hidden border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)),rgba(17,13,12,0.94)] p-6 shadow-[0_24px_60px_rgba(15,9,8,0.12)]'
  const dashboardItemClass =
    'rounded-[1.35rem] border border-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(19,14,12,0.56)] p-4 transition-colors hover:border-gold/20'
  const dashboardCompactItemClass =
    'rounded-[1.2rem] border border-gold/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(19,14,12,0.56)] p-3 transition-colors hover:border-gold/20'
  const dashboardSidebarClass =
    theme === 'day'
      ? 'card relative overflow-hidden rounded-[2.4rem] border border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] p-4 shadow-[0_6px_16px_rgba(34,71,70,0.025)] transition-all duration-300'
      : 'card relative overflow-hidden rounded-[2.4rem] border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)),rgba(14,11,10,0.94)] p-4 shadow-[0_24px_56px_rgba(13,9,8,0.12)] transition-all duration-300'
  const isDayTheme = theme === 'day'
  const orderSummaryCardClass = cn(
    dashboardCompactItemClass,
    isDayTheme
      ? 'min-h-[7.5rem] border-[#3f7674]/18 bg-[#fbfdfd] px-4 py-3.5 shadow-[0_8px_18px_rgba(34,71,70,0.04)]'
      : 'min-h-[7.5rem] border-gold/18 bg-[rgba(24,18,16,0.92)] px-4 py-3.5 shadow-[0_18px_34px_rgba(12,8,7,0.20)]'
  )
  const orderFiltersCardClass = cn(
    dashboardCompactItemClass,
    isDayTheme
      ? 'border-[#3f7674]/20 bg-[#f7fbfb] shadow-[0_9px_20px_rgba(34,71,70,0.045)]'
      : 'border-gold/20 bg-[rgba(23,17,15,0.96)] shadow-[0_20px_40px_rgba(11,8,7,0.22)]'
  )
  const orderCardClass = cn(
    dashboardItemClass,
    isDayTheme
      ? 'border-[#3f7674]/18 bg-[#fbfdfd] shadow-[0_10px_22px_rgba(34,71,70,0.05)]'
      : 'border-gold/18 bg-[rgba(21,16,14,0.96)] shadow-[0_22px_44px_rgba(10,7,6,0.24)]'
  )
  const orderLineItemClass = isDayTheme
    ? 'rounded-[1.1rem] border border-[#3f7674]/16 bg-[#f3f9f8] px-3 py-3'
    : 'rounded-[1.1rem] border border-gold/16 bg-[rgba(30,23,20,0.92)] px-3 py-3'

  const dashboardUserLabel =
    user?.fullName || user?.username || user?.email || 'Team member'
  const openOrdersCount = orders.filter(
    (order) => !['Completed', 'Cancelled'].includes(order.status)
  ).length
  const receivedOrdersCount = orders.filter((order) => order.status === 'Received').length
  const inProgressOrdersCount = orders.filter(
    (order) => order.status === 'InProgress'
  ).length
  const readyOrdersCount = orders.filter((order) => order.status === 'Ready').length
  const activeEventsCount = adminEvents.filter((event) => event.isActive).length
  const activeRewardsCount = adminRewards.filter(
    (reward) => reward.isActive !== false
  ).length
  const trackedInventoryProductsCount = products.filter(
    (product) => product.inventoryQuantity !== null && product.inventoryQuantity !== undefined
  ).length
  const lowStockProductsCount = products.filter((product) => isProductLowStock(product)).length
  const outOfStockProductsCount = products.filter((product) =>
    isProductOutOfStock(product)
  ).length
  const inventoryProducts = [...products].sort((a, b) => {
    const score = (product) => {
      if (isProductOutOfStock(product)) return 0
      if (isProductLowStock(product)) return 1
      if (product.inventoryQuantity !== null && product.inventoryQuantity !== undefined)
        return 2
      return 3
    }

    const scoreDifference = score(a) - score(b)
    if (scoreDifference !== 0) return scoreDifference
    return a.name.localeCompare(b.name)
  })
  const inventoryCategoryOptions = [
    { label: 'All Categories', value: 'All Categories' },
    ...categories.map((category) => ({
      label: category.name,
      value: category._id,
    })),
  ]
  const filteredInventoryProducts = (() => {
    const search = inventoryFilters.search.trim().toLowerCase()

    return inventoryProducts.filter((product) => {
      const matchesSearch = search
        ? [product.name, categoryMap.get(product.categoryId) || '']
            .join(' ')
            .toLowerCase()
            .includes(search)
        : true
      const matchesStatus = matchesInventoryStatusFilter(product, inventoryFilters.status)
      const matchesCategory =
        inventoryFilters.categoryId === 'All Categories'
          ? true
          : product.categoryId === inventoryFilters.categoryId

      return matchesSearch && matchesStatus && matchesCategory
    })
  })()
  const isInventoryFilterDirty =
    inventoryFilters.search.trim() !== '' ||
    inventoryFilters.status !== 'All Items' ||
    inventoryFilters.categoryId !== 'All Categories'
  const dashboardStats = [
    canManageOrders
      ? {
          key: 'orders',
          label: 'Open Orders',
          value: openOrdersCount,
          note: `${orders.length} total in queue`,
        }
      : null,
    canManageProducts
      ? {
          key: 'products',
          label: 'Menu Items',
          value: products.length,
          note: `${categories.length} categories live`,
        }
      : null,
    canManageProducts
      ? {
          key: 'inventory',
          label: 'Tracked Inventory',
          value: trackedInventoryProductsCount,
          note: `${lowStockProductsCount} low stock alerts`,
        }
      : null,
    canManageRewards
      ? {
          key: 'rewards',
          label: 'Active Rewards',
          value: activeRewardsCount,
          note: `${adminRewards.length} configured rewards`,
        }
      : null,
    canManageEvents
      ? {
          key: 'events',
          label: 'Live Events',
          value: activeEventsCount,
          note: `${adminEvents.length} events on the calendar`,
        }
      : null,
    isAdmin
      ? {
          key: 'team',
          label: 'Team Access',
          value: staffList.length,
          note: 'staff accounts managed here',
        }
      : null,
  ].filter(Boolean)

  const activeDashboardStat = (() => {
    const statKey =
      activeTab === 'manage'
        ? 'team'
        : ['orders', 'products', 'inventory', 'rewards', 'events'].includes(activeTab)
          ? activeTab
          : null

    if (!statKey) return null
    return dashboardStats.find((stat) => stat.key === statKey) || null
  })()

  const dashboardTabs = [
    canManageOrders
      ? {
          key: 'orders',
          label: 'Orders',
          caption: 'Queue and status flow',
          count: orders.length,
          icon: 'orders',
        }
      : null,
    canManageProducts
      ? {
          key: 'products',
          label: 'Products',
          caption: 'Menu and categories',
          count: products.length,
          icon: 'products',
        }
      : null,
    canManageProducts
      ? {
          key: 'inventory',
          label: 'Inventory',
          caption: 'Stock and availability',
          count: trackedInventoryProductsCount,
          icon: 'inventory',
        }
      : null,
    canManageRewards
      ? {
          key: 'rewards',
          label: 'Rewards',
          caption: 'Points and redemption setup',
          count: adminRewards.length,
          icon: 'rewards',
        }
      : null,
    canManageBrand
      ? {
          key: 'brand',
          label: 'Home Media',
          caption: 'Branding and homepage assets',
          count: homeDisplayGallery.length,
          icon: 'gallery',
        }
      : null,
    canManageBrand
      ? {
          key: 'gallery',
          label: 'Gallery',
          caption: 'Gallery page visuals',
          count: galleryDisplay.length,
          icon: 'brand',
        }
      : null,
    canManageEvents
      ? {
          key: 'events',
          label: 'Events',
          caption: 'Registrations and highlights',
          count: adminEvents.length,
          icon: 'events',
        }
      : null,
    isAdmin
      ? {
          key: 'manage',
          label: 'Manage',
          caption: 'Staff roles and permissions',
          count: staffList.length,
          icon: 'manage',
        }
      : null,
  ].filter(Boolean)

  const activeTabMeta =
    dashboardTabs.find((tab) => tab.key === activeTab) || dashboardTabs[0] || null
  const setActiveTab = (nextTab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab === (availableTabs[0] || 'orders')) {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', nextTab)
    }
    setSearchParams(nextParams, { replace: true })
  }
  const handleDashboardTabChange = (nextTab) => {
    setActiveTab(nextTab)
    setIsMobileNavOpen(false)
  }
  const dashboardLayoutClass = cn(
    'mt-6 grid gap-6 2xl:gap-8',
    isNavCompact
      ? 'xl:grid-cols-[96px_minmax(0,1fr)]'
      : 'xl:grid-cols-[290px_minmax(0,1fr)]'
  )
  const dashboardAsideClass = cn(
    'transition-all duration-300 xl:sticky xl:top-24 xl:self-start',
    isNavCompact ? 'xl:-ml-3' : ''
  )
  const dashboardSidebarFrameClass = cn(
    dashboardSidebarClass,
    'xl:h-[calc(100vh-7rem)]'
  )

  return (
    <section className="section-shell !max-w-[96rem] 2xl:!max-w-[112rem]">
      <div className={dashboardHeroClass}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="highlight"
                className="w-fit px-3 py-1 uppercase tracking-[0.22em]"
              >
                Admin Workspace
              </Badge>
              <Badge>{isAdmin ? 'Administrator' : 'Staff'}</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-espresso sm:text-[2.35rem]">
                Admin Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cocoa/70">
                A cleaner control surface for orders, content, rewards, events,
                and team access, with the same functionality and better structure.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-cocoa/65 xl:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="border border-gold/15 bg-obsidian/50 xl:hidden"
              onClick={() => setIsMobileNavOpen(true)}
            >
              Navigation
            </Button>
            <span className="rounded-full border border-gold/15 bg-obsidian/55 px-3 py-1.5">
              Signed in as {dashboardUserLabel}
            </span>
            <span className="rounded-full border border-gold/15 bg-obsidian/55 px-3 py-1.5">
              Active workspace: {activeTabMeta?.label || 'Dashboard'}
            </span>
          </div>
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-obsidian/65 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 w-[84vw] max-w-[21rem] p-3">
            <div className={cn(dashboardSidebarClass, 'h-full rounded-[2rem] p-4')}>
              <div className="flex h-full flex-col">
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 border-b pb-4',
                    isDayTheme ? 'border-[#3f7674]/12' : 'border-gold/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] border',
                        isDayTheme
                          ? 'border-[#3f7674]/14 bg-[#e7f2f1]'
                          : 'border-gold/18 bg-gold/12'
                      )}
                    >
                      <DashboardUtilityIcon icon="workspace" isDayTheme={isDayTheme} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
                        Cortina.D Admin
                      </p>
                      <p className="mt-1 text-xs leading-5 text-cocoa/62">
                        Workspace navigation
                      </p>
                    </div>
                  </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                      isDayTheme
                        ? 'border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] text-espresso hover:border-[#3f7674]/24 hover:bg-[#eaf3f2]'
                        : 'border-gold/15 bg-obsidian/60 text-espresso hover:border-gold/30 hover:bg-obsidian/75'
                    )}
                    aria-label="Close navigation"
                  >
                    X
                  </button>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <DashboardSidebarNavItems
                    dashboardTabs={dashboardTabs}
                    activeTab={activeTab}
                    onTabSelect={handleDashboardTabChange}
                    isAdmin={isAdmin}
                    onActivityNavigate={() => setIsMobileNavOpen(false)}
                    isDayTheme={isDayTheme}
                  />
                </div>
              </div>
            </div>
            </div>
        </div>
      )}

      <div className={dashboardLayoutClass}>
        <aside className={cn(dashboardAsideClass, 'hidden xl:block')}>
          <div className={dashboardSidebarFrameClass}>
            <div className="flex h-full flex-col pt-12">
              <button
                type="button"
                onClick={() => setIsNavCompact((prev) => !prev)}
                className={cn(
                  'absolute top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  isDayTheme
                    ? 'border-[#3f7674]/14 bg-[rgba(248,252,252,0.96)] text-espresso hover:border-[#3f7674]/24 hover:bg-[#eaf3f2]'
                    : 'border-gold/15 bg-obsidian/60 text-espresso hover:border-gold/30 hover:bg-obsidian/75',
                  isNavCompact ? 'left-1/2 -translate-x-1/2' : 'right-3'
                )}
                aria-label={isNavCompact ? 'Expand navigation' : 'Collapse navigation'}
                title={isNavCompact ? 'Expand navigation' : 'Collapse navigation'}
              >
                {isNavCompact ? '>' : '<'}
              </button>

              <div
                className={cn(
                  'flex items-center gap-3 border-b pb-4',
                  isDayTheme ? 'border-[#3f7674]/12' : 'border-gold/10',
                  isNavCompact ? 'hidden pr-0 xl:hidden' : 'pr-12'
                )}
              >
                <div
                  className={cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] border',
                    isDayTheme
                      ? 'border-[#3f7674]/14 bg-[#e7f2f1]'
                      : 'border-gold/18 bg-gold/12'
                  )}
                >
                  <DashboardUtilityIcon icon="workspace" isDayTheme={isDayTheme} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
                    Cortina.D Admin
                  </p>
                  <p className="mt-1 text-xs leading-5 text-cocoa/62">
                    Workspace navigation
                  </p>
                </div>
              </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <DashboardSidebarNavItems
                    dashboardTabs={dashboardTabs}
                    activeTab={activeTab}
                    onTabSelect={handleDashboardTabChange}
                    isCompact={isNavCompact}
                    isAdmin={isAdmin}
                    isDayTheme={isDayTheme}
                  />
                </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
      <div
        className={cn(
          'grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-stretch',
          !activeDashboardStat && 'xl:grid-cols-1'
        )}
      >
        <div className={dashboardPanelClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
                Current Workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-espresso">
                {activeTabMeta?.label || 'Dashboard'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-cocoa/62">
                {activeTabMeta?.caption || 'Switch between tabs to manage different areas.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{activeTabMeta?.count ?? 0} items</Badge>
              <span className="rounded-full border border-gold/15 bg-obsidian/55 px-3 py-1.5 text-xs text-cocoa/65">
                Access: {isAdmin ? 'Administrator' : 'Staff'}
              </span>
            </div>
          </div>
        </div>

        {activeDashboardStat && (
          <div className="max-w-[14rem] xl:h-full xl:justify-self-end">
            <DashboardStatCard
              label={activeDashboardStat.label}
              value={activeDashboardStat.value}
              note={activeDashboardStat.note}
            />
          </div>
        )}
      </div>

      {activeTab === 'orders' && (
        <div className={dashboardPanelClass}>
          <DashboardSectionHeading
            eyebrow="Order Operations"
            title="Live Orders"
            description={`${filteredOrders.length} of ${orders.length} orders shown in the current queue.`}
          />
          <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)]">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className={orderSummaryCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cocoa/55">
                  Received
                </p>
                <p className="mt-3 text-[1.9rem] font-semibold text-espresso">
                  {receivedOrdersCount}
                </p>
              </div>
              <div className={orderSummaryCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cocoa/55">
                  In Progress
                </p>
                <p className="mt-3 text-[1.9rem] font-semibold text-espresso">
                  {inProgressOrdersCount}
                </p>
              </div>
              <div className={orderSummaryCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cocoa/55">
                  Ready
                </p>
                <p className="mt-3 text-[1.9rem] font-semibold text-espresso">
                  {readyOrdersCount}
                </p>
              </div>
            </div>

            <div className={cn(orderFiltersCardClass, 'flex flex-col gap-4')}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cocoa/55">
                  Filters
                </p>
                <p className="mt-1 text-xs text-cocoa/60">
                  Narrow the queue by status, payment method, or order number.
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SelectMenu
                  value={orderFilters.status}
                  onChange={(value) =>
                    setOrderFilters((prev) => ({ ...prev, status: value }))
                  }
                  className="w-full"
                  menuClassName="w-full"
                  options={['All', ...statusOptions].map((status) => ({
                    label: status,
                    value: status,
                  }))}
                />
                <SelectMenu
                  value={orderFilters.payment}
                  onChange={(value) =>
                    setOrderFilters((prev) => ({ ...prev, payment: value }))
                  }
                  className="w-full"
                  menuClassName="w-full"
                  options={['All', 'Cash', 'Card'].map((method) => ({
                    label: method,
                    value: method,
                  }))}
                />
                <SelectMenu
                  value={orderFilters.day}
                  onChange={(value) =>
                    setOrderFilters((prev) => ({ ...prev, day: value }))
                  }
                  className="w-full"
                  menuClassName="w-full"
                  options={orderDateFilterOptions.map((option) => ({
                    label: option,
                    value: option,
                  }))}
                />
                <Input
                  type="text"
                  placeholder="Search order ID"
                  value={orderFilters.search}
                  onChange={(e) =>
                    setOrderFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className={orderCardClass}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-medium text-cocoa/68">Order #{order._id}</p>
                    <p className="mt-1 text-sm text-cocoa/76">
                      Payment: {order.paymentMethod || 'Cash'}
                    </p>
                    <p className="mt-1 text-xs text-cocoa/66">
                      Placed: {formatOrderDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[220px]">
                    <SelectMenu
                      value={order.status}
                      onChange={(value) => updateOrderStatus(order._id, value)}
                      disabled={Boolean(updatingOrderIds[order._id])}
                      className="w-full"
                      menuClassName="w-full"
                      options={statusOptions.map((status) => ({
                        label: status,
                        value: status,
                      }))}
                    />
                    <Badge className="justify-center">{order.totalAmount?.toFixed(2)} JD</Badge>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(order.items || []).map((item) => (
                    <div
                      key={item._id}
                      className={orderLineItemClass}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.productId?.imageUrl ? (
                            <img
                              src={item.productId.imageUrl}
                              alt={item.productId?.name || 'Item'}
                              className="h-12 w-12 rounded-xl2 object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-obsidian via-caramel to-gold" />
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-espresso">
                                {item.productId?.name || 'Item'}
                              </p>
                              {item.isRewardRedemption && <Badge>Redeemed</Badge>}
                            </div>
                            <p className="text-xs text-cocoa/72">
                              {item.quantity}x {item.selectedSize || 'Regular'} -{' '}
                              {item.isRewardRedemption
                                ? 'Free reward item'
                                : `${(item.unitPrice || 0).toFixed(2)} JD`}
                            </p>
                            {item.selectedAddOns?.length > 0 && (
                              <p className="text-xs text-cocoa/72">
                                Add-ons: {item.selectedAddOns.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-cocoa/72">
                          {item.isRewardRedemption
                            ? 'Free'
                            : `${(item.lineTotal || 0).toFixed(2)} JD`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {order.specialInstructions && (
                  <div
                    className={cn(
                      'mt-3 rounded-[1rem] border px-3 py-2.5 text-xs',
                      isDayTheme
                        ? 'border-[#3f7674]/14 bg-[#f3f9f8] text-cocoa/78'
                        : 'border-gold/14 bg-[rgba(27,21,18,0.88)] text-cocoa/74'
                    )}
                  >
                    Notes: {order.specialInstructions}
                  </div>
                )}
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <p className="text-sm text-cocoa/60">No orders found.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <form noValidate onSubmit={handleSubmit} className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Catalog Editor"
              title={form.id ? 'Edit Product' : 'Add Product'}
              description="Maintain menu items, pricing tiers, availability, and imagery from one workspace."
            />
            <div className="mt-5 space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="text"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <SelectMenu
                  value={form.categoryId}
                  onChange={(value) => setForm({ ...form, categoryId: value })}
                  placeholder="Select category"
                  options={categories.map((category) => ({
                    label: category.name,
                    value: category._id,
                  }))}
                />
              </div>

              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows="3"
              />

              <div className="space-y-3">
                <p className="text-xs font-semibold text-cocoa/70">Sizes & Pricing</p>
                <div className="grid gap-3">
                  {sizeOptions.map((size) => {
                    const entry = form.sizePrices.find((item) => item.size === size)
                    return (
                      <div
                        key={size}
                        className="flex flex-wrap items-center gap-3 rounded-xl2 border border-gold/20 bg-obsidian/60 px-3 py-2"
                      >
                        <label className="flex items-center gap-2 text-xs text-cocoa/70">
                          <input
                            type="checkbox"
                            className="accent-gold"
                            checked={!!entry}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm((prev) => ({
                                  ...prev,
                                  sizePrices: [
                                    ...prev.sizePrices,
                                    { size, price: '' },
                                  ],
                                }))
                              } else {
                                setForm((prev) => ({
                                  ...prev,
                                  sizePrices: prev.sizePrices.filter(
                                    (item) => item.size !== size
                                  ),
                                }))
                              }
                            }}
                          />
                          {size}
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price (JD)"
                          value={entry?.price ?? ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setForm((prev) => ({
                              ...prev,
                              sizePrices: prev.sizePrices.map((item) =>
                                item.size === size ? { ...item, price: value } : item
                              ),
                            }))
                          }}
                          disabled={!entry}
                          className="w-40"
                        />
                      </div>
                    )
                  })}
                </div>
                <label className="flex items-center gap-2 text-xs text-cocoa/70">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                    className="accent-gold"
                  />
                  Available
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-cocoa/70">Inventory Count</p>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Leave empty for open inventory"
                      value={form.inventoryQuantity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inventoryQuantity: e.target.value,
                        }))
                      }
                    />
                    <p className="text-[11px] text-cocoa/60">
                      When left empty, this product stays orderable without stock tracking.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-cocoa/70">
                      Low Stock Warning
                    </p>
                    <Input
                      type="number"
                      min="0"
                      placeholder="5"
                      value={form.lowStockThreshold}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lowStockThreshold: e.target.value,
                        }))
                      }
                    />
                    <p className="text-[11px] text-cocoa/60">
                      Show a low-stock state once the count reaches this number.
                    </p>
                  </div>
                </div>
              </div>

              <div className="upload-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-espresso">Product Image</p>
                    <p className="text-xs text-cocoa/60">PNG/JPG up to 2MB</p>
                  </div>
                  <label className="upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setImageFile(file)
                        setImagePreview(file ? URL.createObjectURL(file) : form.imageUrl)
                        resetFileInput(e)
                      }}
                    />
                    Upload Image
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
                  {imagePreview || form.imageUrl ? (
                    <img
                      src={imagePreview || form.imageUrl}
                      alt="Preview"
                      className="h-24 w-24 rounded-xl2 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream text-xs text-cream">
                      No Image
                    </div>
                  )}
                  <div className="text-xs text-cocoa/60">
                    {imageFile ? imageFile.name : 'No file selected yet.'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-cocoa/70">Add-ons</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="text"
                    placeholder="Add-on name"
                    value={addOnDraft}
                    onChange={(e) => setAddOnDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOnAdd()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddOnAdd}
                    className="h-10 w-10 rounded-full p-0 text-lg"
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.addOns.map((addOn) => (
                    <span key={addOn} className="chip">
                      {addOn}
                      <button
                        type="button"
                        className="ml-2 text-xs text-cocoa/60 hover:text-cream"
                        onClick={() => handleAddOnRemove(addOn)}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  {form.addOns.length === 0 && (
                    <span className="text-xs text-cocoa/60">
                      No add-ons added.
                    </span>
                  )}
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  className="flex-1 justify-center"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : form.id ? 'Update' : 'Create'}
                </Button>
                {form.id && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>

          <div className="space-y-6">
            <div className={dashboardPanelClass}>
              <DashboardSectionHeading
                eyebrow="Catalog Structure"
                title="Categories"
                description="Add, edit, or remove the groups that organize your menu."
              />
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="text"
                    placeholder="Category name"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCategorySave()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCategorySave}
                    disabled={categorySaving}
                    className={cn(
                      categoryForm.id
                        ? 'h-10 rounded-full px-4'
                        : 'h-10 w-10 rounded-full p-0 text-lg'
                    )}
                  >
                    {categoryForm.id ? 'Save' : '+'}
                  </Button>
                  {categoryForm.id && (
                    <Button type="button" variant="outline" onClick={resetCategoryForm}>
                      Cancel
                    </Button>
                  )}
                </div>
                <Input
                  type="text"
                  placeholder="Category description (optional)"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
                <div className="grid gap-3">
                  {categories.map((category) => (
                    <div
                      key={category._id}
                      className={cn(
                        dashboardCompactItemClass,
                        'flex flex-wrap items-center justify-between gap-3'
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-espresso">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-cocoa/60">{category.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCategoryEdit(category)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleCategoryDelete(category._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {categoryError && <p className="form-error">{categoryError}</p>}
              </div>
            </div>

            <div className={dashboardPanelClass}>
              <DashboardSectionHeading
                eyebrow="Menu Library"
                title="Products"
                description={`${products.length} items currently available for editing.`}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>
                  {trackedInventoryProductsCount} tracked
                </Badge>
                <Badge>
                  {lowStockProductsCount} low stock
                </Badge>
                <Badge>
                  {outOfStockProductsCount} out of stock
                </Badge>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className={cn(
                      dashboardCompactItemClass,
                      'flex flex-wrap items-center justify-between gap-4'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-12 w-12 rounded-xl2 object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                      )}
                      <div>
                        <p className="font-semibold text-espresso">{product.name}</p>
                        <p className="text-xs text-cocoa/60">
                          {categoryMap.get(product.categoryId) || 'Category'} -{' '}
                          {product.sizePrices?.length
                            ? `From ${Math.min(
                                ...product.sizePrices.map((entry) => entry.price)
                              ).toFixed(2)} JD`
                            : `${product.price} JD`}
                        </p>
                        <p
                          className={cn(
                            'mt-1 text-[11px] font-medium',
                            isProductOutOfStock(product)
                              ? 'text-rose-600'
                              : isProductLowStock(product)
                              ? 'text-amber-600'
                              : 'text-cocoa/65'
                          )}
                        >
                          {getInventoryStatusLabel(product)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => handleEdit(product)}>
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => handleDelete(product._id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-sm text-cocoa/60">No products yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Inventory Filters"
              title="Filter Inventory"
              description="Narrow the list by name, category, or stock state before editing product stock."
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setInventoryFilters({
                      search: '',
                      status: 'All Items',
                      categoryId: 'All Categories',
                    })
                  }
                  disabled={!isInventoryFilterDirty}
                >
                  Clear
                </Button>
              }
            />
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.9fr)_minmax(14rem,0.9fr)]">
              <Input
                type="text"
                placeholder="Search product or category"
                value={inventoryFilters.search}
                onChange={(e) =>
                  setInventoryFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
              />
              <SelectMenu
                value={inventoryFilters.status}
                onChange={(value) =>
                  setInventoryFilters((prev) => ({
                    ...prev,
                    status: value,
                  }))
                }
                placeholder="Filter by stock state"
                options={inventoryStatusFilterOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
              />
              <SelectMenu
                value={inventoryFilters.categoryId}
                onChange={(value) =>
                  setInventoryFilters((prev) => ({
                    ...prev,
                    categoryId: value,
                  }))
                }
                placeholder="Filter by category"
                options={inventoryCategoryOptions}
              />
            </div>
            <div
              className={cn(
                dashboardCompactItemClass,
                'mt-4 space-y-1.5',
                isDayTheme
                  ? 'border-[#3f7674]/12 bg-[#f6fbfb]'
                  : 'border-gold/12 bg-[rgba(24,18,16,0.86)]'
              )}
            >
              <p className="text-xs font-semibold text-espresso">
                Showing {filteredInventoryProducts.length} of {inventoryProducts.length}
              </p>
              <p className="text-[11px] leading-5 text-cocoa/60">
                Orders reduce tracked stock immediately. Cancelling an order or
                removing an item from a received order restores the reserved quantity.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <div className={dashboardPanelClass}>
              <DashboardSectionHeading
                eyebrow="Stock Overview"
                title="Inventory CMS"
                description="A dedicated stock workspace for product counts, low-stock warnings, and order availability."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <DashboardStatCard
                  label="Tracked Items"
                  value={trackedInventoryProductsCount}
                  note={`${products.length} total products`}
                />
                <DashboardStatCard
                  label="Low Stock"
                  value={lowStockProductsCount}
                  note="Needs attention soon"
                />
                <DashboardStatCard
                  label="Out Of Stock"
                  value={outOfStockProductsCount}
                  note="Currently blocked from orders"
                />
              </div>
            </div>

          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Stock Library"
              title="Inventory List"
              description={`${filteredInventoryProducts.length} products match the current filters.`}
              action={<Badge>{trackedInventoryProductsCount} tracked</Badge>}
            />
            <div className="mt-4 space-y-3 text-sm">
              {filteredInventoryProducts.map((product) => {
                const draft = inventoryDrafts[product._id] || buildInventoryDraft(product)
                const inventoryError = inventoryErrors[product._id]
                const isSavingInventory = Boolean(inventorySavingIds[product._id])
                const hasChanges = hasInventoryDraftChanges(product, draft)
                const statusClass = isProductOutOfStock(product)
                  ? 'border border-rose-200/80 bg-rose-50 text-rose-700'
                  : isProductLowStock(product)
                  ? 'border border-amber-200/80 bg-amber-50 text-amber-700'
                  : isDayTheme
                  ? 'border border-[#3f7674]/15 bg-[#edf6f5] text-[#315f5e]'
                  : 'border border-gold/20 bg-obsidian/55 text-espresso'

                return (
                  <div
                    key={product._id}
                    className={cn(
                      dashboardItemClass,
                      'overflow-hidden p-0',
                      isDayTheme ? 'border-[#3f7674]/16 bg-[#fcfefe]' : ''
                    )}
                  >
                    <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-14 w-14 rounded-xl2 object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-espresso">{product.name}</p>
                          <p className="mt-1 text-xs text-cocoa/60">
                            {categoryMap.get(product.categoryId) || 'Category'} -{' '}
                            {getInventoryStatusLabel(product)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge>
                              {draft.trackInventory
                                ? `${product.inventoryQuantity ?? 0} in stock`
                                : 'Open inventory'}
                            </Badge>
                            <Badge>
                              Low stock at {product.lowStockThreshold ?? 5}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', statusClass)}>
                        {product.isAvailable === false
                          ? 'Unavailable'
                          : isProductOutOfStock(product)
                          ? 'Out of stock'
                          : isProductLowStock(product)
                          ? 'Low stock'
                          : draft.trackInventory
                          ? 'Tracked'
                          : 'Open inventory'}
                      </span>
                    </div>

                    <div
                      className={cn(
                        'grid gap-4 border-t px-4 py-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]',
                        isDayTheme ? 'border-[#3f7674]/10' : 'border-gold/10'
                      )}
                    >
                      <div className="grid gap-3">
                        <label
                          className={cn(
                            dashboardCompactItemClass,
                            'flex items-center gap-3 px-3 py-3 text-xs text-cocoa/75',
                            isDayTheme ? 'border-[#3f7674]/12 bg-[#f5faf9]' : ''
                          )}
                        >
                          <input
                            type="checkbox"
                            className="accent-gold"
                            checked={draft.trackInventory}
                            onChange={(e) =>
                              updateInventoryDraft(product._id, {
                                trackInventory: e.target.checked,
                              })
                            }
                          />
                          <span>Track inventory</span>
                        </label>
                        <label
                          className={cn(
                            dashboardCompactItemClass,
                            'flex items-center gap-3 px-3 py-3 text-xs text-cocoa/75',
                            isDayTheme ? 'border-[#3f7674]/12 bg-[#f5faf9]' : ''
                          )}
                        >
                          <input
                            type="checkbox"
                            className="accent-gold"
                            checked={draft.isAvailable}
                            onChange={(e) =>
                              updateInventoryDraft(product._id, {
                                isAvailable: e.target.checked,
                              })
                            }
                          />
                          <span>Available to order</span>
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cocoa/55">
                            Stock Count
                          </p>
                          <Input
                            type="number"
                            min="0"
                            placeholder={draft.trackInventory ? 'Stock count' : 'Open inventory'}
                            value={draft.inventoryQuantity}
                            disabled={!draft.trackInventory}
                            onChange={(e) =>
                              updateInventoryDraft(product._id, {
                                inventoryQuantity: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cocoa/55">
                            Low Stock Warning
                          </p>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Low stock warning"
                            value={draft.lowStockThreshold}
                            onChange={(e) =>
                              updateInventoryDraft(product._id, {
                                lowStockThreshold: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {inventoryError && <p className="px-4 pt-3 form-error">{inventoryError}</p>}

                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                      <Button
                        type="button"
                        onClick={() => handleInventorySave(product)}
                        disabled={isSavingInventory || !hasChanges}
                      >
                        {isSavingInventory ? 'Saving...' : 'Save Inventory'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => resetInventoryDraft(product)}
                        disabled={isSavingInventory || !hasChanges}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleEdit(product)}
                        disabled={isSavingInventory}
                      >
                        Open Product
                      </Button>
                    </div>
                  </div>
                )
              })}

              {filteredInventoryProducts.length === 0 && (
                <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/45 p-4 text-sm text-cocoa/60">
                  No products match the current inventory filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'rewards' && (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form noValidate onSubmit={handleRewardSubmit} className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Loyalty Setup"
              title={rewardForm.id ? 'Edit Reward' : 'Add Reward'}
              description="Choose a menu item, assign the points cost, and control whether it is redeemable."
            />

            <div className="mt-5 space-y-4 text-sm">
              {products.length === 0 && (
                <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/45 p-4 text-sm text-cocoa/60">
                  No menu items found yet. Add products first, then create rewards from them.
                </div>
              )}
              <div className="space-y-2">
                <SelectMenu
                  value={rewardForm.productId}
                  label="Menu Item"
                  placeholder="Select an item from the menu"
                  className="w-full"
                  menuClassName="w-full"
                  disabled={products.length === 0}
                  options={rewardProductOptions}
                  renderValue={(option) => (
                    <span className="flex items-center gap-3">
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt={option.label}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-espresso via-caramel to-cream" />
                      )}
                      <span>{option.label}</span>
                    </span>
                  )}
                  renderOption={(option) => (
                    <span className="flex items-center gap-3">
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt={option.label}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-espresso via-caramel to-cream" />
                      )}
                      <span>{option.label}</span>
                    </span>
                  )}
                  onChange={(value) =>
                    setRewardForm((prev) => ({
                      ...prev,
                      productId: value,
                    }))
                  }
                />
              </div>

              {selectedRewardProduct && (
                <div className={dashboardItemClass}>
                  <div className="flex items-center gap-3">
                    {selectedRewardProduct.imageUrl ? (
                      <img
                        src={selectedRewardProduct.imageUrl}
                        alt={selectedRewardProduct.name}
                        className="h-16 w-16 rounded-xl2 object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-espresso">
                        {selectedRewardProduct.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-cocoa/60">
                        {selectedRewardProduct.description || 'No description for this item.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Points required"
                value={rewardForm.pointsRequired}
                onChange={(e) =>
                  setRewardForm((prev) => ({
                    ...prev,
                    pointsRequired: e.target.value,
                  }))
                }
              />
              <label className="flex items-center gap-2 text-xs text-cocoa/70">
                <input
                  type="checkbox"
                  checked={rewardForm.isActive}
                  onChange={(e) =>
                    setRewardForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="accent-gold"
                />
                Reward is active
              </label>

              {rewardError && <p className="form-error">{rewardError}</p>}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="flex-1 justify-center" disabled={rewardSaving}>
                  {rewardSaving
                    ? 'Saving...'
                    : rewardForm.id
                      ? 'Update Reward'
                      : 'Create Reward'}
                </Button>
                {rewardForm.id && (
                  <Button type="button" variant="secondary" onClick={resetRewardForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>

          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Reward Library"
              title="Rewards List"
              description={`${adminRewards.length} reward${adminRewards.length === 1 ? '' : 's'} configured for customers.`}
            />

            <div className="mt-4 space-y-3 text-sm">
              {adminRewards.map((reward) => (
                <div
                  key={reward._id}
                  className={dashboardItemClass}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {reward.imageUrl ? (
                        <img
                          src={reward.imageUrl}
                          alt={reward.title}
                          className="h-14 w-14 rounded-xl2 object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                      )}
                      <div className="min-w-0">
                        {reward.product?.name && (
                          <p className="text-[11px] uppercase tracking-[0.22em] text-cocoa/50">
                            Menu Item Reward
                          </p>
                        )}
                        <p className="font-semibold text-espresso">{reward.title}</p>
                        <p className="mt-1 text-xs text-cocoa/60">
                          {reward.pointsRequired} pts
                        </p>
                      </div>
                    </div>
                    <Badge>{reward.isActive === false ? 'Inactive' : 'Active'}</Badge>
                  </div>
                  {reward.description && (
                    <p className="mt-3 text-sm text-cocoa/70">{reward.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRewardEdit(reward)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRewardDelete(reward._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {adminRewards.length === 0 && (
                <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/45 p-4 text-sm text-cocoa/60">
                  No rewards yet. Add the first reward from the form.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'brand' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <form noValidate onSubmit={handleBrandSubmit} className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Homepage Assets"
              title="Brand & Home Media"
              description="Update the logo, hero background, and homepage visuals without leaving the dashboard."
            />

            <div className="mt-5 space-y-4 text-sm">
              <div className="upload-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-espresso">Logo</p>
                    <p className="text-xs text-cocoa/60">
                      Square PNG/JPG up to 2MB.
                    </p>
                  </div>
                  <label className="upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setLogoFile(file)
                        setLogoPreview(file ? URL.createObjectURL(file) : '')
                        setClearBrand((prev) => ({ ...prev, logo: false }))
                        resetFileInput(e)
                      }}
                    />
                    Upload Logo
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {logoDisplay ? (
                    <img
                      src={logoDisplay}
                      alt="Logo preview"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-obsidian/60 text-xs text-cocoa/60">
                      No logo
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs text-cocoa/70">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={clearBrand.logo}
                      onChange={(e) =>
                        setClearBrand((prev) => ({ ...prev, logo: e.target.checked }))
                      }
                    />
                    Clear logo
                  </label>
                </div>
              </div>

              <div className="upload-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-espresso">Hero Image</p>
                    <p className="text-xs text-cocoa/60">
                      Wide photo for the Home background, up to 2MB.
                    </p>
                  </div>
                  <label className="upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setHeroFile(file)
                        setHeroPreview(file ? URL.createObjectURL(file) : '')
                        setClearBrand((prev) => ({ ...prev, hero: false }))
                        resetFileInput(e)
                      }}
                    />
                    Upload Hero
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {heroDisplay ? (
                    <img
                      src={heroDisplay}
                      alt="Hero preview"
                      className="h-20 w-full max-w-xs rounded-xl2 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-full max-w-xs items-center justify-center rounded-xl2 bg-obsidian/60 text-xs text-cocoa/60">
                      No hero image
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs text-cocoa/70">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={clearBrand.hero}
                      onChange={(e) =>
                        setClearBrand((prev) => ({ ...prev, hero: e.target.checked }))
                      }
                    />
                    Clear hero
                  </label>
                </div>
              </div>

              <div className="upload-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-espresso">Homepage Showcase Images</p>
                    <p className="text-xs text-cocoa/60">
                      Separate from the Gallery page. Upload up to 8 images that
                      appear only in the Home showcase section.
                    </p>
                  </div>
                  <label className="upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleHomeDisplayAdd(file)
                          setClearBrand((prev) => ({ ...prev, homeDisplay: false }))
                        }
                        resetFileInput(e)
                      }}
                    />
                    Add Image
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {homeDisplayGallery.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="rounded-xl2 border border-gold/20 bg-obsidian/60 p-2"
                    >
                      <div className="h-20 overflow-hidden rounded-xl2">
                        <img
                          src={image}
                          alt={`Home display ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <label className="upload-button">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleHomeDisplayReplace(index, file)
                              resetFileInput(e)
                            }}
                          />
                          Replace
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleHomeDisplayDelete(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {homeDisplayGallery.length === 0 && (
                    <div className="flex h-20 items-center justify-center rounded-xl2 border border-dashed border-gold/30 bg-obsidian/50 text-xs text-cocoa/60">
                      No home display images yet.
                    </div>
                  )}
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-cocoa/70">
                  <input
                    type="checkbox"
                    className="accent-gold"
                    checked={clearBrand.homeDisplay}
                    onChange={(e) =>
                      setClearBrand((prev) => ({ ...prev, homeDisplay: e.target.checked }))
                    }
                  />
                  Clear all home display images
                </label>
              </div>

              <div className="upload-panel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-espresso">Home Menu Highlights</p>
                    <p className="text-xs text-cocoa/60">
                      Choose today&apos;s special and up to 6 popular picks for the
                      Home page.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={saveHomeProducts}
                    disabled={homeProductsSaving}
                  >
                    {homeProductsSaving ? 'Saving...' : 'Save Highlights'}
                  </Button>
                </div>

                <div className="mt-4 space-y-4 text-sm">
                  <SelectMenu
                    label="Today's Special"
                    value={todaysSpecialId}
                    onChange={setTodaysSpecialId}
                    placeholder="Select menu item"
                    options={products.map((product) => ({
                      label: product.name,
                      value: product._id,
                    }))}
                  />

                  <div>
                    <p className="text-xs font-semibold text-cocoa/70">
                      Popular Picks ({featuredProductsSelection.length}/6)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {products.map((product) => (
                        <Button
                          key={product._id}
                          type="button"
                          size="sm"
                          variant={
                            featuredProductsSelection.includes(product._id)
                              ? 'default'
                              : 'secondary'
                          }
                          onClick={() => toggleFeaturedProduct(product._id)}
                        >
                          {product.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {homeProductsError && <p className="form-error">{homeProductsError}</p>}
                </div>
              </div>

              {brandError && <p className="form-error">{brandError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="flex-1 justify-center" disabled={brandSaving}>
                  {brandSaving ? 'Saving...' : 'Save Brand'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetBrand}>
                  Reset
                </Button>
              </div>
            </div>
          </form>

          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Live Preview"
              title="Preview Panel"
              description="These assets will appear on the Home page and in the navigation."
            />
            <div className="mt-4 space-y-4">
              <div className={dashboardItemClass}>
                <p className="text-xs uppercase text-cocoa/60">Logo</p>
                <div className="mt-3 flex items-center gap-3">
                  {logoDisplay ? (
                    <img
                      src={logoDisplay}
                      alt="Logo"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-obsidian/80" />
                  )}
                  <span className="text-sm text-cocoa/70">Navbar brand</span>
                </div>
              </div>
              <div className={dashboardItemClass}>
                <p className="text-xs uppercase text-cocoa/60">Hero Background</p>
                {heroDisplay ? (
                  <img
                    src={heroDisplay}
                    alt="Hero"
                    className="mt-3 h-28 w-full rounded-xl2 object-cover"
                  />
                ) : (
                  <div className="mt-3 h-28 w-full rounded-xl2 bg-obsidian/80" />
                )}
              </div>
              <div className={dashboardItemClass}>
                <p className="text-xs uppercase text-cocoa/60">Homepage Showcase Images</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(homeDisplayGallery.length
                    ? homeDisplayGallery
                    : Array.from({ length: 3 })).map(
                    (image, index) => (
                      <div
                        key={image || index}
                        className="h-16 overflow-hidden rounded-lg border border-gold/10 bg-obsidian/70"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt="Home display"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form noValidate onSubmit={handleEventSubmit} className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Event Editor"
              title={eventForm.id ? 'Edit Event' : 'Add Event'}
              description="Plan event details, timing, capacity, and activation status from one panel."
            />
            <div className="mt-5 space-y-4 text-sm">
              <Input
                type="text"
                placeholder="Event title"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                    Start Date & Time
                  </p>
                  <Input
                    type="datetime-local"
                    value={eventForm.startDateTime}
                    onChange={(e) =>
                      setEventForm((prev) => ({
                        ...prev,
                        startDateTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                    End Date & Time
                  </p>
                  <Input
                    type="datetime-local"
                    value={eventForm.endDateTime}
                    onChange={(e) =>
                      setEventForm((prev) => ({
                        ...prev,
                        endDateTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <Textarea
                placeholder="Description"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows="3"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  placeholder="Capacity (0 = unlimited)"
                  value={eventForm.capacity}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      capacity: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-cocoa/70">
                <input
                  type="checkbox"
                  checked={eventForm.isActive}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="accent-gold"
                />
                Active
              </label>
              {eventError && <p className="form-error">{eventError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="flex-1 justify-center" disabled={eventSaving}>
                  {eventSaving ? 'Saving...' : eventForm.id ? 'Update Event' : 'Create Event'}
                </Button>
                {eventForm.id && (
                  <Button type="button" variant="secondary" onClick={resetEventForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>

          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Calendar Overview"
              title="Events"
              description={`${adminEvents.length} events available, including featured selections for the Home page.`}
              action={
                <Button
                  variant="secondary"
                  onClick={saveFeatured}
                  disabled={featuredSaving}
                >
                  {featuredSaving ? 'Saving...' : 'Save Featured'}
                </Button>
              }
            />
            {featuredError && <p className="form-error mt-3">{featuredError}</p>}
            <div className="mt-4 space-y-3 text-sm">
              {adminEvents.map((event) => {
                const eventRange = formatAdminEventRange(event)

                return (
                  <div
                    key={event._id}
                    className={cn(
                      dashboardItemClass,
                      'flex flex-wrap items-start justify-between gap-4'
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-espresso">
                        {event.title}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-cocoa/65">
                        <p>
                          <span className="font-semibold text-cocoa/80">Starts:</span>{' '}
                          {eventRange.startsAt}
                        </p>
                        <p>
                          <span className="font-semibold text-cocoa/80">Ends:</span>{' '}
                          {eventRange.endsAt}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge>{event.isActive ? 'Active' : 'Inactive'}</Badge>
                        <span className="pill">
                          {event.registrationsCount || 0}
                          {event.capacity > 0 ? ` / ${event.capacity}` : ''} registered
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={
                          featuredSelection.includes(event._id)
                            ? 'default'
                            : 'secondary'
                        }
                        onClick={() => toggleFeatured(event._id)}
                      >
                        Home
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEventEdit(event)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEventDelete(event._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
              {adminEvents.length === 0 && (
                <p className="text-sm text-cocoa/60">No events yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Gallery Editor"
              title="Gallery Page Media"
              description="This section is separate from the Home page and controls only `/gallery`."
              action={
                <label className="upload-button">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleGalleryAdd(file)
                      }
                      resetFileInput(e)
                    }}
                  />
                  Add Image
                </label>
              }
            />

            {galleryError && <p className="form-error mt-4">{galleryError}</p>}

            <div className="mt-4 space-y-3">
              {galleryDisplay.length === 0 && (
                <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/40 p-4 text-sm text-cocoa/60">
                  No gallery images yet.
                </div>
              )}
              {galleryDisplay.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className={dashboardCompactItemClass}
                >
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <div className="h-24 overflow-hidden rounded-xl2 border border-gold/10">
                      <img
                        src={image}
                        alt={`Gallery page ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="upload-button">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleGalleryReplace(index, file)
                            }
                            resetFileInput(e)
                          }}
                        />
                        Replace
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleGalleryDelete(index)}
                        disabled={gallerySaving}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Preview"
              title="Gallery Preview"
              description="The page uses a masonry-style layout with variable card heights."
            />
            <div className="mt-5 grid auto-rows-[120px] gap-3 sm:grid-cols-2">
              {(galleryDisplay.length ? galleryDisplay : Array.from({ length: 4 })).map(
                (image, index) => (
                  <div
                    key={image || index}
                    className={`overflow-hidden rounded-xl2 border border-gold/15 bg-obsidian/50 ${
                      index % 3 === 0 ? 'row-span-2' : 'row-span-1'
                    }`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt="Gallery preview"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && isAdmin && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form noValidate onSubmit={handleStaffSubmit} className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Team Access"
              title={staffForm.id ? 'Edit Staff' : 'Add Staff'}
              description="Add staff by email, assign permissions, and manage who can access each workspace."
            />
            <div className="mt-5 space-y-4 text-sm">
              <Input
                type="text"
                placeholder="Full name"
                value={staffForm.fullName}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
              <Input
                type="email"
                placeholder="Email"
                value={staffForm.email}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
              <Input
                type="text"
                placeholder="Phone (optional)"
                value={staffForm.phone}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
              {!staffForm.id && (
                <Input
                  type="password"
                  placeholder="Temporary password"
                  value={staffForm.password}
                  onChange={(e) =>
                    setStaffForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              )}
              <SelectMenu
                value={staffForm.role}
                onChange={(value) =>
                  setStaffForm((prev) => ({ ...prev, role: value }))
                }
                className="w-40"
                menuClassName="w-44"
                options={[
                  { label: 'Staff', value: 'Staff' },
                  { label: 'Admin', value: 'Admin' },
                ]}
              />
              <div className="space-y-2">
                <p className="text-xs uppercase text-cocoa/60">
                  Permissions
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {staffPermissionOptions.map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-center gap-2 rounded-xl2 border border-gold/15 bg-obsidian/60 px-3 py-2 text-xs text-cocoa/70"
                    >
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={staffForm.permissions.includes(perm.value)}
                        onChange={() => togglePermission(perm.value)}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
              {staffError && <p className="form-error">{staffError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="flex-1 justify-center" disabled={staffSaving}>
                  {staffSaving
                    ? 'Saving...'
                    : staffForm.id
                    ? 'Update Staff'
                    : 'Add Staff'}
                </Button>
                {staffForm.id && (
                  <Button type="button" variant="secondary" onClick={resetStaffForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>

          <div className={dashboardPanelClass}>
            <DashboardSectionHeading
              eyebrow="Team Directory"
              title="Team"
              description={`${staffList.length} staff account${staffList.length === 1 ? '' : 's'} available for access management.`}
            />
            <div className="mt-4 space-y-3 text-sm">
              {staffList.map((member) => (
                <div
                  key={member.id}
                  className={dashboardItemClass}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-espresso">
                        {member.fullName || 'Staff member'}
                      </p>
                      <p className="text-xs text-cocoa/60">{member.email}</p>
                      {member.phone && (
                        <p className="text-xs text-cocoa/60">{member.phone}</p>
                      )}
                    </div>
                    <Badge>{member.role}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(member.permissions || []).length === 0 && member.role !== 'Admin' && (
                      <span className="text-xs text-cocoa/50">No permissions</span>
                    )}
                    {(member.permissions || []).map((perm) => (
                      <Badge key={perm} variant="secondary">
                        {permissionMap.get(perm) || perm}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => handleStaffEdit(member)}>
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => handleStaffDelete(member)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {staffList.length === 0 && (
                <p className="text-sm text-cocoa/60">No staff accounts yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </section>
  )
}
