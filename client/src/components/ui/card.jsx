import { cn } from '../../lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'ui-card rounded-xl3 border border-gold/20 bg-obsidian/70 text-espresso shadow-card',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold text-cream', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }) {
  return (
    <p className={cn('text-sm text-cocoa/70', className)} {...props} />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}
