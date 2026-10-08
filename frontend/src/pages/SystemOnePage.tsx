import { Play } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import type { SystemOneResult } from '../api/types'
import { AnswerList, ResultMeta } from '../components/Answers'
import { JavaSnippet } from '../components/JavaSnippet'
import { toJava } from '../javaCode'
import { QuestionEditor } from '../components/QuestionEditor'
import { StateEditor } from '../components/StateEditor'
import { Button, Card, ErrorBox, Hint } from '../components/ui'
import { cx } from '../util'
import { useCall, validateQuestions } from '../hooks'
import { parseState, toSpecs, useWorkspace } from '../workspace'

type View = 'answers' | 'json' | 'java'

export function SystemOnePage() {
  const workspace = useWorkspace()
  const call = useCall<SystemOneResult>()
  const [view, setView] = useState<View>('answers')

  const specs = toSpecs(workspace.questions)
  const parsed = parseState(workspace.stateMode, workspace.stateText)
  const problem = !parsed.ok ? parsed.error : validateQuestions(specs)

  const run = () => {
    if (!parsed.ok || problem) return
    void call.run(() => api.systemOne(parsed.state, specs, workspace.model))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <StateEditor />
        <QuestionEditor />
      </div>

      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card
          title="Result"
          actions={
            <>
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 text-xs dark:border-slate-700">
                {(['answers', 'json', 'java'] as View[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setView(option)}
                    className={cx(
                      'rounded-md px-2 py-0.5 font-medium',
                      view === option
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300',
                    )}
                  >
                    {option === 'answers' ? 'Answers' : option === 'json' ? 'JSON' : 'Java'}
                  </button>
                ))}
              </div>
              <Button variant="primary" onClick={run} loading={call.loading} disabled={!!problem}>
                <Play className="size-4" /> Run
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {problem && <Hint>⚠ {problem}</Hint>}
            <ErrorBox error={call.error} />

            {view === 'java' && parsed.ok && (
              <JavaSnippet code={toJava(parsed.state, specs, workspace.model)} />
            )}

            {view !== 'java' && !call.result && !call.error && (
              <Hint>
                One call answers every question in parallel against the same state. Jev writes no text; it returns
                structured judgments: noul values, label distributions and score positions.
              </Hint>
            )}

            {view !== 'java' && call.result && (
              <>
                <ResultMeta result={call.result} />
                {view === 'answers' ? (
                  <AnswerList answers={call.result.answers} />
                ) : (
                  <pre className="max-h-[70vh] overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-xs dark:bg-slate-950">
                    {JSON.stringify(call.result, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
