import { Play } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import type { BatchItem } from '../api/types'
import { AnswerChip } from '../components/Answers'
import { QuestionEditor } from '../components/QuestionEditor'
import { SamplesEditor } from '../components/SamplesEditor'
import { Button, Card, ErrorBox, Hint, NumberField } from '../components/ui'
import { useCall, validateQuestions } from '../hooks'
import { sampleStates, toSpecs, useWorkspace } from '../workspace'

export function BatchPage() {
  const workspace = useWorkspace()
  const call = useCall<{ items: BatchItem[]; elapsedMs: number }>()
  const [concurrency, setConcurrency] = useState(4)
  const [failFast, setFailFast] = useState(false)

  const specs = toSpecs(workspace.questions)
  const states = sampleStates(workspace.samples)
  const problem = states.length === 0 ? 'Add at least one state.' : validateQuestions(specs)

  const run = () => {
    if (problem) return
    void call.run(async () => {
      const start = performance.now()
      const items = await api.batch(states, specs, workspace.model, concurrency, failFast)
      return { items, elapsedMs: Math.round(performance.now() - start) }
    })
  }

  const succeeded = call.result?.items.filter((item) => item.result).length ?? 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <SamplesEditor
            title="States"
            hint="Each line becomes its own System One call with the same questions. The client runs them concurrently (systemOneAll)."
          />
          <Card title="Batch options">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Concurrency"
                value={concurrency}
                min={1}
                max={16}
                onChange={setConcurrency}
                hint="parallel calls"
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={failFast}
                  onChange={(event) => setFailFast(event.target.checked)}
                  className="size-4 accent-violet-600"
                />
                failFast: stop after the first failure
              </label>
            </div>
          </Card>
        </div>
        <QuestionEditor />
      </div>

      <Card
        title="Results"
        actions={
          <Button variant="primary" onClick={run} loading={call.loading} disabled={!!problem}>
            <Play className="size-4" /> Start {states.length} calls
          </Button>
        }
      >
        <div className="space-y-3">
          {problem && <Hint>⚠ {problem}</Hint>}
          <ErrorBox error={call.error} />
          {call.result && (
            <>
              <Hint>
                {succeeded} of {call.result.items.length} succeeded · total {call.result.elapsedMs} ms
              </Hint>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">State</th>
                      {specs.map((spec) => (
                        <th key={spec.name} className="py-2 pr-3 font-mono font-medium">
                          {spec.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {call.result.items.map((item) => (
                      <tr key={item.index} className="align-top">
                        <td className="py-2 pr-3 text-slate-400 tabular-nums">{item.index + 1}</td>
                        <td className="max-w-xs py-2 pr-3">
                          <span className="line-clamp-2" title={String(states[item.index])}>
                            {String(states[item.index])}
                          </span>
                        </td>
                        {item.result
                          ? specs.map((spec) => {
                              const answer = item.result?.answers.find((a) => a.name === spec.name)
                              return (
                                <td key={spec.name} className="py-2 pr-3">
                                  {answer ? <AnswerChip answer={answer} /> : '–'}
                                </td>
                              )
                            })
                          : (
                              <td colSpan={specs.length} className="py-2 pr-3 text-rose-600 dark:text-rose-400">
                                {item.error}
                              </td>
                            )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
