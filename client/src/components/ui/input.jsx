import { cn } from '../../lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl2 border border-gold/20 bg-obsidian/60 px-3 py-2 text-sm text-espresso shadow-sm transition placeholder:text-cocoa/70 focus:outline-none focus:ring-2 focus:ring-gold/40',
        className
      )}
      {...props}
    />
  )
}