import { Braces, Type } from 'lucide-react'
import { parseState, useWorkspace } from '../workspace'
import { Card, Hint, TextArea } from './ui'
import { cx } from '../util'

export function StateEditor({ hint }: { hint?: string }) {
  const { stateMode, stateText, setStateMode, setStateText } = useWorkspace()
  const parsed = parseState(stateMode, stateText)

  return (
    <Card
      title="State"
      actions={
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
          {(
            [
              ['text', 'Text', Type],
              ['json', 'JSON', Braces],
            ] as const
          ).map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStateMode(mode)}
              className={cx(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                stateMode === mode
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-2">
        <TextArea
          rows={stateMode === 'json' ? 8 : 4}
          className={cx(stateMode === 'json' && 'font-mono text-xs', !parsed.ok && 'border-rose-400')}
          value={stateText}
          spellCheck={stateMode === 'text'}
          onChange={(event) => setStateText(event.target.value)}
          placeholder={stateMode === 'json' ? '{ "ticket": "…" }' : 'The text Jev should judge …'}
        />
        {!parsed.ok && <p className="text-xs text-rose-600 dark:text-rose-400">{parsed.error}</p>}
        <Hint>
          {hint ??
            'What is being judged. All questions are answered in parallel against this state in a single call.'}
        </Hint>
      </div>
    </Card>
  )
}
