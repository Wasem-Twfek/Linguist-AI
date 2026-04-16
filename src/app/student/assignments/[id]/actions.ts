'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { Json } from '@/types/supabase'
import { 
  MIN_AUDIO_DURATION_SECONDS,
  isValidAudioDuration,
  isValidAudioFileSize
} from '@/lib/validation/audio-validation'

// ============================================================================
// Types
// ============================================================================

/** Word-level analysis from Gemini */
interface WordAnalysisItem {
  word: string
  status: 'correct' | 'improvement' | 'wrong'
}

/** Expected response structure from Gemini API */
interface GeminiEvaluationResponse {
  transcript: string
  overall_score: number
  grammar_score: number
  pronunciation_score: number
  feedback: string
  word_analysis: WordAnalysisItem[]
}

/** Default fallback when Gemini parsing fails */
function createFallbackResponse(originalText: string): GeminiEvaluationResponse {
  const words = originalText.split(/\s+/).filter(w => w.length > 0)
  return {
    transcript: '',
    overall_score: 0,
    grammar_score: 0,
    pronunciation_score: 0,
    feedback: 'Не удалось проанализировать аудио. Пожалуйста, попробуйте записать снова.',
    word_analysis: words.map(word => ({ word, status: 'wrong' as const }))
  }
}

// ============================================================================
// JSON Parsing Utilities
// ============================================================================

/**
 * Robust JSON extraction from text response.
 * Finds the first '{' and last '}' to extract JSON object.
 * Handles markdown code blocks and other wrapper text.
 */
function extractJsonFromText(text: string): string {
  let cleaned = text.trim()
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    // Remove opening code fence (with optional language tag)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '')
    // Remove closing code fence
    cleaned = cleaned.replace(/\n?```\s*$/, '')
    cleaned = cleaned.trim()
  }
  
  // Find first '{' and last '}' for robust extraction
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No valid JSON object found in response')
  }
  
  return cleaned.substring(firstBrace, lastBrace + 1)
}

/**
 * Parse and validate Gemini response with comprehensive error handling.
 */
function parseGeminiResponse(
  text: string, 
  originalText: string
): GeminiEvaluationResponse {
  try {
    const jsonString = extractJsonFromText(text)
    const parsed = JSON.parse(jsonString)
    
    // Validate required fields exist
    if (typeof parsed.transcript !== 'string') {
      throw new Error('Missing or invalid transcript field')
    }
    if (typeof parsed.overall_score !== 'number') {
      throw new Error('Missing or invalid overall_score field')
    }
    if (typeof parsed.grammar_score !== 'number') {
      throw new Error('Missing or invalid grammar_score field')
    }
    if (typeof parsed.pronunciation_score !== 'number') {
      throw new Error('Missing or invalid pronunciation_score field')
    }
    if (!Array.isArray(parsed.word_analysis)) {
      throw new Error('Missing or invalid word_analysis field')
    }
    
    // Validate word_analysis items
    const validStatuses = ['correct', 'improvement', 'wrong']
    for (const item of parsed.word_analysis) {
      if (typeof item.word !== 'string' || !validStatuses.includes(item.status)) {
        throw new Error('Invalid word_analysis item structure')
      }
    }
    
    return {
      transcript: parsed.transcript,
      overall_score: parsed.overall_score,
      grammar_score: parsed.grammar_score,
      pronunciation_score: parsed.pronunciation_score,
      feedback: parsed.feedback || 'Обратная связь не предоставлена',
      word_analysis: parsed.word_analysis
    }
  } catch (error) {
    console.error('JSON parsing failed:', error)
    console.error('Raw response text:', text)
    // Return fallback instead of crashing
    return createFallbackResponse(originalText)
  }
}

// ============================================================================
// Gemini API Configuration
// ============================================================================

/** JSON Schema for structured Gemini output */
const evaluationResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    transcript: {
      type: SchemaType.STRING,
      description: 'The exact transcribed text from the audio'
    },
    overall_score: {
      type: SchemaType.NUMBER,
      description: 'Overall accuracy score from 0-100'
    },
    grammar_score: {
      type: SchemaType.NUMBER,
      description: 'Grammar accuracy score from 0-100'
    },
    pronunciation_score: {
      type: SchemaType.NUMBER,
      description: 'Pronunciation accuracy score from 0-100'
    },
    feedback: {
      type: SchemaType.STRING,
      description: 'Detailed feedback in Russian explaining mistakes'
    },
    word_analysis: {
      type: SchemaType.ARRAY,
      description: 'Word-level analysis for each word in the original text',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          word: {
            type: SchemaType.STRING,
            description: 'The word from the original text'
          },
          status: {
            type: SchemaType.STRING,
            description: 'correct, improvement, or wrong',
            format: 'enum',
            enum: ['correct', 'improvement', 'wrong']
          }
        },
        required: ['word', 'status']
      }
    }
  },
  required: ['transcript', 'overall_score', 'grammar_score', 'pronunciation_score', 'feedback', 'word_analysis']
}

/** Build the evaluation prompt */
function buildEvaluationPrompt(originalText: string): string {
  return `You are an expert English language evaluator. Listen to this audio of a student reading the following text:

"${originalText}"

Evaluate the student's performance across these dimensions:
1. Pronunciation: How accurately are words pronounced?
2. Grammar: Are sentences grammatically correct in spoken form?
3. Fluency: Is the reading smooth and natural?

WORD_ANALYSIS RULES:
- Create an entry for EACH word in the original text, in order
- "correct": Word was pronounced correctly and clearly
- "improvement": Word was mispronounced but recognizable, or had minor issues
- "wrong": Word was skipped, completely mispronounced, or had a major error

SCORING GUIDELINES:
- overall_score: Weighted average considering all factors (0-100)
- grammar_score: Focus on proper word forms and sentence structure (0-100)
- pronunciation_score: Focus on clarity and accuracy of pronunciation (0-100)

FEEDBACK:
- Write detailed feedback IN RUSSIAN
- Explain specific mistakes, pronunciation issues, and suggestions for improvement
- Be encouraging but constructive`
}

// ============================================================================
// Main Action
// ============================================================================

export async function submitAttempt(
  assignmentId: string,
  audioBlob: File | Blob,
  originalText: string,
  audioDurationSeconds?: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  try {
    // CRITICAL: Server-side validation - prevent invalid attempts
    // Validate file size
    if (audioBlob.size === 0) {
      return { error: 'Файл пуст. Невозможно загрузить.' }
    }

    // Validate minimum file size (proxy for duration check)
    if (!isValidAudioFileSize(audioBlob.size)) {
      return { error: `Запись слишком короткая. Минимальная длительность: ${MIN_AUDIO_DURATION_SECONDS} секунд.` }
    }

    // Validate audio duration if provided by client
    if (audioDurationSeconds !== undefined) {
      if (!isValidAudioDuration(audioDurationSeconds)) {
        return { error: `Запись слишком короткая. Минимальная длительность: ${MIN_AUDIO_DURATION_SECONDS} секунд.` }
      }
    }

    // Validate max file size (50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (audioBlob.size > MAX_FILE_SIZE) {
      return { error: 'Файл слишком большой. Максимальный размер: 50MB.' }
    }

    // Rate limit check: Count sessions in the last 60 minutes
    // Uses fail-open strategy: if the check fails due to network issues, allow the request
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    try {
      const { count: sessionCount, error: rateLimitError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo)

      if (rateLimitError) {
        // Log but don't block - fail open for network/transient errors
        console.warn('Rate limit check failed (allowing request):', rateLimitError.message)
      } else if (sessionCount !== null && sessionCount >= 5) {
        return { error: 'Вы исчерпали лимит попыток (5 в час). Пожалуйста, подождите.' }
      }
    } catch (rateLimitException) {
      // Network error or other exception - fail open, don't block legitimate users
      console.warn('Rate limit check threw exception (allowing request):', rateLimitException)
    }

    // Generate timestamp for unique file name
    const timestamp = Date.now()
    const filePath = `${user.id}/${assignmentId}/${timestamp}.webm`

    // Upload audio to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('assignment-audio')
      .upload(filePath, audioBlob, {
        contentType: 'audio/webm',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { error: `Ошибка при загрузке аудио: ${uploadError.message}` }
    }

    // Get public URL of the uploaded file
    const { data: urlData } = supabase.storage
      .from('assignment-audio')
      .getPublicUrl(filePath)

    const audioUrl = urlData.publicUrl

    // Convert audio blob to Base64 for Gemini
    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = audioBlob.type || 'audio/webm'

    // Initialize Google Gemini API
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error(
        'Missing environment variable: GOOGLE_API_KEY. ' +
        'Please set it in your .env.local file. ' +
        'Get your API key from https://aistudio.google.com/app/apikey'
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Configure model with JSON response format
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: evaluationResponseSchema,
      }
    })

    const prompt = buildEvaluationPrompt(originalText)

    // Call Gemini API with audio
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType,
        },
      },
    ])

    const response = result.response
    const responseText = response.text()

    // Parse response with fallback handling
    const geminiData = parseGeminiResponse(responseText, originalText)
    
    // Check if we got a fallback (parsing failed)
    const parsingFailed = geminiData.overall_score === 0 && 
                          geminiData.transcript === '' &&
                          geminiData.feedback.includes('Не удалось проанализировать')

    if (parsingFailed) {
      console.warn('Gemini parsing failed, using fallback response')
      // Delete uploaded audio file since we won't create a session/result
      await supabase.storage
        .from('assignment-audio')
        .remove([filePath])
        .catch(err => console.error('Error cleaning up invalid audio:', err))
      
      return { error: 'Не удалось проанализировать аудио. Пожалуйста, попробуйте записать снова.' }
    }

    // CRITICAL: Additional validation after Gemini analysis
    // If transcript is empty or too short, reject the attempt
    const transcript = geminiData.transcript.trim()
    if (transcript.length === 0) {
      console.warn('Rejecting attempt: empty transcript from Gemini')
      // Delete uploaded audio file
      await supabase.storage
        .from('assignment-audio')
        .remove([filePath])
        .catch(err => console.error('Error cleaning up invalid audio:', err))
      
      return { error: 'Запись слишком короткая или не удалось распознать речь. Минимальная длительность: 3 секунды.' }
    }

    // Clamp scores to 0-100 range
    const overallScore = Math.max(0, Math.min(100, Math.round(geminiData.overall_score)))
    const grammarScore = Math.max(0, Math.min(100, Math.round(geminiData.grammar_score)))
    const pronunciationScore = Math.max(0, Math.min(100, Math.round(geminiData.pronunciation_score)))
    const feedback = geminiData.feedback
    const wordAnalysis = geminiData.word_analysis

    // Calculate word stats from word_analysis
    const words_total = wordAnalysis.length
    const words_correct = wordAnalysis.filter(w => w.status === 'correct').length
    const words_incorrect = wordAnalysis.filter(w => w.status === 'wrong').length

    // Get attempt number (count existing COMPLETED sessions only - those with results)
    // This ensures attempt numbers are sequential for valid attempts only
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('assignment_id', assignmentId)

    if (!existingSessions) {
      return { error: 'Ошибка при проверке предыдущих попыток' }
    }

    // Count only sessions that have results (valid completed attempts)
    const { data: existingResults } = await supabase
      .from('results')
      .select('session_id')
      .in('session_id', existingSessions.map(s => s.id))

    // Attempt number = count of valid completed attempts + 1
    const attemptNumber = (existingResults?.length || 0) + 1

    // Create session record - ONLY after all validations pass
    const startedAt = new Date().toISOString()
    const finishedAt = new Date().toISOString()
    
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        assignment_id: assignmentId,
        audio_url: audioUrl,
        attempt_number: attemptNumber,
        started_at: startedAt,
        finished_at: finishedAt,
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError)
      // Clean up uploaded audio if session creation fails
      await supabase.storage
        .from('assignment-audio')
        .remove([filePath])
        .catch(err => console.error('Error cleaning up audio after session creation failure:', err))
      
      return { error: 'Ошибка при создании сессии' }
    }

    // CRITICAL: Create result record ONLY if session was created successfully
    // Results are only created for valid, completed attempts
    const { error: resultError } = await supabase
      .from('results')
      .insert({
        session_id: session.id,
        overall_score: overallScore,
        words_total: words_total,
        words_correct: words_correct,
        words_incorrect: words_incorrect,
        pronunciation_score: pronunciationScore,
        grammar_score: grammarScore,
        coherence_score: overallScore, // Using overall score as coherence for now
        feedback: feedback,
        analysis_data: wordAnalysis as unknown as Json,
      })

    if (resultError) {
      console.error('Error creating result:', resultError)
      // If result creation fails, we should ideally clean up the session too
      // But for data integrity, we'll leave the session (it just won't have a result)
      // Analytics will automatically exclude it since it has no result
      return { error: 'Ошибка при сохранении результата' }
    }

    revalidatePath(`/student/assignments/${assignmentId}`)
    revalidatePath('/student/dashboard')
    revalidatePath('/teacher/dashboard')

    return { 
      success: true, 
      score: overallScore, 
      transcript, 
      feedback,
      grammarScore,
      pronunciationScore,
      wordAnalysis 
    }
  } catch (error) {
    console.error('Error submitting attempt:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return { error: 'Ошибка API ключа. Проверьте конфигурацию.' }
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return { error: 'Превышен лимит запросов. Попробуйте позже.' }
      }
      if (error.message.includes('SAFETY')) {
        return { error: 'Контент заблокирован фильтром безопасности. Попробуйте записать снова.' }
      }
    }
    
    return { error: 'Произошла ошибка при отправке: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка') }
  }
}
