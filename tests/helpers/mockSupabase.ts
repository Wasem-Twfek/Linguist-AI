import { vi } from 'vitest'

type QueryMode = 'list' | 'single'

type QueryState = {
  table: string
  filters: Record<string, unknown>
  inFilters: Record<string, unknown[]>
  insertPayload?: unknown
  updatePayload?: unknown
}

type QueryResult = {
  data?: unknown
  error?: unknown
  count?: number | null
}

type QueryHandler = (mode: QueryMode, state: QueryState) => QueryResult | Promise<QueryResult>

type HandlerMap = Record<string, QueryHandler>

export function createSupabaseMock(options: {
  user: { id: string } | null
  handlers: HandlerMap
}) {
  const storageBucket = {
    upload: vi.fn(),
    remove: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUrl: vi.fn(),
    list: vi.fn(),
  }

  const storage = {
    from: vi.fn((bucket?: string) => {
      void bucket
      return storageBucket
    }),
  }

  const from = vi.fn((table: string) => {
    const handler = options.handlers[table]

    if (!handler) {
      throw new Error(`Unexpected table query: ${table}`)
    }

    return createQueryBuilder(table, handler)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options.user,
        },
      }),
    },
    from,
    storage,
  }
}

function createQueryBuilder(table: string, handler: QueryHandler) {
  const state: QueryState = {
    table,
    filters: {},
    inFilters: {},
  }

  const resolveResult = async (mode: QueryMode) => {
    const result = await handler(mode, state)
    return {
      data: null,
      error: null,
      ...result,
    }
  }

  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      state.filters[column] = value
      return builder
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      state.inFilters[column] = values
      return builder
    }),
    gte: vi.fn((column: string, value: unknown) => {
      state.filters[`gte:${column}`] = value
      return builder
    }),
    order: vi.fn(() => builder),
    insert: vi.fn((payload: unknown) => {
      state.insertPayload = payload
      return builder
    }),
    update: vi.fn((payload: unknown) => {
      state.updatePayload = payload
      return builder
    }),
    single: vi.fn(() => resolveResult('single')),
    maybeSingle: vi.fn(() => resolveResult('single')),
    then: (onFulfilled?: (value: Awaited<ReturnType<typeof resolveResult>>) => unknown, onRejected?: (reason: unknown) => unknown) =>
      resolveResult('list').then(onFulfilled, onRejected),
  }

  return builder
}
