'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { Json } from '@/types/supabase'
import { 
  MIN_AUDIO_DURATION_SECONDS,
  isValidAudioDuration,
  isValidAudioFileSize
} from '@/lib/validation/audio-validation'
interface WordAnalysisItem {
  word: string
  status: 'correct' | 'improvement' | 'wrong'
}

interface GeminiEvaluationResponse {
  transcript: string
  overall_score: number
  grammar_score: number
  pronunciation_score: number
  feedback: string
  word_analysis: WordAnalysisItem[]
}

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

function extractJsonFromText(text: string): string {
  let cleaned = text.trim()
  
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '')
    cleaned = cleaned.replace(/\n?```\s*$/, '')
    cleaned = cleaned.trim()
  }
  
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No valid JSON object found in response')
  }
  
  return cleaned.substring(firstBrace, lastBrace + 1)
}

function parseGeminiResponse(
  text: string, 
  originalText: string
): GeminiEvaluationResponse {
  try {
    const jsonString = extractJsonFromText(text)
    const parsed = JSON.parse(jsonString)
    
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
    return createFallbackResponse(originalText)
  }
}
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

async function getAuthorizedStudentAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  assignmentId: string
) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError || profile?.role !== 'student') {
    return { error: 'Доступ запрещен' as const }
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, group_id, text_content')
    .eq('id', assignmentId)
    .eq('is_active', true)
    .single()

  if (assignmentError || !assignment || !assignment.group_id) {
    return { error: 'Задание недоступно' as const }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', assignment.group_id)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Задание недоступно' as const }
  }

  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .select('id')
    .eq('id', assignment.group_id)
    .eq('is_active', true)
    .single()

  if (groupError || !group) {
    return { error: 'Задание недоступно' as const }
  }

  const assignmentText = assignment.text_content?.trim()

  if (!assignmentText) {
    return { error: 'Текст задания недоступен' as const }
  }

  return {
    assignment: {
      id: assignment.id,
      text: assignmentText,
    },
  }
}

async function checkAssignmentAudioObjectExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  audioPath: string
) {
  const lastSlashIndex = audioPath.lastIndexOf('/')
  const folderPath = lastSlashIndex === -1 ? '' : audioPath.slice(0, lastSlashIndex)
  const fileName = lastSlashIndex === -1 ? audioPath : audioPath.slice(lastSlashIndex + 1)

  const { data, error } = await supabase.storage
    .from('assignment-audio')
    .list(folderPath, {
      limit: 1,
      search: fileName,
    })

  return {
    exists: data?.some((object) => object.name === fileName) ?? false,
    error,
  }
}

export async function submitAttempt(
  assignmentId: string,
  audioBlob: File | Blob,
  _originalText: string,
  audioDurationSeconds?: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  try {
    const accessResult = await getAuthorizedStudentAssignment(supabase, user.id, assignmentId)

    if ('error' in accessResult) {
      return { error: accessResult.error }
    }

    const originalText = accessResult.assignment.text

    if (audioBlob.size === 0) {
      return { error: 'Файл пуст. Невозможно загрузить.' }
    }

    if (!isValidAudioFileSize(audioBlob.size)) {
      return { error: 'Файл аудиозаписи слишком маленький или пустой. Попробуйте записать речь еще раз.' }
    }

    if (audioDurationSeconds !== undefined) {
      if (!isValidAudioDuration(audioDurationSeconds)) {
        return { error: `Запись слишком короткая. Минимальная длительность: ${MIN_AUDIO_DURATION_SECONDS} секунд.` }
      }
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (audioBlob.size > MAX_FILE_SIZE) {
      return { error: 'Файл слишком большой. Максимальный размер: 50MB.' }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    try {
      const { count: sessionCount, error: rateLimitError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo)

      if (rateLimitError) {
        console.warn('Rate limit check failed (allowing request):', rateLimitError.message)
      } else if (sessionCount !== null && sessionCount >= 5) {
        return { error: 'Вы исчерпали лимит попыток (5 в час). Пожалуйста, подождите.' }
      }
    } catch (rateLimitException) {
      console.warn('Rate limit check threw exception (allowing request):', rateLimitException)
    }

    const timestamp = Date.now()
    const audioPath = `${user.id}/${assignmentId}/${timestamp}.webm`
    const audioContentType = audioBlob.type?.trim() || 'audio/webm'

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assignment-audio')
      .upload(audioPath, audioBlob, {
        contentType: audioContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Assignment audio upload error:', {
        audioPath,
        message: uploadError.message,
      })
      return { error: 'Не удалось загрузить аудио. Попробуйте еще раз позже.' }
    }

    if (uploadData?.path && uploadData.path !== audioPath && process.env.NODE_ENV !== 'production') {
      console.warn('Assignment audio upload returned a different path than requested:', {
        requestedPath: audioPath,
        returnedPath: uploadData.path,
      })
    }

    const savedAudioPath = audioPath
    const storageCheckClient = createAdminClient() ?? supabase
    const storageObjectCheck = await checkAssignmentAudioObjectExists(storageCheckClient, savedAudioPath)

    if (process.env.NODE_ENV !== 'production') {
      console.info('Assignment audio upload path check:', {
        audioPath: savedAudioPath,
        storageObjectExists: storageObjectCheck.exists,
        storageObjectCheckError: storageObjectCheck.error?.message ?? null,
      })
    }

    if (storageObjectCheck.error || !storageObjectCheck.exists) {
      await supabase.storage
        .from('assignment-audio')
        .remove([savedAudioPath])
        .catch(err => console.error('Error cleaning up missing audio object:', err))

      return { error: 'ÐÑƒÐ´Ð¸Ð¾ Ð½Ðµ Ð±Ñ‹Ð»Ð¾ Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾ Ð² Ñ…Ñ€Ð°Ð½Ð¸Ð»Ð¸Ñ‰Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð·Ð°Ð³Ñ€ÑƒÐ·ÐºÐ¸. ÐŸÐ¾Ð¿Ñ€Ð¾Ð±ÑƒÐ¹Ñ‚Ðµ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ñ‚ÑŒ Ð·Ð°Ð¿Ð¸ÑÑŒ ÑÐ½Ð¾Ð²Ð°.' }
    }

    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = audioContentType

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error(
        'Missing environment variable: GOOGLE_API_KEY. ' +
        'Please set it in your .env.local file. ' +
        'Get your API key from https://aistudio.google.com/app/apikey'
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: evaluationResponseSchema,
      }
    })

    const prompt = buildEvaluationPrompt(originalText)

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

    const geminiData = parseGeminiResponse(responseText, originalText)
    
    const parsingFailed = geminiData.overall_score === 0 && 
                          geminiData.transcript === '' &&
                          geminiData.feedback.includes('Не удалось проанализировать')

    if (parsingFailed) {
      console.warn('Gemini parsing failed, using fallback response')
      await supabase.storage
        .from('assignment-audio')
        .remove([savedAudioPath])
        .catch(err => console.error('Error cleaning up invalid audio:', err))
      
      return { error: 'Не удалось проанализировать аудио. Пожалуйста, попробуйте записать снова.' }
    }

    const transcript = geminiData.transcript.trim()
    if (transcript.length === 0) {
      console.warn('Rejecting attempt: empty transcript from Gemini')
      await supabase.storage
        .from('assignment-audio')
        .remove([savedAudioPath])
        .catch(err => console.error('Error cleaning up invalid audio:', err))
      
      return { error: 'Запись слишком короткая или не удалось распознать речь. Минимальная длительность: 3 секунды.' }
    }

    const overallScore = Math.max(0, Math.min(100, Math.round(geminiData.overall_score)))
    const grammarScore = Math.max(0, Math.min(100, Math.round(geminiData.grammar_score)))
    const pronunciationScore = Math.max(0, Math.min(100, Math.round(geminiData.pronunciation_score)))
    const feedback = geminiData.feedback
    const wordAnalysis = geminiData.word_analysis

    const words_total = wordAnalysis.length
    const words_correct = wordAnalysis.filter(w => w.status === 'correct').length
    const words_incorrect = wordAnalysis.filter(w => w.status === 'wrong').length

    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('assignment_id', assignmentId)

    if (!existingSessions) {
      return { error: 'Ошибка при проверке предыдущих попыток' }
    }

    const { data: existingResults } = await supabase
      .from('results')
      .select('session_id')
      .in('session_id', existingSessions.map(s => s.id))

    const attemptNumber = (existingResults?.length || 0) + 1

    const startedAt = new Date().toISOString()
    const finishedAt = new Date().toISOString()
    
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        assignment_id: assignmentId,
        audio_path: savedAudioPath,
        audio_url: null,
        attempt_number: attemptNumber,
        started_at: startedAt,
        finished_at: finishedAt,
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError)
      await supabase.storage
        .from('assignment-audio')
        .remove([savedAudioPath])
        .catch(err => console.error('Error cleaning up audio after session creation failure:', err))
      
      return { error: 'Ошибка при создании сессии' }
    }

    const { data: savedResult, error: resultError } = await supabase
      .from('results')
      .insert({
        session_id: session.id,
        overall_score: overallScore,
        words_total: words_total,
        words_correct: words_correct,
        words_incorrect: words_incorrect,
        pronunciation_score: pronunciationScore,
        grammar_score: grammarScore,
        coherence_score: overallScore,
        feedback: feedback,
        analysis_data: wordAnalysis as unknown as Json,
      })
      .select('*')
      .single()

    if (resultError || !savedResult) {
      console.error('Error creating result:', resultError)
      return { error: 'Ошибка при сохранении результата' }
    }

    revalidatePath(`/student/assignments/${assignmentId}`)
    revalidatePath(`/student/results/${savedResult.id}`)
    revalidatePath('/student/dashboard')
    revalidatePath('/teacher/dashboard')

    return { 
      success: true, 
      resultId: savedResult.id,
      result: savedResult,
      score: overallScore, 
      transcript, 
      feedback,
      grammarScore,
      pronunciationScore,
      wordAnalysis 
    }
  } catch (error) {
    console.error('Error submitting attempt:', error)
    return { error: 'Не удалось отправить попытку. Попробуйте еще раз позже.' }
  }
}
