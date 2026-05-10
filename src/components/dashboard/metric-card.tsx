import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type MetricCardProps = {
  title: string
  value: string | number
  helper: string
  icon: LucideIcon
  accentClassName?: string
}

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  accentClassName = 'bg-secondary',
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${accentClassName}`} />
      <CardContent className="relative py-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}
