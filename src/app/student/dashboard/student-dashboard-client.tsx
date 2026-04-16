'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { AssignmentCard } from '@/components/assignment-card'
import { getStudentAssignments, type AssignmentWithResult } from './actions'

interface StudentDashboardClientProps {
  initialAssignments: AssignmentWithResult[]
}

export function StudentDashboardClient({ initialAssignments }: StudentDashboardClientProps) {
  const router = useRouter()
  const isRefreshingRef = useRef(false)
  
  // Use state initialized from props, updated via refresh for immediate UI updates
  const [assignments, setAssignments] = useState<AssignmentWithResult[]>(initialAssignments)

  // Refresh assignments via router.refresh() (polling-based for cross-window updates)
  const refreshAssignments = useCallback(async () => {
    // Prevent overlapping refreshes
    if (isRefreshingRef.current) {
      return
    }

    isRefreshingRef.current = true
    try {
      router.refresh()
      // Also update local state from fresh server data
      const result = await getStudentAssignments()
      if (result.error) {
        console.error('Error refreshing assignments:', result.error)
      } else {
        setAssignments(result.assignments)
      }
    } catch (err) {
      console.error('Error refreshing assignments:', err)
    } finally {
      isRefreshingRef.current = false
    }
  }, [router])

  // Sync with server props when they change
  useEffect(() => {
    setAssignments(initialAssignments)
  }, [initialAssignments])

  // Listen for cross-window update signals (instant updates when teacher creates assignment)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'student-dashboard-updated') {
        // Teacher created assignment - refresh immediately
        refreshAssignments()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [refreshAssignments])

  // Polling: refresh assignments periodically when page is visible (fallback)
  useEffect(() => {
    // Only poll when page is visible
    if (document.visibilityState !== 'visible') {
      return
    }

    // Refresh immediately on mount if visible
    refreshAssignments()

    // Set up polling interval (5 seconds)
    const intervalId = setInterval(() => {
      // Only poll if page is still visible
      if (document.visibilityState === 'visible') {
        refreshAssignments()
      }
    }, 5000)

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - refresh immediately
        refreshAssignments()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshAssignments])

  return (
    <>
      <h2 className="text-3xl font-bold mb-6">Мои задания</h2>
      
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              У вас пока нет активных заданий.
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Попросите учителя добавить вас в группу для доступа к заданиям.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              result={assignment.result ?? undefined}
              session={assignment.session ?? undefined}
            />
          ))}
        </div>
      )}
    </>
  )
}

