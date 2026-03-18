import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import SelectMenu from '../components/common/SelectMenu'
import { getApiErrorMessage } from '../utils/apiErrors'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const ACTIVITY_LIMIT = 250

const fetchActivityLogs = async () => {
  const { data } = await api.get(`/admin/activity-logs?limit=${ACTIVITY_LIMIT}`)
  return data.logs || []
}

const getActivityKey = (entry) =>
  entry?._id || `${entry?.event || 'activity'}-${entry?.occurredAt || ''}-${entry?.summary || ''}`

const getLocalDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return date.toLocaleDateString('en-CA')
}

const groupLogsByDay = (logs) => {
  const grouped = new Map()

  logs.forEach((entry) => {
    const dateKey = getLocalDateKey(entry.occurredAt)

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }

    grouped.get(dateKey).push(entry)
  })

  return Array.from(grouped.entries()).map(([dateKey, entries]) => ({
    dateKey,
    labelSource: entries[0]?.occurredAt || dateKey,
    entries,
  }))
}

export default function AdminActivity() {
  const { user, isAuthenticated } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const [activityLogs, setActivityLogs] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    event: 'All',
    role: 'All',
    dateRange: 'All',
  })

  const {
    data: fetchedLogs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: fetchActivityLogs,
    enabled: isAuthenticated && isAdmin,
  })

  useEffect(() => {
    setActivityLogs(fetchedLogs)
  }, [fetchedLogs])

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return undefined

    const socket = io(socketUrl)

    const handleAdminActivity = (payload) => {
      setActivityLogs((prev) => {
        const incomingKey = getActivityKey(payload)
        const next = [payload, ...prev.filter((entry) => getActivityKey(entry) !== incomingKey)]
        return next.slice(0, ACTIVITY_LIMIT)
      })
    }

    socket.on('admin:activity', handleAdminActivity)

    return () => {
      socket.off('admin:activity', handleAdminActivity)
      socket.disconnect()
    }
  }, [isAuthenticated, isAdmin])

  const eventOptions = useMemo(() => {
    const values = Array.from(new Set(activityLogs.map((entry) => entry.event).filter(Boolean)))
    return [
      { value: 'All', label: 'All Events' },
      ...values.map((value) => ({ value, label: value })),
    ]
  }, [activityLogs])

  const roleOptions = useMemo(() => {
    const values = Array.from(
      new Set(activityLogs.map((entry) => entry.actor?.role).filter(Boolean))
    )
    return [
      { value: 'All', label: 'All Roles' },
      ...values.map((value) => ({ value, label: value })),
    ]
  }, [activityLogs])

  const filteredLogs = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase()
    const todayKey = getLocalDateKey(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = getLocalDateKey(yesterday)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    return activityLogs.filter((entry) => {
      const matchesSearch = searchValue
        ? [
            entry.summary,
            entry.event,
            entry.actor?.fullName,
            entry.actor?.role,
            entry.details?.subject,
            entry.details?.status,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchValue))
        : true

      const matchesEvent = filters.event === 'All' ? true : entry.event === filters.event
      const matchesRole =
        filters.role === 'All' ? true : entry.actor?.role === filters.role

      let matchesDateRange = true
      if (filters.dateRange === 'Today') {
        matchesDateRange = getLocalDateKey(entry.occurredAt) === todayKey
      } else if (filters.dateRange === 'Yesterday') {
        matchesDateRange = getLocalDateKey(entry.occurredAt) === yesterdayKey
      } else if (filters.dateRange === 'Last7Days') {
        const occurredAt = new Date(entry.occurredAt)
        matchesDateRange = !Number.isNaN(occurredAt.getTime()) && occurredAt >= weekAgo
      }

      return matchesSearch && matchesEvent && matchesRole && matchesDateRange
    })
  }, [activityLogs, filters])

  const groupedLogs = useMemo(() => groupLogsByDay(filteredLogs), [filteredLogs])

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.event !== 'All' ||
    filters.role !== 'All' ||
    filters.dateRange !== 'All'

  const formatDayLabel = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown Day'

    const today = new Date()
    const todayKey = getLocalDateKey(today)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = getLocalDateKey(yesterday)
    const currentKey = getLocalDateKey(date)

    if (currentKey === todayKey) return 'Today'
    if (currentKey === yesterdayKey) return 'Yesterday'

    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Now'
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-espresso">Activity Log</h1>
        <p className="mt-4 text-sm text-cocoa/70">
          This page is available for admin accounts only.
        </p>
      </section>
    )
  }

  return (
    <section className="section-shell">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-espresso">Activity Log</h1>
          <p className="mt-2 text-sm text-cocoa/70">
            Saved dashboard activity grouped by day so we can review what changed and when.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{activityLogs.length} saved entries</Badge>
          <Button asChild variant="secondary">
            <Link to="/admin">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-espresso">Filters</h2>
            <p className="mt-1 text-xs text-cocoa/60">
              Filter by action type, role, date range, or any keyword from the saved activity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{filteredLogs.length} matching entries</Badge>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    search: '',
                    event: 'All',
                    role: 'All',
                    dateRange: 'All',
                  })
                }
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
              Search
            </span>
            <Input
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search summary, actor, subject..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
              Event
            </span>
            <SelectMenu
              value={filters.event}
              onChange={(value) => setFilters((prev) => ({ ...prev, event: value }))}
              options={eventOptions}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
              Role
            </span>
            <SelectMenu
              value={filters.role}
              onChange={(value) => setFilters((prev) => ({ ...prev, role: value }))}
              options={roleOptions}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
              Date Range
            </span>
            <SelectMenu
              value={filters.dateRange}
              onChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
              options={[
                { value: 'All', label: 'All Dates' },
                { value: 'Today', label: 'Today' },
                { value: 'Yesterday', label: 'Yesterday' },
                { value: 'Last7Days', label: 'Last 7 Days' },
              ]}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="form-error mt-6">
          {getApiErrorMessage(error, 'Failed to load activity log.')}
        </p>
      )}

      {isLoading && (
        <div className="mt-6 card p-6">
          <p className="text-sm text-cocoa/70">Loading activity log...</p>
        </div>
      )}

      {!isLoading && groupedLogs.length === 0 && (
        <div className="mt-6 card p-6">
          <p className="text-sm text-cocoa/70">
            {hasActiveFilters
              ? 'No activity matches the current filters.'
              : 'No saved activity yet.'}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {groupedLogs.map((group) => (
          <div key={group.dateKey} className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-espresso">
                  {formatDayLabel(group.labelSource)}
                </h2>
                <p className="mt-1 text-xs text-cocoa/60">
                  Daily review of saved changes and actions.
                </p>
              </div>
              <Badge>{group.entries.length} changes</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {group.entries.map((entry) => (
                <div
                  key={getActivityKey(entry)}
                  className="rounded-xl2 border border-gold/15 bg-obsidian/50 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold text-espresso">
                      {entry.summary || 'Dashboard activity recorded'}
                    </p>
                    <span className="text-xs text-cocoa/60">
                      {formatTime(entry.occurredAt)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-cocoa/60">
                    {entry.actor?.role && (
                      <span>
                        By {entry.actor.fullName || 'User'} ({entry.actor.role})
                      </span>
                    )}
                    {entry.details?.subject && (
                      <Badge variant="secondary">{entry.details.subject}</Badge>
                    )}
                    {entry.details?.status && (
                      <Badge variant="outline">Status: {entry.details.status}</Badge>
                    )}
                    {entry.event && <Badge>{entry.event}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
