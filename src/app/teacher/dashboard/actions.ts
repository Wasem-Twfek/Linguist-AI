'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { Json } from '@/types/supabase'
interface VocabularyHint {
  word: string
  translation: string
}

interface GeneratedAssignment {
  title: string
  content: string
  vocabulary_hints: VocabularyHint[]
}
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

export async function generateAssignment(topic: string, level: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут создавать задания' }
  }

  if (!topic || topic.trim().length === 0) {
    return { error: 'Тема урока обязательна' }
  }

  const validLevels = ['Beginner', 'Intermediate', 'Advanced']
  if (!validLevels.includes(level)) {
    return { error: 'Неверный уровень сложности' }
  }

  if (!groupId || groupId.trim().length === 0) {
    return { error: 'Группа обязательна. Выберите группу для задания.' }
  }

  const { data: group } = await supabase
    .from('study_groups')
    .select('id, created_by')
    .eq('id', groupId)
    .eq('is_active', true)
    .single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('ai_generation_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', twoMinutesAgo)

    if (countError) {
      console.error('Error checking rate limit:', countError)
    } else if (count !== null && count >= 3) {
      return { 
        error: 'Слишком много попыток. Подождите немного.', 
        errorType: 'RATE_LIMIT' 
      }
    }

    const { error: logError } = await supabase
      .from('ai_generation_logs')
      .insert({
        user_id: user.id,
      })

    if (logError) {
      console.error('Error logging generation attempt:', logError)
    }

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
      if (apiError instanceof Error && apiError.message === 'TIMEOUT') {
        return { error: 'Превышено время ожидания ответа. Попробуйте снова.', errorType: 'timeout' }
      }

      if (apiError instanceof Error) {
        const errorMsg = apiError.message.toLowerCase()
        if (errorMsg.includes('503') || errorMsg.includes('service unavailable') || errorMsg.includes('overload')) {
          return { error: 'Сервис временно недоступен. Попробуйте через несколько секунд.', errorType: 'service_unavailable' }
        }
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          return { error: 'Ошибка сети. Проверьте подключение к интернету.', errorType: 'network' }
        }
      }

      throw apiError
    }

    let generatedData: GeneratedAssignment
    try {
      generatedData = JSON.parse(responseText)
      
      if (!generatedData.title || !generatedData.content || !Array.isArray(generatedData.vocabulary_hints)) {
        throw new Error('Invalid response structure')
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      console.error('Raw response:', responseText)
      return { error: 'Ошибка при генерации урока. Попробуйте снова.', errorType: 'parse' }
    }

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
        group_id: groupId,
        is_active: true,
      })
      .select('*')
      .single()

    if (insertError || !assignment) {
      console.error('Error inserting assignment:', insertError)
      return { error: 'Ошибка при сохранении урока', errorType: 'database' }
    }

    revalidatePath('/teacher/dashboard')
    revalidatePath('/student/dashboard')
    
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут создавать задания' }
  }

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут копировать задания' }
  }

  const { data: sourceAssignment, error: fetchError } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', data.sourceAssignmentId)
    .single()

  if (fetchError || !sourceAssignment) {
    return { error: 'Исходный урок не найден' }
  }

  const ownsSource = sourceAssignment.created_by === user.id

  if (!ownsSource) {
    return { error: '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044e \u044d\u0442\u043e\u0433\u043e \u0443\u0440\u043e\u043a\u0430' }
  }

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

  if (!ownsTargetGroup) {
    return { error: 'Нет доступа к копированию этого урока' }
  }

  if (data.level) {
    const validLevels = ['Beginner', 'Intermediate', 'Advanced']
    if (!validLevels.includes(data.level)) {
      return { error: 'Неверный уровень сложности' }
    }
  }

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

export async function deleteAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

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

  const { error } = await supabase
    .from('assignments')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)

  if (error) {
    console.error('Error deleting assignment:', error)
    
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

export async function createGroup(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: '\u0422\u043e\u043b\u044c\u043a\u043e \u0443\u0447\u0438\u0442\u0435\u043b\u044f \u043c\u043e\u0433\u0443\u0442 \u0441\u043e\u0437\u0434\u0430\u0432\u0430\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u044b' }
  }

  if (!name || name.trim().length === 0) {
    return { error: 'Название группы обязательно' }
  }

  const { data: newGroup, error } = await supabase
    .from('study_groups')
    .insert({
      name: name.trim(),
      created_by: user.id,
      is_active: true,
    })
    .select('id, name, description, created_at, is_active')
    .single()

  if (error || !newGroup) {
    console.error('Error creating group:', error)
    return { error: 'Ошибка при создании группы' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/teacher/assignments/create')
  return { 
    success: true,
    group: {
      id: newGroup.id,
      name: newGroup.name,
      description: newGroup.description,
      created_at: newGroup.created_at,
      member_count: 0
    }
  }
}

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

export async function getTeacherGroups() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут управлять группами' }
  }

  const { data: groups, error } = await supabase
    .from('study_groups')
    .select(`
      id,
      name,
      description,
      created_at,
      group_members (id)
    `)
    .eq('created_by', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching groups:', error)
    return { error: 'Ошибка при загрузке групп' }
  }

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

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут просматривать участников группы' }
  }

  const { data: group } = await supabase
    .from('study_groups')
    .select('id, name, created_by')
    .eq('id', groupId)
    .eq('is_active', true)
    .single()

  if (!group) {
    return { error: 'Группа не найдена' }
  }

  if (group.created_by !== user.id) {
    return { error: 'Нет доступа к этой группе' }
  }

  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select('id, user_id, joined_at')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: false })

  if (membersError || !membersData) {
    console.error('Error fetching group members:', membersError)
    return { error: 'Ошибка при загрузке участников' }
  }

  // Fetch profiles separately to avoid RLS issues.
  const userIds = membersData.map(m => m.user_id).filter((id): id is string => id !== null && id !== undefined)
  const profilesMap = new Map<string, { id: string; full_name: string | null; email: string | null }>()

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
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

  const members: GroupMemberWithProfile[] = membersData
    .filter(member => member.user_id !== null && member.user_id !== undefined)
    .map(member => ({
      id: member.id,
      user_id: member.user_id as string,
      joined_at: member.joined_at,
      profile: profilesMap.get(member.user_id as string) || null
    }))

  return { 
    groupName: group.name,
    members: members
  }
}

export async function addStudentToGroup(groupId: string, studentEmail: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  if (!studentEmail || !studentEmail.includes('@')) {
    return { error: 'Введите корректный email' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут добавлять студентов в группы' }
  }

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

  let studentProfile: { id: string; role: string | null } | null = null
  let lookupError: string | null = null

  try {
    const functionResponse = await supabase.rpc('get_user_by_email', { 
      search_email: studentEmail.toLowerCase() 
    })
    
    if (!functionResponse.error && functionResponse.data && functionResponse.data.length > 0) {
      studentProfile = {
        id: functionResponse.data[0].id,
        role: functionResponse.data[0].role
      }
    } else if (functionResponse.error) {
      console.log('Function lookup failed, trying direct query:', functionResponse.error.message)
    }
    } catch {
      console.log('Function not available, using fallback method')
    }

  if (!studentProfile) {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .ilike('email', studentEmail.toLowerCase())
        .single()

      if (profileError) {
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

  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', studentProfile.id)
    .single()

  if (existingMember) {
    return { error: 'Студент уже добавлен в эту группу' }
  }

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

  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')
  return { 
    success: true, 
    studentName: studentEmail,
    memberCount: count || 0
  }
}

export async function removeStudentFromGroup(groupId: string, memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут удалять студентов из групп' }
  }

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

  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId) // Extra safety check

  if (deleteError) {
    console.error('Error removing student from group:', deleteError)
    return { error: 'Ошибка при удалении студента из группы' }
  }

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

export async function deleteGroup(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    return { error: 'Только учителя могут удалять группы' }
  }

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

  const { error: updateError } = await supabase
    .from('study_groups')
    .update({ is_active: false })
    .eq('id', groupId)

  if (updateError) {
    console.error('Error soft deleting group:', updateError)
    return { error: 'Ошибка при удалении группы' }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/dashboard')
  return { 
    success: true, 
    groupName: group.name,
    deletedGroupId: groupId
  }
}

export async function refreshAssignmentAnalytics(assignmentIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необходима авторизация' }
  }

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

