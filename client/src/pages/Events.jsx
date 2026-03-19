import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import EventCard from '../components/events/EventCard'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import { PageHeroSkeleton } from '../components/common/PageSkeleton'
import useRealtimeInvalidation from '../hooks/useRealtimeInvalidation'
import { getApiErrorMessage } from '../utils/apiErrors'

const fetchEvents = async () => {
  const { data } = await api.get('/events')
  return data.events || []
}

const fetchMyRegistrations = async () => {
  const { data } = await api.get('/events/registrations/me')
  return data.eventIds || []
}

export default function Events() {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [eventMessage, setEventMessage] = useState('')
  const [eventError, setEventError] = useState('')
  const [loadingEventId, setLoadingEventId] = useState('')

  const realtimeBindings = useMemo(
    () => [
      { event: 'events:changed', queryKeys: [['events'], ['my-event-registrations']] },
    ],
    []
  )

  useRealtimeInvalidation(realtimeBindings)

  const { data: events = [], isLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    enabled: isAuthenticated,
  })
  const { data: myRegistrationIds = [], refetch: refetchMyRegistrations } = useQuery({
    queryKey: ['my-event-registrations'],
    queryFn: fetchMyRegistrations,
    enabled: isAuthenticated,
  })

  const handleRegister = async (event) => {
    if (!isAuthenticated) {
      return
    }
    setLoadingEventId(event._id)
    setEventError('')
    setEventMessage('')
    try {
      const { data } = await api.post(`/events/${event._id}/register`, {})
      queryClient.setQueryData(['my-event-registrations'], (current = []) => {
        if (current.includes(event._id)) return current
        return [...current, event._id]
      })
      queryClient.setQueryData(['events'], (current = []) =>
        current.map((entry) =>
          entry._id === event._id
            ? {
                ...entry,
                registrationsCount: Number(entry.registrationsCount || 0) + 1,
              }
            : entry
        )
      )
      setEventMessage(data?.message || `You are registered for ${event.title}.`)
      refetchEvents()
      refetchMyRegistrations()
    } catch (error) {
      setEventError(getApiErrorMessage(error, 'Failed to register for this event.'))
    } finally {
      setLoadingEventId('')
    }
  }

  const handleUnregister = async (event) => {
    if (!isAuthenticated) {
      return
    }
    setLoadingEventId(event._id)
    setEventError('')
    setEventMessage('')
    try {
      const { data } = await api.post(`/events/${event._id}/unregister`, {})
      queryClient.setQueryData(['my-event-registrations'], (current = []) =>
        current.filter((id) => id !== event._id)
      )
      queryClient.setQueryData(['events'], (current = []) =>
        current.map((entry) =>
          entry._id === event._id
            ? {
                ...entry,
                registrationsCount: Math.max(
                  0,
                  Number(entry.registrationsCount || 0) - 1
                ),
              }
            : entry
        )
      )
      setEventMessage(
        data?.message || `You have left registration for ${event.title}.`
      )
      refetchEvents()
      refetchMyRegistrations()
    } catch (error) {
      setEventError(
        getApiErrorMessage(error, 'Failed to leave this event registration.')
      )
    } finally {
      setLoadingEventId('')
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ redirectTo: "/events" }} />
  }

  if (isLoading) {
    return <PageHeroSkeleton cards={4} />
  }

  return (
    <section className="section-shell">
      <h1 className="text-3xl font-semibold text-espresso">Events</h1>
      <p className="mt-2 text-sm text-cocoa/70">
        Campus nights, latte art, and study jams.
      </p>
      {eventMessage && (
        <div className="mt-4 rounded-xl2 border border-gold/20 bg-caramel/10 p-4 text-sm text-espresso">
          {eventMessage}
        </div>
      )}
      {eventError && <p className="form-error mt-4">{eventError}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            onRegister={handleRegister}
            onUnregister={handleUnregister}
            isRegistered={myRegistrationIds.includes(event._id)}
            isAuthenticated={isAuthenticated}
            isLoading={loadingEventId === event._id}
          />
        ))}
      </div>
    </section>
  )
}
