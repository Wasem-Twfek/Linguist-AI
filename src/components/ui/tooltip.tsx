import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // Small delay before showing to prevent rapid flicker
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 100)
  }

  const handleMouseLeave = () => {
    // Clear any pending show timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-1.5 text-sm text-popover-foreground bg-popover border rounded-md shadow-md",
            "top-full left-1/2 transform -translate-x-1/2 mt-2",
            "max-w-[200px] text-center",
            className
          )}
          style={{ pointerEvents: 'none' }}
        >
          {content}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0">
            <div className="border-4 border-transparent border-b-popover"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export { Tooltip }
