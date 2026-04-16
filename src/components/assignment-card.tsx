'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FeedbackModal } from '@/components/feedback-modal'
import { Database } from '@/types/supabase'

type Assignment = Database['public']['Tables']['assignments']['Row']
type Result = Database['public']['Tables']['results']['Row']
type Session = Database['public']['Tables']['sessions']['Row']

interface AssignmentCardProps {
  assignment: Assignment
  result?: Result
  session?: Session
}

export function AssignmentCard({ assignment, result }: AssignmentCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const isCompleted = !!result
  const score = result?.overall_score

  const getTypeLabel = (type: string | null) => {
    if (type === 'reading') return 'Чтение'
    if (type === 'essay') return 'Эссе'
    return type || 'Не указано'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{assignment.title || 'Без названия'}</CardTitle>
              <CardDescription>
                Тип: {getTypeLabel(assignment.type)}
              </CardDescription>
            </div>
            {isCompleted && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-md">
                Выполнено
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isCompleted && score !== null && (
            <div className="p-2 bg-muted rounded-md">
              <p className="text-sm font-medium">
                Результат: {score}%
              </p>
            </div>
          )}
          <div className="flex gap-2">
            {isCompleted && (
              <Button
                variant="default"
                onClick={() => setModalOpen(true)}
                className="flex-1"
              >
                Посмотреть отчет
              </Button>
            )}
            <Button 
              className={isCompleted ? "flex-1" : "w-full"} 
              asChild
              variant={isCompleted ? 'outline' : 'default'}
            >
              <Link href={`/student/assignments/${assignment.id}`}>
                {isCompleted ? 'Пересдать' : 'Начать'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <FeedbackModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        result={result || null}
        originalText={assignment.text_content}
      />
    </>
  )
}

