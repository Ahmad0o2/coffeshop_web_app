const formatEventDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'TBD'

  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function EventCard({
  event,
  onRegister,
  onUnregister,
  isRegistered = false,
  isAuthenticated = false,
  isLoading = false,
}) {
  const isFull =
    Number(event.capacity || 0) > 0 &&
    Number(event.registrationsCount || 0) >= Number(event.capacity || 0)

  const buttonLabel = !isAuthenticated
    ? 'Sign in to register'
    : isRegistered
      ? isLoading
        ? 'Leaving...'
        : 'Leave registration'
      : isFull
        ? 'Event Full'
        : isLoading
          ? 'Registering...'
          : 'Register'

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-espresso">
        {event.title}
      </h3>
      <p className="mt-2 text-sm text-cocoa/70">{event.description}</p>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-cocoa/60">
            <span className="pill max-w-full truncate">
              Starts: {formatEventDateTime(event.startDateTime)}
            </span>
            <span className="pill max-w-full truncate">
              Ends: {formatEventDateTime(event.endDateTime)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-cocoa/60">
            <span className="pill">
              {event.registrationsCount || 0}
              {event.capacity > 0 ? ` / ${event.capacity}` : ''} registered
            </span>
            {isRegistered ? <span className="pill">You are registered</span> : null}
          </div>
        </div>

        <button
          onClick={() => (isRegistered ? onUnregister?.(event) : onRegister?.(event))}
          disabled={!isAuthenticated || (!isRegistered && isFull) || isLoading}
          className={`shrink-0 rounded-xl2 border px-4 py-2 text-xs font-semibold transition ${
            isRegistered
              ? 'border-gold/40 bg-caramel/10 text-espresso hover:bg-caramel/15'
              : 'border-gold/30 bg-obsidian/50 text-espresso'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
