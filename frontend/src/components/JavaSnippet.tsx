import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui'

export function JavaSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied; the code stays selectable.
    }
  }
  return (
    <div className="relative">
      <Button variant="ghost" className="absolute top-2 right-2" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 pr-12 font-mono text-xs leading-relaxed text-slate-100 [tab-size:4]">
        {code}
      </pre>
    </div>
  )
}
