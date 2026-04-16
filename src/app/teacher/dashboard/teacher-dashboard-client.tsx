'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import { GenerateAssignmentForm } from './generate-assignment-form'
import { CreateManualAssignmentForm } from './create-manual-assignment-form'
import { AssignmentsTable } from './assignments-table'
import { GroupsPanel } from './groups-panel'
import { refreshAssignmentAnalytics } from './actions'
import type { AssignmentAnalytics } from '@/types/analytics'

type Assignment = Database['public']['Tables']['assignments']['Row']

interface GroupWithCount {
  id: string
  name: string
  description: string | null
  created_at: string | null
  member_count: number
}

interface TeacherDashboardClientProps {
  initialAssignments: Assignment[]
  initialAnalytics: Map<string, AssignmentAnalytics>
  initialGroups: GroupWithCount[]
}

export function TeacherDashboardClient({ 
  initialAssignments, 
  initialAnalytics,
  initialGroups
}: TeacherDashboardClientProps) {
  const router = useRouter()
  
  // Use state initialized from props, updated via callbacks for immediate UI updates
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [analytics, setAnalytics] = useState<Map<string, AssignmentAnalytics>>(initialAnalytics)
  // Lifted groups state - single source of truth
  const [groups, setGroups] = useState<GroupWithCount[]>(initialGroups)
  
  // Ref to prevent overlapping refresh requests
  const isRefreshingRef = useRef(false)

  // Refresh analytics for all assignments
  const refreshAnalytics = useCallback(async () => {
    // Prevent overlapping requests
    if (isRefreshingRef.current) {
      return
    }

    if (assignments.length === 0) {
      return
    }

    isRefreshingRef.current = true

    try {
      const assignmentIds = assignments.map(a => a.id)
      const result = await refreshAssignmentAnalytics(assignmentIds)
      
      if (result.success && result.analytics) {
        setAnalytics(result.analytics)
      }
    } catch (error) {
      // Silently handle errors - don't crash UI
      console.error('Error refreshing analytics:', error)
    } finally {
      isRefreshingRef.current = false
    }
  }, [assignments])

  // Polling: refresh analytics periodically when page is visible
  useEffect(() => {
    // Only poll when page is visible
    if (document.visibilityState !== 'visible') {
      return
    }

    // Refresh immediately on mount if visible
    refreshAnalytics()

    // Set up polling interval (4 seconds)
    const intervalId = setInterval(() => {
      // Only poll if page is still visible
      if (document.visibilityState === 'visible') {
        refreshAnalytics()
      }
    }, 4000)

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - refresh immediately
        refreshAnalytics()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshAnalytics])

  function handleAssignmentCreated(newAssignment: Assignment) {
    // Immediately add to state
    setAssignments(prev => [newAssignment, ...prev])
    // Analytics will be empty for new assignment (keep existing analytics)
    // Signal student dashboards to refresh (cross-window)
    if (typeof window !== 'undefined') {
      localStorage.setItem('student-dashboard-updated', Date.now().toString())
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'student-dashboard-updated',
        newValue: Date.now().toString()
      }))
    }
  }

  function handleAssignmentDeleted(assignmentId: string) {
    // Immediately remove from state
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    setAnalytics(prev => {
      const newMap = new Map(prev)
      newMap.delete(assignmentId)
      return newMap
    })
    // Signal student dashboards to refresh (cross-window)
    if (typeof window !== 'undefined') {
      localStorage.setItem('student-dashboard-updated', Date.now().toString())
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'student-dashboard-updated',
        newValue: Date.now().toString()
      }))
    }
  }

  // Handle group mutations with state update + router refresh
  function handleGroupCreated(newGroup: GroupWithCount) {
    setGroups(prev => [newGroup, ...prev])
    router.refresh()
  }

  function handleGroupDeleted(deletedGroupId: string) {
    setGroups(prev => prev.filter(g => g.id !== deletedGroupId))
    router.refresh()
  }

  function handleMemberCountUpdated(groupId: string, newCount: number) {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, member_count: newCount } : g
    ))
    router.refresh()
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[400px,1fr]">
      {/* Left Column - Generate New Lesson + Groups */}
      <div className="space-y-6">
        <GenerateAssignmentForm 
          groups={groups}
          onAssignmentCreated={handleAssignmentCreated}
        />
        <CreateManualAssignmentForm 
          groups={groups}
          onAssignmentCreated={handleAssignmentCreated}
        />
        {/* Groups Panel - For managing student groups */}
        <GroupsPanel 
          groups={groups}
          onGroupCreated={handleGroupCreated}
          onGroupDeleted={handleGroupDeleted}
          onMemberCountUpdated={handleMemberCountUpdated}
        />
      </div>

      {/* Right Column - Existing Lessons */}
      <div>
        <AssignmentsTable 
          assignments={assignments} 
          analytics={analytics}
          groups={groups}
          onAssignmentCreated={handleAssignmentCreated}
          onAssignmentDeleted={handleAssignmentDeleted}
          onAnalyticsUpdated={(assignmentId, updatedAnalytics) => {
            setAnalytics(prev => {
              const newMap = new Map(prev)
              newMap.set(assignmentId, updatedAnalytics)
              return newMap
            })
          }}
        />
      </div>
    </div>
  )
}

