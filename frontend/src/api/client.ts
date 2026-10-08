import type {
  BatchItem,
  Candidate,
  CompositeResult,
  ConsistencyResult,
  GateResult,
  JevState,
  ModelsResult,
  Profile,
  QuestionSpec,
  SystemOneResult,
} from './types'

/** A failed backend call, carrying the RFC 9457 problem detail the backend returns. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly details: string[]

  constructor(status: number, title: string, message: string, details: string[] = []) {
    super(message)
    this.status = status
    this.title = title
    this.details = details
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Backend unreachable', 'Is the Spring Boot backend running on port 8080?')
  }
  if (response.ok) {
    return (await response.json()) as T
  }
  throw await toApiError(response)
}

async function toApiError(response: Response): Promise<ApiError> {
  const text = await response.text()
  try {
    const problem = JSON.parse(text) as Record<string, unknown>
    const details: string[] = []
    if (Array.isArray(problem.validationErrors)) {
      details.push(...problem.validationErrors.map(String))
    }
    if (typeof problem.errorType === 'string') {
      details.push(`Error type: ${problem.errorType}`)
    }
    if (typeof problem.requestId === 'string') {
      details.push(`Request ID: ${problem.requestId}`)
    }
    return new ApiError(
      response.status,
      String(problem.title ?? response.statusText),
      String(problem.detail ?? text),
      details,
    )
  } catch {
    return new ApiError(response.status, response.statusText || 'Error', text || `HTTP ${response.status}`)
  }
}

const model = (value: string) => (value.trim() === '' ? undefined : value)

export const api = {
  models: () => request<ModelsResult>('GET', '/models'),

  systemOne: (state: JevState, questions: QuestionSpec[], modelName: string) =>
    request<SystemOneResult>('POST', '/system-one', { state, model: model(modelName), questions }),

  batch: (states: JevState[], questions: QuestionSpec[], modelName: string, concurrency: number, failFast: boolean) =>
    request<BatchItem[]>('POST', '/batch', {
      states,
      model: model(modelName),
      questions,
      concurrency,
      failFast,
    }),

  consistency: (
    state: Record<string, unknown>,
    questions: QuestionSpec[],
    samples: number,
    concurrency: number,
    threshold: number | null,
  ) => request<ConsistencyResult>('POST', '/consistency', { state, questions, samples, concurrency, threshold }),

  confidenceGate: (
    state: JevState,
    questions: QuestionSpec[],
    modelName: string,
    floor: number,
    requirements: Record<string, number>,
  ) =>
    request<GateResult>('POST', '/confidence-gate', {
      state,
      model: model(modelName),
      questions,
      floor,
      requirements,
    }),

  composite: (
    candidates: Candidate[],
    questions: QuestionSpec[],
    modelName: string,
    profiles: Profile[],
    concurrency: number,
  ) =>
    request<CompositeResult>('POST', '/composite', {
      candidates,
      model: model(modelName),
      questions,
      profiles,
      concurrency,
    }),
}
