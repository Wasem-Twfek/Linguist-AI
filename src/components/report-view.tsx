'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, FileText, Headphones, Info, Mic2, RotateCcw, Volume2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SmartBackButton } from '@/components/smart-back-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineHighlightedText, type AnalysisItem } from '@/components/inline-highlighted-text'
import { TTSButton } from '@/components/tts-button'
import type { Database } from '@/types/supabase'

type Result = Database['public']['Tables']['results']['Row']

type ReportAssignment = {
  id?: string | null
  title?: string | null
  text_content?: string | null
  type?: string | null
} | null

type ReportSession = {
  assignment_id?: string | null
  audio_path?: string | null
  audio_url?: string | null
  attempt_number?: number | null
  finished_at?: string | null
  started_at?: string | null
} | null

type ReportViewProps = {
  result: Result
  assignment?: ReportAssignment
  session?: ReportSession
  originalText?: string | null
  assignmentTitle?: string | null
  audioPlaybackUrl?: string | null
  audioObjectMissing?: boolean
  backHref?: string
  backLabel?: string
  retryHref?: string | null
  compact?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeScore(score: number | null | undefined): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

function formatDate(value: string | null | undefined) {
  if (!value) return null

  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseWordAnalysis(input: unknown): AnalysisItem[] {
  if (!Array.isArray(input)) return []

  return input.filter(
    (item): item is AnalysisItem =>
      isRecord(item) &&
      typeof item.word === 'string' &&
      (item.status === 'correct' || item.status === 'improvement' || item.status === 'wrong')
  )
}

function getFluencyScore(input: unknown): number | null {
  if (!isRecord(input)) return null

  const rawScore = input.fluency_score ?? input.fluencyScore
  return normalizeScore(typeof rawScore === 'number' ? rawScore : null)
}

function ScoreBox({ label, score }: { label: string; score: number | null }) {
  const colorClass =
    score === null
      ? 'border-muted bg-muted/30'
    : score >= 80
        ? 'border-green-200 bg-green-50 text-green-900'
        : score >= 60
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-red-200 bg-red-50 text-red-900'

  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {score === null ? 'Нет данных' : `${score}%`}
      </p>
    </div>
  )
}

function statusLabel(status: AnalysisItem['status']) {
  if (status === 'wrong') return 'Ошибка'
  if (status === 'improvement') return 'Нужно улучшить'
  return 'Верно'
}

function statusClass(status: AnalysisItem['status']) {
  if (status === 'wrong') {
    return 'border-red-200 bg-red-50 text-red-800'
  }

  if (status === 'improvement') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  return 'border-green-200 bg-green-50 text-green-800'
}

export function ReportView({
  result,
  assignment,
  session,
  originalText,
  assignmentTitle,
  audioPlaybackUrl,
  audioObjectMissing = false,
  backHref,
  backLabel = 'Назад',
  retryHref,
  compact = false,
}: ReportViewProps) {
  const text = originalText ?? assignment?.text_content ?? null
  const title = assignmentTitle ?? assignment?.title ?? 'Без названия'
  const submittedAt = formatDate(result.created_at ?? session?.finished_at ?? session?.started_at)
  const wordAnalysis = parseWordAnalysis(result.analysis_data)
  const mistakes = wordAnalysis.filter((item) => item.status === 'wrong' || item.status === 'improvement')
  const fluencyScore = getFluencyScore(result.analysis_data)

  const overallScore = normalizeScore(result.overall_score)
  const pronunciationScore = normalizeScore(result.pronunciation_score)
  const grammarScore = normalizeScore(result.grammar_score)
  const hasStoredAudioPath = Boolean(session?.audio_path || session?.audio_url)
  const hasPlayableAudio = Boolean(audioPlaybackUrl && audioPlaybackUrl.trim())
  const [failedAudioUrl, setFailedAudioUrl] = useState<string | null>(null)
  const audioLoadError = hasPlayableAudio && failedAudioUrl === audioPlaybackUrl

  return (
    <div className={compact ? 'space-y-5' : 'mx-auto max-w-7xl space-y-6'}>
      {!compact && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AI-отчет по произношению</h1>
            <p className="mt-1 text-muted-foreground">{title}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:self-start">
            {backHref ? (
              <SmartBackButton
                fallbackHref={backHref}
                label={backLabel}
                className="w-full shrink-0 sm:w-auto"
              />
            ) : null}
            {retryHref ? (
              <Button asChild className="w-full rounded-full sm:w-auto">
                <Link href={retryHref}>
                  <RotateCcw className="h-4 w-4" />
                  Пересдать задание
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Общий результат
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[240px,1fr]">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">Общий балл</p>
            <p className="mt-3 text-5xl font-bold text-foreground">
              {overallScore === null ? 'Нет данных' : `${overallScore}%`}
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">Статус: выполнено</Badge>
              {submittedAt && (
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {submittedAt}
                </Badge>
              )}
              {session?.attempt_number && (
                <Badge variant="outline">Попытка {session.attempt_number}</Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Отчет сформирован по сохраненным данным анализа. Если отдельные оценки отсутствуют в базе, они не отображаются.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Детальные оценки</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ScoreBox label="Произношение" score={pronunciationScore} />
          <ScoreBox label="Грамматика" score={grammarScore} />
          {fluencyScore !== null && <ScoreBox label="Беглость" score={fluencyScore} />}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Обратная связь</CardTitle>
        </CardHeader>
        <CardContent>
          {result.feedback ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{result.feedback}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Обратная связь отсутствует.</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Ошибки и рекомендации</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {wordAnalysis.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border p-3">
                <p className="text-sm text-muted-foreground">Всего слов</p>
                <p className="mt-1 text-2xl font-semibold">{result.words_total ?? wordAnalysis.length}</p>
              </div>
              <div className="rounded-2xl border p-3">
                <p className="text-sm text-muted-foreground">Правильно</p>
                <p className="mt-1 text-2xl font-semibold">{result.words_correct ?? wordAnalysis.filter((item) => item.status === 'correct').length}</p>
              </div>
              <div className="rounded-2xl border p-3">
                <p className="text-sm text-muted-foreground">Ошибки</p>
                <p className="mt-1 text-2xl font-semibold">{result.words_incorrect ?? wordAnalysis.filter((item) => item.status === 'wrong').length}</p>
              </div>
            </div>
          )}

          {mistakes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mistakes.map((item, index) => (
                <span
                  key={`mistake:${item.status}:${item.word}:${index}`}
                  className={`rounded-full border px-3 py-1 text-sm ${statusClass(item.status)}`}
                >
                  {item.word} · {statusLabel(item.status)}
                </span>
              ))}
            </div>
          ) : wordAnalysis.length > 0 ? (
            <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <Info className="mt-0.5 h-4 w-4" />
              Ошибки в анализе слов не обнаружены.
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Детальный список ошибок отсутствует в данных анализа.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)] w-full">
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Исходный текст
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full min-w-0 space-y-4">
            {text ? (
              <>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Volume2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Нажмите на слово, чтобы прослушать его произношение.</span>
                </div>
                <div className="w-full overflow-x-hidden rounded-2xl border border-border bg-secondary/70 p-4 text-base leading-relaxed break-words">
                  <InlineHighlightedText
                    text={text}
                    analysisData={wordAnalysis.length > 0 ? wordAnalysis : undefined}
                    enableWordPlayback
                    wordPlaybackLang="en-US"
                  />
                </div>
                <TTSButton text={text} lang="en-US" variant="outline" size="sm" label="Прослушать текст" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Текст задания недоступен.</p>
            )}
          </CardContent>
        </Card>

        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic2 className="h-5 w-5" />
              Отправленная попытка
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full min-w-0 space-y-4">
            {hasPlayableAudio && !audioLoadError ? (
              <>
                <audio
                  controls
                  preload="metadata"
                  src={audioPlaybackUrl ?? undefined}
                  className="w-full"
                  onError={(event) => {
                    if (process.env.NODE_ENV !== 'production') {
                      const audio = event.currentTarget
                      console.info('Report audio element failed to load:', {
                        errorCode: audio.error?.code ?? null,
                        networkState: audio.networkState,
                        readyState: audio.readyState,
                        currentSrc: audio.currentSrc,
                      })
                    }

                    setFailedAudioUrl(audioPlaybackUrl ?? null)
                  }}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Headphones className="h-4 w-4" />
                  Можно прослушать отправленную аудиозапись.
                </div>
              </>
            ) : audioLoadError ? (
              <p className="text-sm text-muted-foreground">Не удалось загрузить аудиозапись.</p>
            ) : audioObjectMissing ? (
              <p className="text-sm text-muted-foreground">Аудиозапись не найдена. Возможно, файл был удален или не был загружен.</p>
            ) : hasStoredAudioPath ? (
              <p className="text-sm text-muted-foreground">Аудиозапись для этой попытки недоступна.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Аудиозапись для этой попытки отсутствует.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
