import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fromPreset, loadWorkspace, STORAGE_KEY, WorkspaceContext, type Workspace, type WorkspaceData } from './workspace'

/** Shares questions, state and model across all pages and keeps them in localStorage. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(loadWorkspace)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Persistence is a convenience only.
    }
  }, [data])

  const workspace = useMemo<Workspace>(
    () => ({
      ...data,
      setQuestions: (questions) => setData((current) => ({ ...current, questions })),
      setStateMode: (stateMode) => setData((current) => ({ ...current, stateMode })),
      setStateText: (stateText) => setData((current) => ({ ...current, stateText })),
      setSamples: (samples) => setData((current) => ({ ...current, samples })),
      setModel: (model) => setData((current) => ({ ...current, model })),
      loadPreset: (preset) => setData((current) => fromPreset(preset, current.model)),
    }),
    [data],
  )

  return <WorkspaceContext value={workspace}>{children}</WorkspaceContext>
}
