import { useState } from 'react'
import { IntentSelector } from '../intent/IntentSelector'

interface Props {
  onSend: (text: string, intent?: string, intentMode?: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [intent, setIntent] = useState<string | null>(null)
  const [intentMode, setIntentMode] = useState<'auto' | 'force' | 'suggest'>('auto')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !disabled) {
        onSend(text.trim(), intent || undefined, intentMode)
        setText('')
        setIntent(null)
        setIntentMode('auto')
      }
    }
  }

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim(), intent || undefined, intentMode)
      setText('')
      setIntent(null)
      setIntentMode('auto')
    }
  }

  return (
    <div className="flex flex-col">
      <IntentSelector
        selected={intent}
        mode={intentMode}
        onSelect={setIntent}
        onModeChange={setIntentMode}
      />
      <div className="flex gap-2 p-4 border-t border-gray-200 bg-white">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          发送
        </button>
      </div>
    </div>
  )
}
