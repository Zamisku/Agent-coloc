import { useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !disabled) {
        onSend(text.trim())
        setText('')
      }
    }
  }

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  return (
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
  )
}
