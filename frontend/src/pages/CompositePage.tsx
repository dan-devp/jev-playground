import { Play, Plus, Scale, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import type { Candidate, CompositeResult } from '../api/types'
import { AnswerChip } from '../components/Answers'
import { QuestionEditor } from '../components/QuestionEditor'
import { SamplesEditor } from '../components/SamplesEditor'
import { Badge, Bar, Button, Card, ErrorBox, Hint, Input, NumberField } from '../components/ui'
import { cx, fmt } from '../util'
import { useCall, validateQuestions } from '../hooks'
import { newId, toSpecs, useWorkspace } from '../workspace'

interface EditableProfile {
  id: string
  name: string
  weights: Record<string, number>
}

/** "Alex: 8 years Python…" becomes the label "Alex"; other lines get a numbered label. */
function toCandidate(line: string, index: number): Candidate {
  const match = /^([^:]{1,40}):\s*(.+)$/.exec(line)
  return match ? { label: match[1].trim(), state: line } : { label: `Candidate ${index + 1}`, state: line }
}

const sum = (weights: Record<string, number>, names: string[]) =>
  names.reduce((total, name) => total + (Number.isFinite(weights[name]) ? weights[name] : 0), 0)

// JevCompositeScore rejects weights whose sum is further than 1e-9 from 1.
const sumsToOne = (total: number) => Math.abs(total - 1) < 1e-9

/** Rounds shares to four decimals and gives the rounding remainder to the last one, so they sum to 1. */
function toWeights(names: string[], shares: number[]): Record<string, number> {
  const rounded = shares.map((share) => +share.toFixed(4))
  rounded[rounded.length - 1] = +(1 - rounded.slice(0, -1).reduce((a, b) => a + b, 0)).toFixed(4)
  return Object.fromEntries(names.map((name, index) => [name, rounded[index]]))
}

export function CompositePage() {
  const workspace = useWorkspace()
  const call = useCall<CompositeResult>()
  const [concurrency, setConcurrency] = useState(4)

  const specs = toSpecs(workspace.questions)
  const scoreNames = specs.filter((spec) => spec.type === 'score').map((spec) => spec.name)
  const equal = () => toWeights(scoreNames, scoreNames.map(() => 1 / scoreNames.length))
  const [profiles, setProfiles] = useState<EditableProfile[]>(() => [
    { id: newId(), name: 'Balanced', weights: equal() },
  ])

  // When the score questions change (another preset, a renamed question), profiles that do
  // not weight every current dimension fall back to equal weights.
  const scoreKey = scoreNames.join('\u0000')
  const [weightedKey, setWeightedKey] = useState(scoreKey)
  if (weightedKey !== scoreKey) {
    setWeightedKey(scoreKey)
    setProfiles(
      profiles.map((profile) =>
        scoreNames.every((name) => name in profile.weights) ? profile : { ...profile, weights: equal() },
      ),
    )
  }

  const candidates = workspace.samples.filter((line) => line.trim() !== '').map(toCandidate)
  const badProfile = profiles.find((profile) => !sumsToOne(sum(profile.weights, scoreNames)))
  const profileNames = profiles.map((profile) => profile.name.trim() || 'Profile')
  const duplicateProfile = profileNames.find((name, index) => profileNames.indexOf(name) !== index)
  const problem =
    candidates.length === 0
      ? 'Add at least one candidate.'
      : (validateQuestions(specs) ??
        (scoreNames.length === 0
          ? 'A composite combines score questions: add at least one score question.'
          : badProfile
            ? `The weights of "${badProfile.name}" do not sum to 1.`
            : duplicateProfile
              ? `The profile name "${duplicateProfile}" is used twice.`
              : null))

  const updateProfile = (id: string, patch: Partial<EditableProfile>) =>
    setProfiles(profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)))
  const normalise = (profile: EditableProfile) => {
    const total = sum(profile.weights, scoreNames)
    if (total <= 0) return updateProfile(profile.id, { weights: equal() })
    updateProfile(profile.id, {
      weights: toWeights(scoreNames, scoreNames.map((name) => (profile.weights[name] ?? 0) / total)),
    })
  }

  const run = () => {
    if (problem) return
    const payload = profiles.map((profile, index) => ({
      name: profileNames[index],
      weights: Object.fromEntries(scoreNames.map((name) => [name, profile.weights[name] ?? 0])),
    }))
    void call.run(() => api.composite(candidates, specs, workspace.model, payload, concurrency))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <SamplesEditor
            title="Candidates"
            hint="One candidate per line. &quot;Name: description&quot; uses the name as label. All candidates are scored in one batch."
          />
          <Card
            title="Weighting profiles (JevCompositeScore)"
            actions={
              <Button
                variant="ghost"
                onClick={() =>
                  setProfiles([...profiles, { id: newId(), name: `Profile ${profiles.length + 1}`, weights: equal() }])
                }
              >
                <Plus className="size-3.5" /> Profile
              </Button>
            }
          >
            <div className="space-y-3">
              <Hint>
                Every score dimension is normalised to [0, 1] and weighted. One round of scoring produces the answers,
                every profile its own ranking. Composites are for ordering candidates, not for pass/fail
                decisions.
              </Hint>
              {profiles.map((profile) => {
                const total = sum(profile.weights, scoreNames)
                return (
                  <div key={profile.id} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Input
                        className="max-w-56 font-medium"
                        value={profile.name}
                        onChange={(event) => updateProfile(profile.id, { name: event.target.value })}
                      />
                      <Badge tone={sumsToOne(total) ? 'emerald' : 'rose'}>Σ {fmt(total, 3)}</Badge>
                      <Button variant="ghost" onClick={() => normalise(profile)} title="Scale the weights to sum to 1">
                        <Scale className="size-4" /> Normalise
                      </Button>
                      <Button
                        variant="danger"
                        className="ml-auto px-1.5"
                        disabled={profiles.length === 1}
                        onClick={() => setProfiles(profiles.filter((p) => p.id !== profile.id))}
                        aria-label="Remove profile"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {scoreNames.map((name) => (
                        <NumberField
                          key={name}
                          label={name}
                          value={profile.weights[name] ?? 0}
                          min={0}
                          max={1}
                          step={0.05}
                          onChange={(value) =>
                            updateProfile(profile.id, { weights: { ...profile.weights, [name]: value } })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              <NumberField label="Concurrency" value={concurrency} min={1} max={16} onChange={setConcurrency} />
            </div>
          </Card>
        </div>
        <QuestionEditor />
      </div>

      <Card
        title="Rankings"
        actions={
          <Button variant="primary" onClick={run} loading={call.loading} disabled={!!problem}>
            <Play className="size-4" /> Score {candidates.length} candidates
          </Button>
        }
      >
        <div className="space-y-4">
          {problem && <Hint>⚠ {problem}</Hint>}
          <ErrorBox error={call.error} />
          {call.result && (
            <Rankings result={call.result} profileNames={profileNames} specs={specs.map((spec) => spec.name)} />
          )}
        </div>
      </Card>
    </div>
  )
}

function Rankings({ result, profileNames, specs }: { result: CompositeResult; profileNames: string[]; specs: string[] }) {
  const scored = result.candidates.filter((candidate) => candidate.result)
  const failed = result.candidates.filter((candidate) => candidate.error)
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {profileNames.map((profile) => {
          const ranked = [...scored].sort((a, b) => (b.scores[profile] ?? 0) - (a.scores[profile] ?? 0))
          return (
            <div key={profile} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <h3 className="mb-2 text-sm font-semibold">{profile}</h3>
              <ol className="space-y-2">
                {ranked.map((candidate, rank) => (
                  <li key={candidate.index} className="grid grid-cols-[1.5rem_minmax(0,8rem)_1fr_3rem] items-center gap-2 text-sm">
                    <span className={cx('tabular-nums', rank === 0 ? 'font-bold text-violet-600 dark:text-violet-400' : 'text-slate-400')}>
                      {rank + 1}.
                    </span>
                    <span className="truncate" title={candidate.label}>
                      {candidate.label}
                    </span>
                    <Bar value={candidate.scores[profile] ?? 0} tone={rank === 0 ? 'violet' : 'slate'} />
                    <span className="text-right tabular-nums">{fmt(candidate.scores[profile] ?? 0)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800">
            <tr>
              <th className="py-2 pr-3 font-medium">Candidate</th>
              {specs.map((name) => (
                <th key={name} className="py-2 pr-3 font-mono font-medium">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {scored.map((candidate) => (
              <tr key={candidate.index}>
                <td className="py-2 pr-3">{candidate.label}</td>
                {specs.map((name) => {
                  const answer = candidate.result?.answers.find((a) => a.name === name)
                  return (
                    <td key={name} className="py-2 pr-3">
                      {answer ? <AnswerChip answer={answer} /> : '–'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {failed.length > 0 && (
        <ul className="list-inside list-disc text-xs text-rose-600 dark:text-rose-400">
          {failed.map((candidate) => (
            <li key={candidate.index}>
              {candidate.label}: {candidate.error}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
