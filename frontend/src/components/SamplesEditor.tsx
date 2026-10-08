import { sampleStates, useWorkspace } from '../workspace'
import { Card, Hint, TextArea } from './ui'

export function SamplesEditor({ title, hint }: { title: string; hint: string }) {
  const { samples, setSamples } = useWorkspace()
  const count = sampleStates(samples).length
  return (
    <Card title={`${title} (${count})`}>
      <div className="space-y-2">
        <TextArea
          rows={7}
          value={samples.join('\n')}
          onChange={(event) => setSamples(event.target.value.split('\n'))}
          placeholder="One state per line"
        />
        <Hint>{hint}</Hint>
      </div>
    </Card>
  )
}
