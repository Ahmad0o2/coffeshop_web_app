import { cn } from '../../lib/utils'

const variants = {
  default: 'border border-gold/40 bg-obsidian/60 text-espresso',
  highlight: 'border border-gold/60 bg-gold/20 text-gold',
  solid: 'bg-gold text-obsidian',
}

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
