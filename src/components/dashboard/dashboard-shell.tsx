import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardShellProps = {
  badge?: string
  title: string
  description?: string
  rightSlot?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardShell({
  badge,
  title,
  description,
  rightSlot,
  children,
  className,
}: DashboardShellProps) {
  return (
    <div className={cn('space-y-8', className)}>
      <section className="rounded-[2rem] border border-border bg-secondary/70 p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {badge ? (
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">{badge}</p>
            ) : null}
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {rightSlot}
        </div>
      </section>
      {children}
    </div>
  )
}
