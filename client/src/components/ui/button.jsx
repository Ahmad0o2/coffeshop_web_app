import { cn } from '../../lib/utils'
import { cloneElement, isValidElement } from 'react'

const base =
  'inline-flex items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:pointer-events-none disabled:opacity-50'

const variants = {
  default: 'bg-gold text-obsidian hover:bg-caramel',
  secondary:
    'border border-gold/30 bg-obsidian/60 text-espresso hover:border-gold/60 hover:bg-obsidian/80',
  outline: 'border border-gold/40 bg-transparent text-espresso hover:bg-obsidian/60',
  ghost: 'bg-transparent text-espresso hover:bg-obsidian/60',
  luxury:
    'bg-gradient-to-r from-gold via-caramel to-espresso text-obsidian shadow-card',
  special:
    'bg-gradient-to-r from-[#18110f] via-[#5b3b26] to-[#a87444] text-cream shadow-card hover:brightness-105 hover:shadow-cardHover',
}

const sizes = {
  sm: 'h-9 px-3',
  md: 'h-10 px-4',
  lg: 'h-11 px-6',
  icon: 'h-10 w-10',
}

function Slot({ children, className, ...props }) {
  if (!isValidElement(children)) return null
  return cloneElement(children, {
    ...props,
    className: cn(className, children.props.className),
  })
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
