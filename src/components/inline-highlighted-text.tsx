'use client'

import { useMemo } from 'react'

export interface AnalysisItem {
  word: string
  status: 'correct' | 'improvement' | 'wrong'
}

interface InlineHighlightedTextProps {
  text: string
  analysisData?: AnalysisItem[]
}

/**
 * Normalize word for comparison (lowercase, remove punctuation)
 */
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[.,!?;:'"()\[\]{}]/g, '')
}

type Token = {
  content: string
  isWord: boolean
  normalized: string
  wordPart?: string
}

/**
 * Split text into words and punctuation, preserving exact whitespace
 * Handles cases like "Hello, world!" where punctuation is attached to words
 */
function tokenizeText(text: string): Token[] {
  const tokens: Array<{ content: string; isWord: boolean; normalized: string; wordPart?: string }> = []
  
  // Match sequences: whitespace, or word characters with optional trailing punctuation
  // This regex matches: whitespace sequences OR word+punctuation sequences OR standalone punctuation
  let index = 0
  
  while (index < text.length) {
    // Skip whitespace (preserve exactly)
    if (/\s/.test(text[index])) {
      let whitespace = ''
      while (index < text.length && /\s/.test(text[index])) {
        whitespace += text[index]
        index++
      }
      tokens.push({ content: whitespace, isWord: false, normalized: '' })
      continue
    }
    
    // Match a word (letters, numbers, hyphens, apostrophes)
    const wordMatch = text.slice(index).match(/^[\w'-]+/)
    if (wordMatch) {
      const word = wordMatch[0]
      index += word.length
      
      // Check if there's punctuation immediately after (without space)
      let punctuation = ''
      while (index < text.length && !/\s/.test(text[index]) && !/[\w'-]/.test(text[index])) {
        punctuation += text[index]
        index++
      }
      
      // Store the full token (word + attached punctuation)
      const fullContent = word + punctuation
      const normalized = normalizeWord(word)
      tokens.push({ 
        content: fullContent, 
        isWord: true, 
        normalized,
        wordPart: word // Store word part separately for matching
      })
      continue
    }
    
    // Standalone punctuation (no word before it)
    let punctuation = ''
    while (index < text.length && !/\s/.test(text[index]) && !/[\w'-]/.test(text[index])) {
      punctuation += text[index]
      index++
    }
    if (punctuation) {
      tokens.push({ content: punctuation, isWord: false, normalized: '' })
    } else {
      // Safety: advance by one if nothing matched
      tokens.push({ content: text[index] || '', isWord: false, normalized: '' })
      index++
    }
  }
  
  return tokens
}

/**
 * Find matching analysis item for a word (sequential matching)
 */
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

/**
 * Get Tailwind class for word status
 */
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

/**
 * Component that renders text with inline word highlighting based on analysis data
 * 
 * Matching rules:
 * - Case-insensitive word matching
 * - Ignores punctuation when matching
 * - Sequential matching (left to right)
 * - Preserves exact whitespace and punctuation
 */
export function InlineHighlightedText({ text, analysisData = [] }: InlineHighlightedTextProps) {
  const highlightedContent = useMemo(() => {
    // If no analysis data, return plain text
    if (!analysisData || analysisData.length === 0) {
      return <span className="whitespace-pre-wrap">{text}</span>
    }

    // Tokenize text preserving structure
    const tokens = tokenizeText(text)
    const usedIndices = new Set<number>()

    // Build highlighted elements
    const elements: React.ReactNode[] = []
    
    tokens.forEach((token, index) => {
      if (token.isWord && token.normalized) {
        // Try to find matching analysis using the normalized word
        const analysis = findAnalysisForWord(token.normalized, analysisData, usedIndices)
        
        if (analysis) {
          // Highlight this word (but preserve any attached punctuation)
          const className = getStatusClass(analysis.status)
          elements.push(
            <span key={index} className={className}>
              {token.content}
            </span>
          )
        } else {
          // No analysis found, render plain
          elements.push(
            <span key={index}>{token.content}</span>
          )
        }
      } else {
        // Non-word character (punctuation, whitespace) - render as-is
        elements.push(
          <span key={index}>{token.content}</span>
        )
      }
    })

    return <span className="whitespace-pre-wrap leading-relaxed">{elements}</span>
  }, [text, analysisData])

  return <div className="inline-block w-full">{highlightedContent}</div>
}
