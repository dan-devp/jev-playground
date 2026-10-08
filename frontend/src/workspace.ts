import { createContext, useContext } from 'react'
import type { JevState, QuestionSpec } from './api/types'
import { PRESETS, type Preset } from './presets'

/** A question as edited in the UI; the id only keys React lists and is never sent. */
export type EditableQuestion = QuestionSpec & { id: string }

export type StateMode = 'text' | 'json'

export interface WorkspaceData {
  questions: EditableQuestion[]
  stateMode: StateMode
  stateText: string
  samples: string[]
  model: string
}

export interface Workspace extends WorkspaceData {
  setQuestions: (questions: EditableQuestion[]) => void
  setStateMode: (mode: StateMode) => void
  setStateText: (text: string) => void
  setSamples: (samples: string[]) => void
  setModel: (model: string) => void
  loadPreset: (preset: Preset) => void
}

export const STORAGE_KEY = 'jev-playground.workspace.v1'

export const newId = () => crypto.randomUUID()

export function fromPreset(preset: Preset, model = ''): WorkspaceData {
  return {
    questions: preset.questions.map((question) => ({ ...question, id: newId() })),
    stateMode: preset.stateMode,
    stateText: preset.state,
    samples: preset.samples,
    model,
  }
}

export function loadWorkspace(): WorkspaceData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as WorkspaceData
    }
  } catch {
    // Storage may be unavailable or hold an older shape; start from the first preset.
  }
  return fromPreset(PRESETS[0])
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) {
    throw new Error('useWorkspace must be used inside a WorkspaceProvider')
  }
  return workspace
}

/** The questions as the backend expects them: without ids and without empty fields. */
export function toSpecs(questions: EditableQuestion[]): QuestionSpec[] {
  return questions.map(({ id: _id, ...question }) => {
    const spec: QuestionSpec = { name: question.name.trim(), type: question.type }
    if (question.instructions?.trim()) spec.instructions = question.instructions
    if (question.type === 'noul') {
      if (question.whenTrue?.trim()) spec.whenTrue = question.whenTrue
      if (question.whenFalse?.trim()) spec.whenFalse = question.whenFalse
    }
    if (question.type === 'choice') {
      spec.options = (question.options ?? [])
        .filter((option) => option.label.trim() !== '')
        .map((option) => ({ label: option.label.trim(), description: option.description?.trim() || undefined }))
    }
    if (question.type === 'score') {
      spec.levels = (question.levels ?? []).filter((level) => level.trim() !== '')
    }
    return spec
  })
}

export type ParsedState = { ok: true; state: JevState } | { ok: false; error: string }

/** Reads the state editor: text is sent as a JSON string, JSON is parsed and checked. */
export function parseState(mode: StateMode, text: string): ParsedState {
  if (mode === 'text') {
    return { ok: true, state: text }
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${(error as Error).message}` }
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { ok: false, error: 'Jev only accepts text, an object, an array or null as state.' }
  }
  return { ok: true, state: value as JevState }
}

/** The batch and composite pages take one state per non-empty line. */
export function sampleStates(samples: string[]): JevState[] {
  return samples.filter((line) => line.trim() !== '')
}
