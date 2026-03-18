import { InstagramIcon, MapPinIcon } from './Icons'

export default function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-obsidian">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-cocoa/70">
        <p>(c) 2026 Cortina.D Coffee House</p>
        <div className="flex flex-wrap gap-4 text-xs text-cocoa/70">
          <a
            href="https://www.instagram.com/cortinadcoffeehouse?hl=ar"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-cream"
          >
            <InstagramIcon className="h-4 w-4 text-gold" />
            Instagram
          </a>
          <a
            href="https://maps.google.com/?q=Cortina.D%20Coffee%20House%20Uni%20Street%20Irbid"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-cream"
          >
            <MapPinIcon className="h-4 w-4 text-gold" />
            Uni Street, Irbid
          </a>
        </div>
      </div>
    </footer>
  )
}
