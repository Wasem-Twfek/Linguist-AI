'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SmartBackButtonProps = {
  label?: string
  fallbackHref: string
  /** When true, uses browser history back only if possible; otherwise navigates to fallbackHref. */
  preferHistory?: boolean
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const premiumStyles =
  'h-auto min-h-9 max-w-full gap-2 rounded-full border-blue-100 bg-white px-4 py-2 font-semibold text-slate-800 shadow-soft backdrop-blur-sm hover:border-blue-200 hover:bg-blue-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function SmartBackButton({
  label = 'Назад',
  fallbackHref,
  preferHistory = false,
  className,
  variant = 'outline',
  size = 'sm',
}: SmartBackButtonProps) {
  const router = useRouter()

  const mergedClassName = cn(
    premiumStyles,
    'inline-flex min-w-0 shrink items-center justify-start text-sm [&_svg]:shrink-0',
    className
  )

  if (!preferHistory) {
    return (
      <Button variant={variant} size={size} asChild className={mergedClassName}>
        <Link href={fallbackHref}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="min-w-0 whitespace-normal text-left leading-snug">{label}</span>
        </Link>
      </Button>
    )
  }

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={mergedClassName}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      <span className="min-w-0 whitespace-normal text-left leading-snug">{label}</span>
    </Button>
  )
}
