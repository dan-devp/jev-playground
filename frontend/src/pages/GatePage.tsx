import { Play, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import type { GateDecisionKind, GateResult } from '../api/types'
import { AnswerList, ResultMeta } from '../components/Answers'
import { QuestionEditor } from '../components/QuestionEditor'
import { StateEditor } from '../components/StateEditor'
import { Badge, Bar, Button, Card, ErrorBox, Hint, Input, NumberField } from '../components/ui'
import { fmt } from '../util'
import { useCall, validateQuestions } from '../hooks'
import { newId, parseState, toSpecs, useWorkspace } from '../workspace'

interface Requirement {
  id: string
  action: string
  confidence: number
}

const DECISIONS: Record<GateDecisionKind, { tone: 'emerald' | 'amber' | 'rose'; text: string }> = {
  EXECUTE: { tone: 'emerald', text: 'confident enough: act automatically' },
  CONFIRM: { tone: 'amber', text: 'above the floor but below what this action demands: ask the user' },
  ESCALATE: { tone: 'rose', text: 'below the floor: hand over to a person' },
}

export function GatePage() {
  const workspace = useWorkspace()
  const call = useCall<GateResult>()
  const result = call.result
  const [floor, setFloor] = useState(0.6)
  const [requirements, setRequirements] = useState<Requirement[]>([
    { id: newId(), action: 'transfer_funds', confidence: 0.85 },
  ])

  const specs = toSpecs(workspace.questions)
  const parsed = parseState(workspace.stateMode, workspace.stateText)
  const hasChoice = specs.some((spec) => spec.type === 'choice')
  const problem = !parsed.ok
    ? parsed.error
    : (validateQuestions(specs) ?? (hasChoice ? null : 'The gate decides on choice answers: add at least one choice question.'))
  const knownActions = specs.flatMap((spec) => spec.options?.map((option) => option.label) ?? [])

  const update = (id: string, patch: Partial<Requirement>) =>
    setRequirements(requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const run = () => {
    if (!parsed.ok || problem) return
    const required = Object.fromEntries(
      requirements.filter((r) => r.action.trim() !== '').map((r) => [r.action.trim(), r.confidence]),
    )
    void call.run(() => api.confidenceGate(parsed.state, specs, workspace.model, floor, required))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <StateEditor />
        <QuestionEditor />
      </div>
      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card
          title="Confidence Gate (JevConfidenceGate)"
          actions={
            <Button variant="primary" onClick={run} loading={call.loading} disabled={!!problem}>
              <Play className="size-4" /> Decide
            </Button>
          }
        >
          <div className="space-y-3">
            <Hint>
              The answer says <em>what</em>; the confidence says <em>whether to act on it unattended</em>. Below the
              floor everything escalates; risky actions can demand a higher confidence.
            </Hint>
            <NumberField label="Floor" value={floor} min={0} max={1} step={0.05} onChange={setFloor} />
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Actions that demand more (action = the chosen choice label)
              </span>
              {requirements.map((requirement) => (
                <div key={requirement.id} className="flex items-center gap-2">
                  <Input
                    className="font-mono"
                    list="gate-actions"
                    value={requirement.action}
                    placeholder="action"
                    onChange={(event) => update(requirement.id, { action: event.target.value })}
                  />
                  <Input
                    type="number"
                    className="w-28"
                    min={0}
                    max={1}
                    step={0.05}
                    value={requirement.confidence}
                    onChange={(event) => update(requirement.id, { confidence: event.target.valueAsNumber })}
                  />
                  <Button
                    variant="ghost"
                    className="px-1.5"
                    onClick={() => setRequirements(requirements.filter((r) => r.id !== requirement.id))}
                    aria-label="Remove requirement"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <datalist id="gate-actions">
                {knownActions.map((action) => (
                  <option key={action} value={action} />
                ))}
              </datalist>
              <Button
                variant="ghost"
                onClick={() => setRequirements([...requirements, { id: newId(), action: '', confidence: 0.85 }])}
              >
                <Plus className="size-3.5" /> Action
              </Button>
            </div>
            {problem && <Hint>⚠ {problem}</Hint>}
            <ErrorBox error={call.error} />
          </div>
        </Card>

        {result && (
          <>
            <Card title="Decisions">
              <div className="space-y-3">
                {result.decisions.map((decision) => (
                  <div key={decision.question} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm">
                        <span className="font-mono text-slate-500">{decision.question}</span> →{' '}
                        <span className="font-mono font-semibold">{decision.action}</span>
                      </span>
                      <Badge tone={DECISIONS[decision.decision].tone}>{decision.decision}</Badge>
                    </div>
                    <Bar
                      value={decision.confidence}
                      threshold={decision.required}
                      tone={DECISIONS[decision.decision].tone}
                    />
                    <Hint>
                      Confidence {fmt(decision.confidence)} · requires {fmt(decision.required)} (floor{' '}
                      {fmt(result.floor)}) · {DECISIONS[decision.decision].text}
                    </Hint>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Answers">
              <div className="space-y-3">
                <ResultMeta result={result.result} />
                <AnswerList answers={result.result.answers} />
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
