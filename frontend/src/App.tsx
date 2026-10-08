import { Activity, BookOpen, Layers, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { api } from './api/client'
import type { ModelsResult } from './api/types'
import { cx } from './util'
import { BatchPage } from './pages/BatchPage'
import { CompositePage } from './pages/CompositePage'
import { ConsistencyPage } from './pages/ConsistencyPage'
import { GatePage } from './pages/GatePage'
import { SystemOnePage } from './pages/SystemOnePage'
import { PRESETS } from './presets'
import { useWorkspace } from './workspace'

interface Tab {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  page: ComponentType
}

const TABS: Tab[] = [
  { id: 'system-one', label: 'System One', icon: Sparkles, page: SystemOnePage },
  { id: 'batch', label: 'Batch', icon: Layers, page: BatchPage },
  { id: 'consistency', label: 'Consistency', icon: Activity, page: ConsistencyPage },
  { id: 'gate', label: 'Confidence Gate', icon: ShieldCheck, page: GatePage },
  { id: 'composite', label: 'Composite Score', icon: Trophy, page: CompositePage },
]

const tabFromHash = () => TABS.find((tab) => `#${tab.id}` === window.location.hash) ?? TABS[0]

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash)

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const Page = tab.page
  return (
    <div className="min-h-screen">
      <Header />
      <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-screen-2xl gap-1 overflow-x-auto px-4">
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cx(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium',
                  item.id === tab.id
                    ? 'border-violet-600 text-violet-700 dark:text-violet-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </a>
            )
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-screen-2xl p-4">
        <Page />
      </main>
    </div>
  )
}

function Header() {
  const workspace = useWorkspace()
  const [models, setModels] = useState<ModelsResult | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    api
      .models()
      .then(setModels)
      .catch((error: Error) => setModelsError(error.message))
  }, [])

  const SELECT =
    'rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100'

  return (
    <header className="bg-slate-900 text-white dark:bg-black">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-violet-600 font-mono text-sm font-bold">J</div>
          <div>
            <h1 className="text-base leading-tight font-semibold">Jev Playground</h1>
            <p className="text-xs text-slate-400">Structured judgments with TypeSafe AI</p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3 text-slate-900 dark:text-slate-100">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <BookOpen className="size-4" />
            <select
              className={SELECT}
              value=""
              onChange={(event) => {
                const preset = PRESETS.find((p) => p.id === event.target.value)
                if (preset) workspace.loadPreset(preset)
              }}
            >
              <option value="" disabled>
                Load example …
              </option>
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id} title={preset.description}>
                  {preset.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            Model
            <select
              className={SELECT}
              value={workspace.model}
              onChange={(event) => workspace.setModel(event.target.value)}
              title={models?.models.find((m) => m.name === workspace.model)?.description ?? undefined}
            >
              <option value="">Default{models ? ` (${models.defaultModel})` : ''}</option>
              {models?.models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                  {model.releaseDate ? ` · ${model.releaseDate}` : ''}
                </option>
              ))}
              {/* Keep a stored model selectable even when the list could not be loaded. */}
              {workspace.model && !models?.models.some((m) => m.name === workspace.model) && (
                <option value={workspace.model}>{workspace.model}</option>
              )}
            </select>
          </label>
          {modelsError && (
            <span className="max-w-xs truncate rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-200" title={modelsError}>
              Cannot load models: {modelsError}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
