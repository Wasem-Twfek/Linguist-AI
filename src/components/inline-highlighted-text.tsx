'use client'

import { useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react'

import { speak, stop } from '@/utils/tts'

export interface AnalysisItem {
  word: string
  status: 'correct' | 'improvement' | 'wrong'
}

interface InlineHighlightedTextProps {
  text: string
  analysisData?: AnalysisItem[]
  enableWordPlayback?: boolean
  wordPlaybackLang?: string
}

type Token = {
  content: string
  isWord: boolean
  normalized: string
  start: number
  end: number
  wordPart?: string
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[.,!?;:'"()[\]{}]/g, '')
}

function cleanWordForSpeech(word: string): string {
  return word
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim()
}

function tokenizeText(text: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < text.length) {
    const start = index

    if (/\s/.test(text[index])) {
      let whitespace = ''
      while (index < text.length && /\s/.test(text[index])) {
        whitespace += text[index]
        index++
      }
      tokens.push({ content: whitespace, isWord: false, normalized: '', start, end: index })
      continue
    }

    const wordMatch = text.slice(index).match(/^[\p{L}\p{N}'-]+/u)
    if (wordMatch) {
      const word = wordMatch[0]
      index += word.length

      let punctuation = ''
      while (index < text.length && !/\s/.test(text[index]) && !/[\p{L}\p{N}'-]/u.test(text[index])) {
        punctuation += text[index]
        index++
      }

      tokens.push({
        content: word + punctuation,
        isWord: true,
        normalized: normalizeWord(word),
        start,
        end: index,
        wordPart: word,
      })
      continue
    }

    let punctuation = ''
    while (index < text.length && !/\s/.test(text[index]) && !/[\p{L}\p{N}'-]/u.test(text[index])) {
      punctuation += text[index]
      index++
    }

    if (punctuation) {
      tokens.push({ content: punctuation, isWord: false, normalized: '', start, end: index })
    } else {
      tokens.push({ content: text[index] || '', isWord: false, normalized: '', start, end: index + 1 })
      index++
    }
  }

  return tokens
}

function findAnalysisForWord(
  normalizedWord: string,
  analysisData: AnalysisItem[],
  usedIndices: Set<number>
): AnalysisItem | null {
  for (let i = 0; i < analysisData.length; i++) {
    if (usedIndices.has(i)) continue

    const normalizedAnalysis = normalizeWord(analysisData[i].word)
    if (normalizedAnalysis === normalizedWord) {
      usedIndices.add(i)
      return analysisData[i]
    }
  }

  return null
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'correct':
      return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
    case 'improvement':
      return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
    case 'wrong':
      return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 line-through'
    default:
      return ''
  }
}

function getTokenKey(token: Token): string {
  const type = token.isWord ? 'word' : 'text'
  return `${type}:${token.start}-${token.end}:${token.content}`
}

function SpeakableWord({
  token,
  className,
  lang,
}: {
  token: Token
  className?: string
  lang: string
}) {
  const spokenWord = cleanWordForSpeech(token.wordPart || token.content)

  const playWord = () => {
    if (!spokenWord) return

    stop()
    speak(spokenWord, lang)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    playWord()
  }

  if (!spokenWord) {
    return <span className={className} translate="no">{token.content}</span>
  }

  return (
    <button
      type="button"
      onClick={playWord}
      onKeyDown={handleKeyDown}
      title={spokenWord}
      translate="no"
      aria-label={`Прослушать слово ${spokenWord}`}
      className={[
        className,
        'inline-flex rounded-sm border-0 bg-transparent px-0.5 text-left font-[inherit] text-[inherit] align-baseline transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 break-words whitespace-normal',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {token.content}
    </button>
  )
}

export function InlineHighlightedText({
  text,
  analysisData = [],
  enableWordPlayback = false,
  wordPlaybackLang = 'en-US',
}: InlineHighlightedTextProps) {
  useEffect(() => {
    return () => {
      if (enableWordPlayback) {
        stop()
      }
    }
  }, [enableWordPlayback])

  const highlightedContent = useMemo(() => {
    if (!enableWordPlayback && (!analysisData || analysisData.length === 0)) {
      return <div className="whitespace-pre-wrap break-words w-full" translate="no">{text}</div>
    }

    const tokens = tokenizeText(text)
    const usedIndices = new Set<number>()
    const elements: ReactNode[] = []

    tokens.forEach((token) => {
      const key = getTokenKey(token)

      if (token.isWord && token.normalized) {
        const analysis = findAnalysisForWord(token.normalized, analysisData, usedIndices)
        const className = analysis ? getStatusClass(analysis.status) : undefined

        elements.push(
          enableWordPlayback ? (
            <SpeakableWord
              key={key}
              token={token}
              className={className}
              lang={wordPlaybackLang}
            />
          ) : (
            <span key={key} className={className} translate="no">
              {token.content}
            </span>
          )
        )
        return
      }

      elements.push(<span key={key} translate="no">{token.content}</span>)
    })

    return <div className="whitespace-pre-wrap break-words leading-relaxed w-full inline" translate="no">{elements}</div>
  }, [text, analysisData, enableWordPlayback, wordPlaybackLang])

  return <div className="block w-full min-w-0 break-words" translate="no">{highlightedContent}</div>
}
