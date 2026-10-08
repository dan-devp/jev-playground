import { ChevronDown, ChevronUp, CircleDot, Gauge, Plus, ToggleLeft, Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OptionSpec, QuestionType } from '../api/types'
import { newId, useWorkspace, type EditableQuestion } from '../workspace'
import { Badge, Button, Card, Hint, Input, Label, TextArea } from './ui'

const TYPE_META: Record<QuestionType, { label: string; icon: typeof ToggleLeft; tone: 'sky' | 'violet' | 'amber'; hint: string }> = {
  noul: {
    label: 'Noul',
    icon: ToggleLeft,
    tone: 'sky',
    hint: 'Yes/no question. The answer is a truth value in [0, 1]; 0.5 means undecided.',
  },
  choice: {
    label: 'Choice',
    icon: CircleDot,
    tone: 'violet',
    hint: 'Exactly one label from a fixed set. Returns a probability per option and a confidence.',
  },
  score: {
    label: 'Score',
    icon: Gauge,
    tone: 'amber',
    hint: 'Placement on an ordered rubric. The value is continuous (e.g. 1.4 between levels 1 and 2).',
  },
}

function blank(type: QuestionType, index: number): EditableQuestion {
  const base = { id: newId(), name: `${type}_${index + 1}`, type, instructions: '' }
  if (type === 'choice') return { ...base, options: [{ label: '' }, { label: '' }] }
  if (type === 'score') return { ...base, levels: ['', ''] }
  return base
}

export function QuestionEditor() {
  const { questions, setQuestions } = useWorkspace()

  const update = (id: string, patch: Partial<EditableQuestion>) =>
    setQuestions(questions.map((question) => (question.id === id ? { ...question, ...patch } : question)))
  const remove = (id: string) => setQuestions(questions.filter((question) => question.id !== id))
  const move = (index: number, delta: number) => {
    const next = [...questions]
    const [moved] = next.splice(index, 1)
    next.splice(index + delta, 0, moved)
    setQuestions(next)
  }
  const add = (type: QuestionType) => setQuestions([...questions, blank(type, questions.length)])

  return (
    <Card
      title={`Questions (${questions.length})`}
      actions={(Object.keys(TYPE_META) as QuestionType[]).map((type) => {
        const Icon = TYPE_META[type].icon
        return (
          <Button key={type} variant="ghost" onClick={() => add(type)} title={TYPE_META[type].hint}>
            <Plus className="size-3.5" />
            <Icon className="size-4" />
            {TYPE_META[type].label}
          </Button>
        )
      })}
    >
      <div className="space-y-3">
        {questions.length === 0 && <Hint>No questions yet. Add a noul, choice or score question above.</Hint>}
        {questions.map((question, index) => (
          <QuestionRow
            key={question.id}
            question={question}
            first={index === 0}
            last={index === questions.length - 1}
            onChange={(patch) => update(question.id, patch)}
            onRemove={() => remove(question.id)}
            onMove={(delta) => move(index, delta)}
          />
        ))}
      </div>
    </Card>
  )
}

function QuestionRow({ question, first, last, onChange, onRemove, onMove }: {
  question: EditableQuestion
  first: boolean
  last: boolean
  onChange: (patch: Partial<EditableQuestion>) => void
  onRemove: () => void
  onMove: (delta: number) => void
}) {
  const meta = TYPE_META[question.type]
  const Icon = meta.icon
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mb-2 flex items-center gap-2">
        <Badge tone={meta.tone}>
          <Icon className="mr-1 size-3.5" />
          {meta.label}
        </Badge>
        <Input
          className="max-w-56 font-mono"
          value={question.name}
          placeholder="name"
          aria-label="Question name"
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <div className="ml-auto flex items-center">
          <Button variant="ghost" className="px-1.5" disabled={first} onClick={() => onMove(-1)} aria-label="Move up">
            <ChevronUp className="size-4" />
          </Button>
          <Button variant="ghost" className="px-1.5" disabled={last} onClick={() => onMove(1)} aria-label="Move down">
            <ChevronDown className="size-4" />
          </Button>
          <Button variant="danger" className="px-1.5" onClick={onRemove} aria-label="Remove question">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label text="Instructions" hint={question.type === 'noul' ? 'or criteria' : 'optional'}>
          <TextArea
            rows={1}
            value={question.instructions ?? ''}
            placeholder={meta.hint}
            onChange={(event) => onChange({ instructions: event.target.value })}
          />
        </Label>

        {question.type === 'noul' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Label text="whenTrue" hint="optional">
              <Input
                value={question.whenTrue ?? ''}
                placeholder="What holds when the answer is yes"
                onChange={(event) => onChange({ whenTrue: event.target.value })}
              />
            </Label>
            <Label text="whenFalse" hint="optional">
              <Input
                value={question.whenFalse ?? ''}
                placeholder="What holds when the answer is no"
                onChange={(event) => onChange({ whenFalse: event.target.value })}
              />
            </Label>
          </div>
        )}

        {question.type === 'choice' && (
          <ListEditor
            title="Options"
            items={question.options ?? []}
            min={1}
            onChange={(options) => onChange({ options })}
            create={(): OptionSpec => ({ label: '' })}
            render={(option, set) => (
              <>
                <Input
                  className="max-w-48 font-mono"
                  value={option.label}
                  placeholder="label"
                  onChange={(event) => set({ ...option, label: event.target.value })}
                />
                <Input
                  value={option.description ?? ''}
                  placeholder="Description (raises confidence)"
                  onChange={(event) => set({ ...option, description: event.target.value })}
                />
              </>
            )}
          />
        )}

        {question.type === 'score' && (
          <ListEditor
            title="Levels (ordered, from 0)"
            items={question.levels ?? []}
            min={2}
            onChange={(levels) => onChange({ levels })}
            create={() => ''}
            render={(level, set, index) => (
              <>
                <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-500">{index}</span>
                <Input value={level} placeholder={`Level ${index}`} onChange={(event) => set(event.target.value)} />
              </>
            )}
          />
        )}
      </div>
    </div>
  )
}

function ListEditor<T>({ title, items, min, onChange, create, render }: {
  title: string
  items: T[]
  min: number
  onChange: (items: T[]) => void
  create: () => T
  render: (item: T, set: (item: T) => void, index: number) => ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{title}</span>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {render(item, (next) => onChange(items.map((current, i) => (i === index ? next : current))), index)}
          <Button
            variant="ghost"
            className="px-1.5"
            disabled={items.length <= min}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            aria-label="Remove entry"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...items, create()])}>
        <Plus className="size-3.5" /> Add
      </Button>
    </div>
  )
}
