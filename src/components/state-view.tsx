import Link from 'next/link'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type StateViewProps = {
  title: string
  description?: string
  className?: string
  actionHref?: string
  actionLabel?: string
}

export function LoadingState({
  title = 'Загрузка...',
  description,
  className,
}: Partial<StateViewProps>) {
  return (
    <Card className={cn('border-dashed bg-card shadow-soft', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function EmptyState({
  title,
  description,
  className,
  actionHref,
  actionLabel,
}: StateViewProps) {
  return (
    <Card className={cn('border-dashed bg-card shadow-soft', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actionHref && actionLabel && (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function ErrorState({
  title,
  description,
  className,
  actionHref,
  actionLabel,
}: StateViewProps) {
  return (
    <Card className={cn('border-destructive/30 bg-destructive/5 shadow-soft', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actionHref && actionLabel && (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
