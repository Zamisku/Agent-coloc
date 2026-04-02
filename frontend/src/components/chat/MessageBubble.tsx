import type { Message } from '../../types'

interface Props {
  message: Message
  intent?: string
  latency?: number
  isStreaming?: boolean
}

export function MessageBubble({ message, intent, latency, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const isThinking = message.content === '思考中...'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
        }`}
      >
        {isThinking ? (
          <div className="flex items-center gap-1">
            <span className="thinking-dot animate-bounce [animation-delay:-0.16s]">.</span>
            <span className="thinking-dot animate-bounce [animation-delay:-0.32s]">.</span>
            <span className="thinking-dot animate-bounce">.</span>
          </div>
        ) : (
          <p className={`whitespace-pre-wrap break-words ${isStreaming ? 'streaming-text' : ''}`}>
            {message.content}
          </p>
        )}
        {!isUser && (intent || latency) && (
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 flex gap-2">
            {intent && <span className="bg-gray-100 px-2 py-0.5 rounded">{intent}</span>}
            {latency && <span>{latency}ms</span>}
          </div>
        )}
      </div>
    </div>
  )
}
