import { Play } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import type { ConsistencyResult, StatisticsView } from '../api/types'
import { QuestionEditor } from '../components/QuestionEditor'
import { StateEditor } from '../components/StateEditor'
import { Badge, Button, Card, ErrorBox, Hint, NumberField } from '../components/ui'
import { fmt } from '../util'
import { useCall, validateQuestions } from '../hooks'
import { parseState, toSpecs, useWorkspace } from '../workspace'

export function ConsistencyPage() {
  const workspace = useWorkspace()
  const call = useCall<ConsistencyResult>()
  const [samples, setSamples] = useState(15)
  const [concurrency, setConcurrency] = useState(4)
  const [threshold, setThreshold] = useState(0.7)

  const specs = toSpecs(workspace.questions)
  const parsed = parseState(workspace.stateMode, workspace.stateText)

  // JevConsistency adds a throwaway uid field to the state, so it needs a JSON object.
  // Text is wrapped as {"text": …}; arrays and null cannot be sampled.
  let objectState: Record<string, unknown> | null = null
  let stateProblem: string | null = null
  if (!parsed.ok) {
    stateProblem = parsed.error
  } else if (typeof parsed.state === 'string') {
    objectState = { text: parsed.state }
  } else if (parsed.state && !Array.isArray(parsed.state)) {
    objectState = parsed.state
  } else {
    stateProblem = 'Consistency sampling needs text or a JSON object as state.'
  }
  const problem = stateProblem ?? validateQuestions(specs)
  const scaleMax = (name: string) => {
    const spec = specs.find((s) => s.name === name)
    return spec?.type === 'score' ? Math.max((spec.levels?.length ?? 2) - 1, 1) : 1
  }

  const run = () => {
    if (problem || !objectState) return
    const state = objectState
    void call.run(() =>
      api.consistency(state, specs, samples, concurrency, Number.isFinite(threshold) ? threshold : null),
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <StateEditor hint="Text is sent as {&quot;text&quot;: …}. Every sample gets a random uid field, so Jev judges afresh instead of returning a cached result." />
        <QuestionEditor />
      </div>
      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card
          title="Self-Consistency (JevConsistency)"
          actions={
            <Button variant="primary" onClick={run} loading={call.loading} disabled={!!problem}>
              <Play className="size-4" /> {samples} samples
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField label="Samples" value={samples} min={2} max={50} onChange={setSamples} />
              <NumberField label="Concurrency" value={concurrency} min={1} max={16} onChange={setConcurrency} />
              <NumberField
                label="Threshold"
                value={threshold}
                step={0.05}
                onChange={setThreshold}
                hint="on the raw value"
              />
            </div>
            <Hint>
              Asks the same questions repeatedly and measures how much the answers spread. A question whose values land
              on both sides of the threshold does not make a reproducible decision. Noul and score questions are
              summarised, choice questions are not. Always runs against the client's default model.
            </Hint>
            {problem && <Hint>⚠ {problem}</Hint>}
            <ErrorBox error={call.error} />

            {call.result && (
              <div className="space-y-3">
                <Hint>
                  {call.result.succeeded} samples succeeded · model {call.result.model} · {call.result.latencyMs} ms
                </Hint>
                {call.result.unstable.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    Unstable at threshold {threshold}: <span className="font-mono">{call.result.unstable.join(', ')}</span>
                  </div>
                )}
                {call.result.statistics.map((stats) => (
                  <StatisticsRow key={stats.name} stats={stats} max={scaleMax(stats.name)} threshold={threshold} />
                ))}
                {call.result.failures.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-rose-600 dark:text-rose-400">
                    {call.result.failures.map((failure) => (
                      <li key={failure}>{failure}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatisticsRow({ stats, max, threshold }: { stats: StatisticsView; max: number; threshold: number }) {
  const position = (value: number) => `${Math.max(0, Math.min(1, value / max)) * 100}%`
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{stats.name}</span>
        {stats.straddlesThreshold != null &&
          (stats.straddlesThreshold ? <Badge tone="amber">straddles threshold</Badge> : <Badge tone="emerald">stable</Badge>)}
      </div>
      {/* Every sample as a dot on the question's scale, the mean as a bar. */}
      <div className="relative my-3 h-6 rounded bg-slate-100 dark:bg-slate-800">
        {Number.isFinite(threshold) && threshold <= max && (
          <div className="absolute top-0 h-6 w-px bg-slate-900 dark:bg-slate-100" style={{ left: position(threshold) }} />
        )}
        <div
          className="absolute top-0 h-6 bg-violet-500/15"
          style={{ left: position(stats.min), width: `calc(${position(stats.max)} - ${position(stats.min)})` }}
        />
        {stats.values.map((value, index) => (
          <div
            key={index}
            className="absolute top-2 size-2 -translate-x-1/2 rounded-full bg-violet-600/70"
            style={{ left: position(value) }}
            title={fmt(value, 3)}
          />
        ))}
        <div className="absolute top-0 h-6 w-0.5 bg-violet-700 dark:bg-violet-300" style={{ left: position(stats.mean) }} />
      </div>
      <div className="grid grid-cols-5 gap-2 text-xs tabular-nums">
        {(
          [
            ['Mean', stats.mean],
            ['Std. dev.', stats.standardDeviation],
            ['Min', stats.min],
            ['Max', stats.max],
            ['Range', stats.range],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <div className="text-slate-500 dark:text-slate-400">{label}</div>
            <div className="font-medium">{fmt(value, 3)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
