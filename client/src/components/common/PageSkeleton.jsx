export function PulseLogoLoader({ label = "Loading Cortina.D..." }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold via-caramel to-espresso shadow-card">
        <div className="absolute inset-0 rounded-full bg-gold/30 animate-ping" />
        <div className="relative h-10 w-10 rounded-full bg-obsidian/70" />
      </div>
      <p className="text-sm font-semibold tracking-[0.24em] text-cocoa/70 uppercase">
        {label}
      </p>
    </div>
  )
}

export function PageHeroSkeleton({ cards = 3, sidebar = false }) {
  return (
    <section className="section-shell">
      <div className="card overflow-hidden p-8">
        <div className="h-4 w-28 animate-pulse rounded-full bg-gold/15" />
        <div className="mt-4 h-12 w-full max-w-xl animate-pulse rounded-3xl bg-white/5" />
        <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded-3xl bg-white/5" />
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="h-11 w-36 animate-pulse rounded-full bg-gold/15" />
          <div className="h-11 w-32 animate-pulse rounded-full bg-white/5" />
        </div>
      </div>

      <div
        className={`mt-8 grid gap-6 ${
          sidebar ? "lg:grid-cols-[280px_1fr]" : "md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {sidebar && (
          <div className="card p-5">
            <div className="h-10 animate-pulse rounded-xl2 bg-white/5" />
            <div className="mt-4 h-10 animate-pulse rounded-xl2 bg-white/5" />
            <div className="mt-4 h-32 animate-pulse rounded-xl3 bg-white/5" />
          </div>
        )}
        <div className={sidebar ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "contents"}>
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="card overflow-hidden p-0">
              <div className="h-44 animate-pulse bg-white/5" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-20 animate-pulse rounded-full bg-gold/15" />
                <div className="h-6 w-2/3 animate-pulse rounded-3xl bg-white/5" />
                <div className="h-4 w-full animate-pulse rounded-3xl bg-white/5" />
                <div className="h-10 animate-pulse rounded-full bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function DetailSkeleton() {
  return (
    <section className="section-shell max-w-4xl">
      <div className="card p-8">
        <div className="h-64 animate-pulse rounded-xl3 bg-white/5" />
        <div className="mt-6 h-10 w-2/3 animate-pulse rounded-3xl bg-white/5" />
        <div className="mt-3 h-5 w-full animate-pulse rounded-3xl bg-white/5" />
        <div className="mt-6 h-12 w-40 animate-pulse rounded-full bg-gold/15" />
        <div className="mt-6 h-24 animate-pulse rounded-xl3 bg-white/5" />
      </div>
    </section>
  )
}

export function ListSkeleton({ items = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="h-4 w-32 animate-pulse rounded-full bg-gold/15" />
          <div className="mt-4 h-10 animate-pulse rounded-xl2 bg-white/5" />
          <div className="mt-3 h-20 animate-pulse rounded-xl3 bg-white/5" />
        </div>
      ))}
    </div>
  )
}
