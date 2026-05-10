import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardTableProps = {
  minWidthClassName?: string
  children: ReactNode
  className?: string
}

export function DashboardTable({
  minWidthClassName = 'min-w-[900px]',
  children,
  className,
}: DashboardTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-border', className)}>
      <table className={cn('w-full', minWidthClassName)}>{children}</table>
    </div>
  )
}
