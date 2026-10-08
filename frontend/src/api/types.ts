// Mirrors the DTOs of the Spring Boot backend (com.devp.jevplay.api).

export type QuestionType = 'noul' | 'choice' | 'score'

export interface OptionSpec {
  label: string
  description?: string
}

export interface QuestionSpec {
  name: string
  type: QuestionType
  instructions?: string
  whenTrue?: string
  whenFalse?: string
  options?: OptionSpec[]
  levels?: string[]
}

/** Jev accepts text, a JSON object, a JSON array or null as state. */
export type JevState = string | Record<string, unknown> | unknown[] | null

export interface NoulAnswer {
  type: 'noul'
  name: string
  value: number
}

export interface ChoiceAnswer {
  type: 'choice'
  name: string
  value: string
  probabilities: Record<string, number>
  confidence: number
}

export interface ScoreAnswer {
  type: 'score'
  name: string
  value: number
  nearestLevel: number
  nearestLabel: string
  maxLevel: number
  legend: Record<string, string>
  probabilities: Record<string, number>
  confidence: number
}

export interface UnknownAnswer {
  type: 'unknown'
  name: string
  typeName: string | null
  raw: Record<string, unknown>
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer | UnknownAnswer

export interface SystemOneResult {
  model: string
  answers: Answer[]
  inputTokens: number | null
  outputTokens: number | null
  requestId: string | null
  latencyMs: number
}

export interface ModelView {
  name: string
  description: string | null
  releaseDate: string | null
}

export interface ModelsResult {
  defaultModel: string
  models: ModelView[]
}

export interface BatchItem {
  index: number
  result: SystemOneResult | null
  error: string | null
}

export interface StatisticsView {
  name: string
  values: number[]
  mean: number
  standardDeviation: number
  min: number
  max: number
  range: number
  straddlesThreshold: boolean | null
}

export interface ConsistencyResult {
  model: string
  succeeded: number
  failures: string[]
  statistics: StatisticsView[]
  unstable: string[]
  latencyMs: number
}

export type GateDecisionKind = 'EXECUTE' | 'CONFIRM' | 'ESCALATE'

export interface GateDecision {
  question: string
  action: string
  confidence: number
  required: number
  decision: GateDecisionKind
}

export interface GateResult {
  result: SystemOneResult
  floor: number
  decisions: GateDecision[]
}

export interface Candidate {
  label: string
  state: JevState
}

export interface Profile {
  name: string
  weights: Record<string, number>
}

export interface CandidateResult {
  index: number
  label: string
  result: SystemOneResult | null
  error: string | null
  scores: Record<string, number>
}

export interface CompositeResult {
  candidates: CandidateResult[]
}
