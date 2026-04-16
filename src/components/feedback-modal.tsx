'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Database } from '@/types/supabase'
import { InlineHighlightedText, type AnalysisItem } from '@/components/inline-highlighted-text'
import { TTSButton } from '@/components/tts-button'

type Result = Database['public']['Tables']['results']['Row']

function parseWordAnalysis(input: unknown): AnalysisItem[] {
  if (!Array.isArray(input)) return []
  return input.filter(
    (item): item is AnalysisItem =>
      typeof item === 'object' &&
      item !== null &&
      'word' in item &&
      'status' in item &&
      typeof item.word === 'string' &&
      (item.status === 'correct' || item.status === 'improvement' || item.status === 'wrong')
  )
}

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: Result | null
  originalText?: string | null
}

// Circular Progress Component
function CircularProgress({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-blue-600 dark:text-blue-500 transition-all duration-500"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{Math.round(score)}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

export function FeedbackModal({ open, onOpenChange, result, originalText }: FeedbackModalProps) {
  if (!result) return null

  // Parse analysis_data with runtime validation
  const wordAnalysis = parseWordAnalysis(result.analysis_data)

  const overallScore = result.overall_score || 0
  const grammarScore = result.grammar_score || 0
  const pronunciationScore = result.pronunciation_score || 0
  const feedback = result.feedback || 'Обратная связь не предоставлена'
  
  // Use original text if provided, otherwise fall back to empty string
  const displayText = originalText || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Отчет о выполнении</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Circular Progress Bars */}
          <div className="flex justify-around items-center py-4 border-b">
            <CircularProgress 
              score={overallScore} 
              label="Общий балл" 
              size={100}
            />
            <CircularProgress 
              score={grammarScore} 
              label="Грамматика" 
              size={100}
            />
            <CircularProgress 
              score={pronunciationScore} 
              label="Произношение" 
              size={100}
            />
          </div>

          {/* Inline Highlighted Text */}
          {displayText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Анализ текста</h3>
                <div className="flex-shrink-0">
                  <TTSButton 
                    text={displayText} 
                    lang="en-US"
                    variant="outline"
                    size="sm"
                    label="Слушать"
                  />
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-base leading-relaxed">
                  <InlineHighlightedText 
                    text={displayText} 
                    analysisData={wordAnalysis.length > 0 ? wordAnalysis : undefined}
                  />
                </div>
              </div>
              {/* Legend */}
              {wordAnalysis.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-600 dark:bg-green-500"></span>
                  <span>Правильно</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-yellow-600 dark:bg-yellow-500"></span>
                  <span>Требует улучшения</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-red-600 dark:bg-red-500"></span>
                  <span>Ошибка</span>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Feedback Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Обратная связь</h3>
            <div className="p-4 bg-muted rounded-lg overflow-x-hidden">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {feedback}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

