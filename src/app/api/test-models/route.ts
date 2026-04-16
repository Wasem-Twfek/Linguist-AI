import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error(
        'Missing environment variable: GOOGLE_API_KEY. ' +
        'Please set it in your .env.local file. ' +
        'Get your API key from https://aistudio.google.com/app/apikey'
      )
    }

    console.log('Fetching available models from Google API...')
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const listResponse = await fetch(listModelsUrl)

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: `Failed to list models: ${listResponse.status} ${listResponse.statusText}` },
        { status: listResponse.status }
      )
    }

    const listData = await listResponse.json() as {
      models?: Array<{
        name?: string
        displayName?: string
        supportedGenerationMethods?: string[]
        description?: string
      }>
    }

    // Format models for display
    const models = listData.models?.map((m) => ({
      name: m.name || 'N/A',
      displayName: m.displayName || 'N/A',
      supportedMethods: m.supportedGenerationMethods || [],
      description: m.description || 'N/A',
    })) || []

    // Find models that support generateContent
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to list models'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

