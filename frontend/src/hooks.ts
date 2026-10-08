import { useCallback, useState } from 'react'
import type { QuestionSpec } from './api/types'

/** Runs one backend call at a time and tracks its result, error and loading state. */
export function useCall<T>() {
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async (call: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    try {
      setResult(await call())
    } catch (caught) {
      setError(caught)
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, error, loading, run, setError }
}

/** The checks the backend would otherwise reject, phrased for the UI. */
export function validateQuestions(questions: QuestionSpec[]): string | null {
  if (questions.length === 0) return 'Add at least one question.'
  const names = new Set<string>()
  for (const question of questions) {
    if (!question.name) return 'Every question needs a name.'
    if (names.has(question.name)) return `The name "${question.name}" is used twice.`
    names.add(question.name)
    if (question.type === 'noul' && !question.instructions && !question.whenTrue && !question.whenFalse) {
      return `"${question.name}": a noul needs instructions or whenTrue/whenFalse.`
    }
    if (question.type === 'choice' && (question.options?.length ?? 0) < 1) {
      return `"${question.name}": add at least one option.`
    }
    if (question.type === 'score' && (question.levels?.length ?? 0) < 2) {
      return `"${question.name}": a score needs at least two levels.`
    }
  }
  return null
}
