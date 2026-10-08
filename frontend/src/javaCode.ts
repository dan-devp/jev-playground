import type { JevState, QuestionSpec } from './api/types'

const str = (value: string) => JSON.stringify(value)

function questionCode(question: QuestionSpec): string {
  const pad = '\t\t'
  if (question.type === 'noul') {
    if (!question.whenTrue && !question.whenFalse && question.instructions) {
      return `Noul.of(${str(question.instructions)})`
    }
    const lines = ['Noul.builder()']
    if (question.instructions) lines.push(`${pad}.instructions(${str(question.instructions)})`)
    if (question.whenTrue) lines.push(`${pad}.whenTrue(${str(question.whenTrue)})`)
    if (question.whenFalse) lines.push(`${pad}.whenFalse(${str(question.whenFalse)})`)
    lines.push(`${pad}.build()`)
    return lines.join('\n')
  }
  if (question.type === 'choice') {
    const lines = ['Choice.builder()']
    if (question.instructions) lines.push(`${pad}.instructions(${str(question.instructions)})`)
    for (const option of question.options ?? []) {
      lines.push(
        option.description
          ? `${pad}.option(${str(option.label)}, ${str(option.description)})`
          : `${pad}.option(${str(option.label)})`,
      )
    }
    lines.push(`${pad}.build()`)
    return lines.join('\n')
  }
  if (question.instructions) {
    const levels = (question.levels ?? []).map(str).join(', ')
    return `Score.of(${str(question.instructions)},\n${pad}${levels})`
  }
  const lines = ['Score.builder()']
  for (const level of question.levels ?? []) lines.push(`${pad}.level(${str(level)})`)
  lines.push(`${pad}.build()`)
  return lines.join('\n')
}

function stateCode(state: JevState): string {
  if (typeof state === 'string') return str(state)
  // Objects and arrays go through JsonContent; the SDK serialises them as given.
  return `JsonContent.of(jsonMapper.readValue(${str(JSON.stringify(state))}, Object.class))`
}

export function toJava(state: JevState, questions: QuestionSpec[], model: string): string {
  const lines = ['SystemOneResponse response = typeSafeClient.systemOne(SystemOneRequest.builder()']
  lines.push(`\t.state(${stateCode(state)})`)
  if (model) lines.push(`\t.model(${str(model)})`)
  for (const question of questions) {
    lines.push(`\t.question(${str(question.name)}, ${questionCode(question)})`)
  }
  lines.push('\t.build());')
  return lines.join('\n')
}
