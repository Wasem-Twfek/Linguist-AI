'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { Json } from '@/types/supabase'

// ============================================================================
// Types
// ============================================================================

interface VocabularyHint {
  word: string
  translation: string
}

interface GeneratedAssignment {
  title: string
  content: string
  vocabulary_hints: VocabularyHint[]
}

// ============================================================================
// Gemini Configuration
// ============================================================================

/** JSON Schema for structured Gemini assignment generation */
const assignmentGenerationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'A short, engaging title for the lesson in English (3-6 words)'
    },
    content: {
      type: SchemaType.STRING,
      description: 'The English paragraph text (3-5 sentences)'
    },
    vocabulary_hints: {
      type: SchemaType.ARRAY,
      description: '3-5 difficult words with Russian translations',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          word: {
            type: SchemaType.STRING,
            description: 'The English word or phrase'
          },
          translation: {
            type: SchemaType.STRING,
            description: 'Russian translation of the word'
          }
        },
        required: ['word', 'translation']
      }
    }
  },
  required: ['title', 'content', 'vocabulary_hints']
}

/** Build the prompt for assignment generation */
function buildGenerationPrompt(topic: string, level: string): string {
  const levelDescriptions: Record<string, string> = {
    'Beginner': 'simple vocabulary, short sentences, basic grammar (A1-A2 level)',
    'Intermediate': 'moderate vocabulary, compound sentences, varied grammar (B1-B2 level)',
    'Advanced': 'sophisticated vocabulary, complex sentences, advanced grammar (C1-C2 level)'
  }

  const levelDesc = levelDescriptions[level] || levelDescriptions['Intermediate']

  return `You are an expert English language teacher creating reading materials.

TASK: Write a short, engaging paragraph in English about "${topic}" for a ${level} student.

LEVEL REQUIREMENTS (${level}):
- Use ${levelDesc}
- The text should be natural and interesting to read
- Avoid overly complex or archaic vocabulary for lower levels
- For advanced levels, include idiomatic expressions

CONTENT REQUIREMENTS:
- Write exactly 3-5 sentences
- Make the content informative and engaging
- The paragraph should be suitable for a reading practice exercise

VOCABULARY HINTS:
- Extract 3-5 words from YOUR generated text that might be challenging
- Provide accurate Russian translations for each word
- Choose words that are educational for the specified level

Generate a complete lesson with title, content, and vocabulary hints.`
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Generate a new English assignment using Gemini AI
 * CRITICAL: Requires groupId to link assignment to a specific group
 * Students will only see assignments for groups they belong to
 */
export async function generateAssignment(topic: string, level: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Validate user is a teacher
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут создавать задания' }
  }

  // Validate inputs
  if (!topic || topic.trim().length === 0) {
    return { error: 'Тема урока обязательна' }
  }

  const validLevels = ['Beginner', 'Intermediate', 'Advanced']
  if (!validLevels.includes(level)) {
    return { error: 'Неверный уровень сложности' }
  }

  // CRITICAL: Validate group_id is provided and belongs to this teacher
  if (!groupId || groupId.trim().length === 0) {
    return { error: 'Группа обязательна. Выберите группу для задания.' }
  }

  // Verify the group exists, is active, and belongs to this teacher
  const groupQuery = supabase
    .from('study_groups')
    .select('id, created_by')
    .eq('id', groupId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (groupQuery as any).eq('is_active', true).single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  try {
    // Rate limiting: Check requests in last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rateLimitQuery = supabase.from('ai_generation_logs' as any)
    const { count, error: countError } = await rateLimitQuery
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', twoMinutesAgo)

    if (countError) {
      console.error('Error checking rate limit:', countError)
      // Continue on error to avoid blocking legitimate requests
    } else if (count !== null && count >= 3) {
      return { 
        error: 'Слишком много попыток. Подождите немного.', 
        errorType: 'RATE_LIMIT' 
      }
    }

    // Log this generation attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logQuery = supabase.from('ai_generation_logs' as any)
    const { error: logError } = await logQuery
      .insert({
        user_id: user.id,
      })

    if (logError) {
      console.error('Error logging generation attempt:', logError)
      // Continue on error to avoid blocking legitimate requests
    }

    // Initialize Gemini API
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
        responseSchema: assignmentGenerationSchema,
      }
    })

    const prompt = buildGenerationPrompt(topic.trim(), level)

    // Call Gemini API with timeout protection (~20 seconds)
    const timeoutMs = 20000
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    })

    let result
    let response
    let responseText

    try {
      const apiCall = model.generateContent(prompt)
      result = await Promise.race([apiCall, timeoutPromise])
      response = result.response
      responseText = response.text()
    } catch (apiError: unknown) {
      // Handle timeout
      if (apiError instanceof Error && apiError.message === 'TIMEOUT') {
        return { error: 'Превышено время ожидания ответа. Попробуйте снова.', errorType: 'timeout' }
      }

      // Handle 503 / service unavailable
      if (apiError instanceof Error) {
        const errorMsg = apiError.message.toLowerCase()
        if (errorMsg.includes('503') || errorMsg.includes('service unavailable') || errorMsg.includes('overload')) {
          return { error: 'Сервис временно недоступен. Попробуйте через несколько секунд.', errorType: 'service_unavailable' }
        }
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          return { error: 'Ошибка сети. Проверьте подключение к интернету.', errorType: 'network' }
        }
      }

      // Re-throw to be caught by outer catch
      throw apiError
    }

    // Parse response
    let generatedData: GeneratedAssignment
    try {
      generatedData = JSON.parse(responseText)
      
      // Validate structure
      if (!generatedData.title || !generatedData.content || !Array.isArray(generatedData.vocabulary_hints)) {
        throw new Error('Invalid response structure')
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      console.error('Raw response:', responseText)
      return { error: 'Ошибка при генерации урока. Попробуйте снова.', errorType: 'parse' }
    }

    // Insert into database
    // CRITICAL: Include group_id so students in that group can see the assignment
    const { data: assignment, error: insertError } = await supabase
      .from('assignments')
      .insert({
        title: generatedData.title,
        text_content: generatedData.content,
        topic: topic.trim(),
        difficulty_level: level,
        type: 'reading',
        vocabulary_hints: generatedData.vocabulary_hints as unknown as Json,
        created_by: user.id,
        group_id: groupId, // Link assignment to specific group
        is_active: true,
      })
      .select('*')
      .single()

    if (insertError || !assignment) {
      console.error('Error inserting assignment:', insertError)
      return { error: 'Ошибка при сохранении урока', errorType: 'database' }
    }

    revalidatePath('/teacher/dashboard')
    revalidatePath('/student/dashboard') // Students should see new assignments immediately
    
    // Signal student dashboards to refresh (client-side)
    // This is done via revalidatePath, but we also signal for immediate client updates
    
    return { 
      success: true, 
      assignment: assignment,
      title: generatedData.title,
      content: generatedData.content,
      vocabulary_hints: generatedData.vocabulary_hints
    }
  } catch (error) {
    console.error('Error generating assignment:', error)
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
        return { error: 'Превышен лимит запросов. Попробуйте позже.', errorType: 'quota' }
      }
      if (errorMsg.includes('safety')) {
        return { error: 'Контент заблокирован фильтром безопасности. Измените тему.', errorType: 'safety' }
      }
      if (errorMsg.includes('503') || errorMsg.includes('service unavailable') || errorMsg.includes('overload')) {
        return { error: 'Сервис временно недоступен. Попробуйте через несколько секунд.', errorType: 'service_unavailable' }
      }
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
        return { error: 'Ошибка сети. Проверьте подключение к интернету.', errorType: 'network' }
      }
    }
    
    return { error: 'Ошибка при генерации: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'), errorType: 'unknown' }
  }
}

/**
 * Create a manual assignment (not AI-generated)
 * Teacher provides title, topic, level, group, and text content
 */
export async function createManualAssignment(data: {
  title: string
  topic?: string
  level: string
  groupId: string
  textContent: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Validate user is a teacher
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут создавать задания' }
  }

  // Validate inputs with zod-like rules
  if (!data.title || data.title.trim().length < 2) {
    return { error: 'Название должно содержать минимум 2 символа' }
  }

  if (!data.textContent || data.textContent.trim().length < 20) {
    return { error: 'Текст должен содержать минимум 20 символов' }
  }

  if (!data.groupId) {
    return { error: 'Группа обязательна' }
  }

  const validLevels = ['Beginner', 'Intermediate', 'Advanced']
  if (!validLevels.includes(data.level)) {
    return { error: 'Неверный уровень сложности' }
  }

  // Verify the group exists, is active, and belongs to this teacher
  const { data: group } = await supabase
    .from('study_groups')
    .select('id, created_by')
    .eq('id', data.groupId)
    .eq('is_active', true)
    .single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  // Insert assignment
  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      title: data.title.trim(),
      topic: data.topic?.trim() || null,
      difficulty_level: data.level,
      text_content: data.textContent.trim(),
      type: 'reading',
      group_id: data.groupId,
      created_by: user.id,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !assignment) {
    console.error('Error creating manual assignment:', error)
    return { error: 'Ошибка при создании урока' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')

  return {
    success: true,
    assignment: assignment
  }
}

/**
 * Duplicate an assignment to another group
 * Creates a new assignment with same content but different group_id
 */
export async function duplicateAssignmentToGroup(data: {
  sourceAssignmentId: string
  targetGroupId: string
  title?: string
  topic?: string
  level?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Validate user is a teacher
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут копировать задания' }
  }

  // Fetch source assignment
  const { data: sourceAssignment, error: fetchError } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', data.sourceAssignmentId)
    .single()

  if (fetchError || !sourceAssignment) {
    return { error: 'Исходный урок не найден' }
  }

  // Verify teacher owns the source assignment OR owns the target group
  const ownsSource = sourceAssignment.created_by === user.id

  // Verify target group exists and belongs to teacher
  const { data: targetGroup } = await supabase
    .from('study_groups')
    .select('id, created_by')
    .eq('id', data.targetGroupId)
    .eq('is_active', true)
    .single()

  if (!targetGroup) {
    return { error: 'Целевая группа не найдена' }
  }

  const ownsTargetGroup = targetGroup.created_by === user.id

  if (!ownsSource && !ownsTargetGroup) {
    return { error: 'Нет доступа к копированию этого урока' }
  }

  // Validate level if provided
  if (data.level) {
    const validLevels = ['Beginner', 'Intermediate', 'Advanced']
    if (!validLevels.includes(data.level)) {
      return { error: 'Неверный уровень сложности' }
    }
  }

  // Create new assignment with same content
  const { data: newAssignment, error: insertError } = await supabase
    .from('assignments')
    .insert({
      title: data.title?.trim() || sourceAssignment.title || 'Копия урока',
      topic: data.topic?.trim() || sourceAssignment.topic || null,
      difficulty_level: data.level || sourceAssignment.difficulty_level || 'Intermediate',
      text_content: sourceAssignment.text_content,
      type: sourceAssignment.type || 'reading',
      vocabulary_hints: sourceAssignment.vocabulary_hints,
      group_id: data.targetGroupId,
      created_by: user.id,
      is_active: true,
    })
    .select('*')
    .single()

  if (insertError || !newAssignment) {
    console.error('Error duplicating assignment:', insertError)
    return { error: 'Ошибка при копировании урока' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')

  return {
    success: true,
    assignment: newAssignment
  }
}

/**
 * Delete an assignment (soft delete - sets is_active to false)
 * Uses soft delete to preserve student work history (sessions and results)
 */
export async function deleteAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Verify the assignment belongs to this teacher
  const { data: assignment } = await supabase
    .from('assignments')
    .select('created_by, is_active')
    .eq('id', assignmentId)
    .single()

  if (!assignment) {
    return { error: 'Задание не найдено' }
  }

  if (assignment.created_by !== user.id) {
    return { error: 'Нет прав на удаление этого задания' }
  }

  // Soft delete: set is_active to false instead of hard delete
  // This preserves student work history (sessions and results) while hiding the assignment
  const { error } = await supabase
    .from('assignments')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)

  if (error) {
    console.error('Error deleting assignment:', error)
    
    // Provide more specific error message
    if (error.code === '23503') {
      return { error: 'Нельзя удалить задание, так как у студентов есть выполненные работы. Используется мягкое удаление.' }
    }
    
    return { error: 'Ошибка при удалении задания' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')
  return { 
    success: true,
    deletedAssignmentId: assignmentId
  }
}

/**
 * Create a study group
 */
export async function createGroup(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  if (!name || name.trim().length === 0) {
    return { error: 'Название группы обязательно' }
  }

  // CRITICAL: Explicitly set is_active = true for new groups
  // Type assertion needed until types are regenerated after adding is_active column
  const insertPayload = {
    name: name.trim(),
    created_by: user.id,
    is_active: true,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newGroup, error } = await (supabase.from('study_groups').insert(insertPayload as any).select('id, name, description, created_at, is_active').single())

  if (error || !newGroup) {
    console.error('Error creating group:', error)
    return { error: 'Ошибка при создании группы' }
  }

  // Type assertion: after error check, newGroup is guaranteed to be the correct type
  // Cast through unknown to handle Supabase type inference issues
  const group = newGroup as unknown as { id: string; name: string; description: string | null; created_at: string | null; is_active: boolean }

  // Revalidate both dashboard and assignment creation page to update groups lists
  revalidatePath('/teacher/dashboard')
  revalidatePath('/teacher/assignments/create')
  return { 
    success: true,
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      created_at: group.created_at,
      member_count: 0
    }
  }
}

// ============================================================================
// Group Member Management Actions
// ============================================================================

/** Type for group member with profile info */
interface GroupMemberWithProfile {
  id: string
  user_id: string
  joined_at: string | null
  profile: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

/**
 * Get all groups created by the current teacher
 * Includes member count for each group
 */
export async function getTeacherGroups() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Verify teacher role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут управлять группами' }
  }

  // Fetch active groups created by this teacher
  // Include member count via group_members relationship
  // CRITICAL: Filter by is_active = true to exclude soft-deleted groups
  const groupsQuery = supabase
    .from('study_groups')
    .select(`
      id,
      name,
      description,
      created_at,
      group_members (id)
    `)
    .eq('created_by', user.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error } = await (groupsQuery as any).eq('is_active', true).order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching groups:', error)
    return { error: 'Ошибка при загрузке групп' }
  }

  // Transform to include member count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupsWithCount = (groups || []).map((group: any) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    created_at: group.created_at,
    member_count: Array.isArray(group.group_members) ? group.group_members.length : 0
  }))

  return { groups: groupsWithCount }
}

/**
 * Get all members of a specific group
 * Only accessible by the teacher who owns the group
 */
export async function getGroupMembers(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Verify teacher role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут просматривать участников группы' }
  }

  // Verify the group exists, is active, and belongs to this teacher
  const groupQuery2 = supabase
    .from('study_groups')
    .select('id, name, created_by')
    .eq('id', groupId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (groupQuery2 as any).eq('is_active', true).single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  // Fetch group members with profile info including email for fallback display
  // CRITICAL: Fetch both full_name and email so we can display email if name is missing
  // Strategy: Fetch members first, then fetch profiles separately to avoid RLS issues
  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select('id, user_id, joined_at')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: false })

  if (membersError || !membersData) {
    console.error('Error fetching group members:', membersError)
    return { error: 'Ошибка при загрузке участников' }
  }

  // Fetch profiles separately for all user_ids
  // This approach works better with RLS policies
  const userIds = membersData.map(m => m.user_id).filter((id): id is string => id !== null && id !== undefined)
  const profilesMap = new Map<string, { id: string; full_name: string | null; email: string | null }>()

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Continue with empty profiles map - will show email from user_id if available
    } else if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email
        })
      })
    }
  }

  // Combine members with their profiles
  // Filter out members with null user_id and ensure type safety
  const members: GroupMemberWithProfile[] = membersData
    .filter(member => member.user_id !== null && member.user_id !== undefined)
    .map(member => ({
      id: member.id,
      user_id: member.user_id as string, // Safe after filter
      joined_at: member.joined_at,
      profile: profilesMap.get(member.user_id as string) || null
    }))

  return { 
    groupName: group.name,
    members: members
  }
}

/**
 * Add a student to a group by email
 * Only the teacher who owns the group can add members
 */
export async function addStudentToGroup(groupId: string, studentEmail: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Validate input
  if (!studentEmail || !studentEmail.includes('@')) {
    return { error: 'Введите корректный email' }
  }

  // Verify teacher role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут добавлять студентов в группы' }
  }

  // Verify the group belongs to this teacher
  const { data: group } = await supabase
    .from('study_groups')
    .select('id, created_by')
    .eq('id', groupId)
    .single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  // Find the student by email
  // Try multiple approaches for maximum compatibility:
  // 1. First try using database function (if available) - works even without email column in profiles
  // 2. Fallback to querying profiles.email (if email column exists)
  
  let studentProfile: { id: string; role: string } | null = null
  let lookupError: string | null = null

  // Try using database function first (works with auth.users directly)
  try {
    // @ts-expect-error - RPC function may not be in types, need to cast
    const functionResponse = await (supabase.rpc('get_user_by_email', { 
      search_email: studentEmail.toLowerCase() 
    }) as Promise<{ data: Array<{ id: string; role: string; full_name: string | null; email: string }> | null; error: { code?: string; message?: string } | null }>)
    
    if (!functionResponse.error && functionResponse.data && functionResponse.data.length > 0) {
      studentProfile = {
        id: functionResponse.data[0].id,
        role: functionResponse.data[0].role
      }
    } else if (functionResponse.error) {
      // Function doesn't exist or failed - try direct query
      console.log('Function lookup failed, trying direct query:', functionResponse.error.message)
    }
    } catch {
      // Function doesn't exist - continue to fallback
      console.log('Function not available, using fallback method')
    }

  // Fallback: Try querying profiles.email directly
  if (!studentProfile) {
    try {
      // Type assertion needed because email column may not exist in types until migration is run
      const profileResponse = await supabase
        .from('profiles')
        .select('id, role')
        .ilike('email', studentEmail.toLowerCase())
        .single() as unknown as { data: { id: string; role: string } | null; error: { code?: string; message?: string } | null }
      
      const profileData: { id: string; role: string } | null = profileResponse.data
      const profileError: { code?: string; message?: string } | null = profileResponse.error

      if (profileError) {
        // Check if it's a column error (email column doesn't exist)
        const errorMsg = profileError.message || ''
        if (profileError.code === '42703' || errorMsg.includes('column "email" does not exist') || errorMsg.includes('column \'email\' does not exist')) {
          lookupError = 'EMAIL_COLUMN_MISSING'
        } else if (profileError.code === 'PGRST116') {
          lookupError = 'USER_NOT_FOUND'
        } else {
          lookupError = 'QUERY_ERROR'
          console.error('Error looking up student by email:', profileError)
        }
      } else if (profileData) {
        studentProfile = profileData
      }
    } catch (err) {
      lookupError = 'QUERY_ERROR'
      console.error('Error in fallback lookup:', err)
    }
  }

  // Handle errors
  if (lookupError === 'EMAIL_COLUMN_MISSING') {
    return { 
      error: 'Функция поиска по email недоступна. Выполните миграцию: 1) add_email_to_profiles.sql 2) backfill_emails_to_profiles.sql или create_get_user_by_email_function.sql' 
    }
  }

  if (!studentProfile || !studentProfile.id || !studentProfile.role) {
    return { 
      error: `Студент с email "${studentEmail}" не найден. Возможные причины:
1. Студент еще не зарегистрирован
2. Email не сохранен в базе (запустите backfill_emails_to_profiles.sql для существующих пользователей)
3. Email введен с ошибкой (проверьте регистр и пробелы)` 
    }
  }

  if (studentProfile.role !== 'student') {
    return { error: 'Пользователь с таким email не является студентом' }
  }

  // Check if student is already in the group (prevent duplicates)
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', studentProfile.id)
    .single()

  if (existingMember) {
    return { error: 'Студент уже добавлен в эту группу' }
  }

  // Add student to group
  const { data: newMember, error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: studentProfile.id,
      role_in_group: 'student'
    })
    .select('id')
    .single()

  if (insertError || !newMember) {
    console.error('Error adding student to group:', insertError)
    return { error: 'Ошибка при добавлении студента' }
  }

  // Get updated member count
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard') // Student should see updated group assignment visibility
  return { 
    success: true, 
    studentName: studentEmail,
    memberCount: count || 0
  }
}

/**
 * Remove a student from a group
 * Only the teacher who owns the group can remove members
 */
export async function removeStudentFromGroup(groupId: string, memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Verify teacher role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут удалять студентов из групп' }
  }

  // Verify the group belongs to this teacher
  const { data: group } = await supabase
    .from('study_groups')
    .select('id, created_by')
    .eq('id', groupId)
    .single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  // Delete the membership (soft logic - we're just removing the row)
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId) // Extra safety check

  if (deleteError) {
    console.error('Error removing student from group:', deleteError)
    return { error: 'Ошибка при удалении студента из группы' }
  }

  // Get updated member count
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')
  return { 
    success: true,
    memberCount: count || 0
  }
}

/**
 * Delete a study group
 * Only the teacher who owns the group can delete it
 * Deletes group_members first to handle foreign key constraints
 */
export async function deleteGroup(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Verify teacher role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут удалять группы' }
  }

  // Verify the group belongs to this teacher
  const { data: group } = await supabase
    .from('study_groups')
    .select('id, name, created_by')
    .eq('id', groupId)
    .single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет прав на удаление этой группы' }
  }

  // SOFT DELETE: Set is_active = false instead of hard delete
  // This preserves assignments and student history while hiding the group from UI
  // Type assertion needed until types are regenerated after migration
  const { error: updateError } = await supabase
    .from('study_groups')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ is_active: false } as any)
    .eq('id', groupId)

  if (updateError) {
    console.error('Error soft deleting group:', updateError)
    return { error: 'Ошибка при удалении группы' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard') // Update student dashboards to reflect group deletion
  return { 
    success: true, 
    groupName: group.name,
    deletedGroupId: groupId
  }
}

/**
 * Refresh analytics for specific assignments
 * Used by client components to update analytics after results are submitted
 */
export async function refreshAssignmentAnalytics(assignmentIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  // Verify teacher role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут просматривать аналитику' }
  }

  if (assignmentIds.length === 0) {
    return { success: true, analytics: new Map() }
  }

  try {
    const { getAssignmentAnalytics } = await import('@/lib/analytics/getAssignmentAnalytics')
    const analyticsMap = await getAssignmentAnalytics(assignmentIds, user.id)
    return { success: true, analytics: analyticsMap }
  } catch (error) {
    console.error('Error refreshing analytics:', error)
    return { error: 'Ошибка при обновлении аналитики' }
  }
}
