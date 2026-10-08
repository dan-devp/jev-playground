import { AlertTriangle, Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { ApiError } from '../api/client'
import { cx } from '../util'

export function Card({ title, actions, children, className }: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-500 disabled:bg-violet-400 dark:disabled:bg-violet-900',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950',
}

export function Button({
  variant = 'secondary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-xs outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(FIELD, className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(FIELD, 'resize-y', className)} {...props} />
}

export function Label({ text, hint, children }: { text: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
        {text}
        {hint && <span className="font-normal text-slate-400 dark:text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function NumberField({ label, value, onChange, min, max, step, hint }: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  hint?: ReactNode
}) {
  return (
    <Label text={label} hint={hint}>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </Label>
  )
}

export function Badge({ children, tone = 'slate' }: {
  children: ReactNode
  tone?: 'slate' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky'
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  }
  return (
    <span className={cx('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  )
}

/** A horizontal 0–1 bar, optionally with a threshold tick. */
export function Bar({ value, threshold, tone = 'violet' }: {
  value: number
  threshold?: number
  tone?: 'violet' | 'emerald' | 'amber' | 'rose' | 'slate'
}) {
  const fills = {
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-400',
  }
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={cx('h-2 rounded-full', fills[tone])} style={{ width: `${clamped * 100}%` }} />
      {threshold !== undefined && (
        <div
          className="absolute -top-1 h-4 w-0.5 bg-slate-900 dark:bg-slate-100"
          style={{ left: `${Math.max(0, Math.min(1, threshold)) * 100}%` }}
          title={`Threshold ${threshold}`}
        />
      )}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const apiError = error instanceof ApiError ? error : null
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 shrink-0" />
        {apiError ? `${apiError.title}${apiError.status ? ` (${apiError.status})` : ''}` : 'Error'}
      </div>
      <p className="mt-1 break-words">{error instanceof Error ? error.message : String(error)}</p>
      {apiError && apiError.details.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-xs">
          {apiError.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{children}</p>
}
