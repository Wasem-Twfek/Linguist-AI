'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReportView } from '@/components/report-view'
import { Database } from '@/types/supabase'

type Result = Database['public']['Tables']['results']['Row']

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: Result | null
  originalText?: string | null
}

export function FeedbackModal({ open, onOpenChange, result, originalText }: FeedbackModalProps) {
  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>AI-отчет по произношению</DialogTitle>
        </DialogHeader>
        <ReportView result={result} originalText={originalText} compact />
      </DialogContent>
    </Dialog>
  )
}
