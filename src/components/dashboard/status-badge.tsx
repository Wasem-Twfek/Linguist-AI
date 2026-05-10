import { Badge } from '@/components/ui/badge'

type DashboardStatus = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

const STATUS_CLASS: Record<DashboardStatus, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
}

export function StatusBadge({ status, children }: { status: DashboardStatus; children: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {children}
    </Badge>
  )
}
