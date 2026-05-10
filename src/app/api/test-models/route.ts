import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

const DIAGNOSTIC_ROUTE_UNAVAILABLE = 'Диагностический маршрут недоступен.'

function unavailable(status = 404) {
  return NextResponse.json(
    { error: DIAGNOSTIC_ROUTE_UNAVAILABLE },
    { status }
  )
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return unavailable()
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unavailable()
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'teacher') {
      return unavailable()
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      console.error('Diagnostic model route is missing GOOGLE_API_KEY.')
      return unavailable(500)
    }

    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const listResponse = await fetch(listModelsUrl)

    if (!listResponse.ok) {
      console.error('Diagnostic model route failed to list models:', {
        status: listResponse.status,
        statusText: listResponse.statusText,
      })
      return unavailable(502)
    }

    const listData = await listResponse.json() as {
      models?: Array<{
        name?: string
        displayName?: string
        supportedGenerationMethods?: string[]
        description?: string
      }>
    }

    const models = listData.models?.map((m) => ({
      name: m.name || 'N/A',
      displayName: m.displayName || 'N/A',
      supportedMethods: m.supportedGenerationMethods || [],
      description: m.description || 'N/A',
    })) || []

    const supportedModels = models.filter((m) =>
      m.supportedMethods.includes('generateContent')
    )

    return NextResponse.json({
      success: true,
      totalModels: models.length,
      supportedModels: supportedModels.length,
      allModels: models,
      generateContentModels: supportedModels,
    })
  } catch (error) {
    console.error('Error listing models:', error)
    return unavailable(500)
  }
}

