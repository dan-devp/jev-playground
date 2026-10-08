import { Clock, Cpu, Hash } from 'lucide-react'
import type { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer, SystemOneResult } from '../api/types'
import { Badge, Bar } from './ui'
import { cx, fmt } from '../util'

export function ResultMeta({ result }: { result: Pick<SystemOneResult, 'model' | 'latencyMs' | 'inputTokens' | 'outputTokens' | 'requestId'> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1">
        <Cpu className="size-3.5" />
        {result.model}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3.5" />
        {result.latencyMs} ms
      </span>
      {(result.inputTokens != null || result.outputTokens != null) && (
        <span>
          Tokens: {result.inputTokens ?? '–'} in / {result.outputTokens ?? '–'} out
        </span>
      )}
      {result.requestId && (
        <span className="inline-flex items-center gap-1 font-mono">
          <Hash className="size-3.5" />
          {result.requestId}
        </span>
      )}
    </div>
  )
}

export function AnswerList({ answers }: { answers: Answer[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {answers.map((answer) => (
        <AnswerCard key={answer.name} answer={answer} />
      ))}
    </div>
  )
}

export function AnswerCard({ answer }: { answer: Answer }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm font-semibold">{answer.name}</span>
        <Badge tone={answer.type === 'noul' ? 'sky' : answer.type === 'choice' ? 'violet' : answer.type === 'score' ? 'amber' : 'slate'}>
          {answer.type === 'unknown' ? (answer.typeName ?? 'unknown') : answer.type}
        </Badge>
      </div>
      {answer.type === 'noul' && <NoulDetail answer={answer} />}
      {answer.type === 'choice' && <ChoiceDetail answer={answer} />}
      {answer.type === 'score' && <ScoreDetail answer={answer} />}
      {answer.type === 'unknown' && (
        <pre className="overflow-x-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
          {JSON.stringify(answer.raw, null, 2)}
        </pre>
      )}
    </div>
  )
}

const noulTone = (value: number) => (value >= 0.7 ? 'emerald' : value <= 0.3 ? 'rose' : 'amber')

function NoulDetail({ answer }: { answer: NoulAnswer }) {
  const verdict = answer.value >= 0.7 ? 'leaning yes' : answer.value <= 0.3 ? 'leaning no' : 'undecided'
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{fmt(answer.value, 3)}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{verdict}</span>
      </div>
      <Bar value={answer.value} threshold={0.5} tone={noulTone(answer.value)} />
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>0 · no</span>
        <span>1 · yes</span>
      </div>
    </div>
  )
}

function ChoiceDetail({ answer }: { answer: ChoiceAnswer }) {
  const options = Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-lg font-semibold">{answer.value}</span>
        <Confidence value={answer.confidence} />
      </div>
      <ProbabilityRows rows={options.map(([label, p]) => ({ label, p, selected: label === answer.value }))} />
    </div>
  )
}

function ScoreDetail({ answer }: { answer: ScoreAnswer }) {
  const levels = Object.keys(answer.legend)
    .map(Number)
    .sort((a, b) => a - b)
  const max = Math.max(answer.maxLevel, 1)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span>
          <span className="text-2xl font-semibold tabular-nums">{fmt(answer.value)}</span>
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400" title="Level with the highest probability">
            most likely level: {answer.nearestLabel}
          </span>
        </span>
        <Confidence value={answer.confidence} />
      </div>
      <div className="relative pt-2">
        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400 dark:from-emerald-700 dark:via-amber-700 dark:to-rose-700" />
        <div
          className="absolute top-0 h-6 w-1 -translate-x-1/2 rounded bg-slate-900 dark:bg-white"
          style={{ left: `${(answer.value / max) * 100}%` }}
          title={`Score ${fmt(answer.value)}`}
        />
      </div>
      <ProbabilityRows
        rows={levels.map((level) => ({
          label: `${level} · ${answer.legend[level]}`,
          p: answer.probabilities[level] ?? 0,
          selected: level === answer.nearestLevel,
        }))}
      />
    </div>
  )
}

function ProbabilityRows({ rows }: { rows: { label: string; p: number; selected: boolean }[] }) {
  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-2 text-xs">
          <span className={cx('truncate', row.selected && 'font-semibold')} title={row.label}>
            {row.label}
          </span>
          <Bar value={row.p} tone={row.selected ? 'violet' : 'slate'} />
          <span className="text-right tabular-nums">{fmt(row.p)}</span>
        </div>
      ))}
    </div>
  )
}

export function Confidence({ value }: { value: number }) {
  return (
    <Badge tone={value >= 0.7 ? 'emerald' : value >= 0.5 ? 'amber' : 'rose'}>confidence {fmt(value)}</Badge>
  )
}

/** One-line summary of an answer for tables. */
export function AnswerChip({ answer }: { answer: Answer }) {
  switch (answer.type) {
    case 'noul':
      return (
        <span className="inline-flex min-w-24 items-center gap-1.5">
          <span className="w-10 tabular-nums">{fmt(answer.value)}</span>
          <span className="w-12">
            <Bar value={answer.value} tone={noulTone(answer.value)} />
          </span>
        </span>
      )
    case 'choice':
      return (
        <span className="whitespace-nowrap">
          <span className="font-mono">{answer.value}</span>{' '}
          <span className="text-slate-400">({fmt(answer.confidence)})</span>
        </span>
      )
    case 'score':
      return (
        <span className="whitespace-nowrap">
          <span className="tabular-nums">{fmt(answer.value)}</span>{' '}
          <span className="text-slate-500" title="Level with the highest probability">
            (max P: {answer.nearestLabel})
          </span>
        </span>
      )
    default:
      return <span className="text-slate-400">{answer.typeName ?? 'unknown'}</span>
  }
}
