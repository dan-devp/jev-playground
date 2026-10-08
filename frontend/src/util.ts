export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export const fmt = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '–')
