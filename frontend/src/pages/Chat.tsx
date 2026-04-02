import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { DebugPanel } from '../components/chat/DebugPanel'
import { useChatStore } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'
import { api } from '../api/client'
import type { DebugInfo, Message } from '../types'
import { Plus } from 'lucide-react'

interface StreamState {
  text: string
  debug: DebugInfo | null
  done: boolean
  error: string | null
}

export default function ChatPage() {
  const { messages, sessionId, sendStreamMessage, clearMessages, addMessage, updateSessionId } = useChatStore()
  const { current, fetchCurrent } = useModelStore()
  const [streaming, setStreaming] = useState<StreamState | null>(null)
  const [showDebug, setShowDebug] = useState(true)
  const [intentSelectorEnabled, setIntentSelectorEnabled] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [lastDebug, setLastDebug] = useState<DebugInfo | null>(null)

  useEffect(() => {
    fetchCurrent()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming?.text])

  const handleSend = async (content: string, intent?: string, intentMode?: string) => {
    const currentSessionId = sessionId || undefined

    setStreaming({ text: '', debug: null, done: false, error: null })
    setLastDebug(null)

    let fullText = ''
    let newSessionId = currentSessionId

    try {
      const requestBody: { message: string; session_id?: string; intent?: string; intent_mode?: string } = {
        message: content,
        session_id: currentSessionId,
      }
      if (intent && intentMode) {
        requestBody.intent = intent
        requestBody.intent_mode = intentMode
      }

      await api.chatStream(
        requestBody,
        (text) => {
          fullText += text
          setStreaming(s => s ? { ...s, text: fullText } : null)
        },
        (debug) => {
          setLastDebug(debug as DebugInfo)
        },
        (sid) => {
          newSessionId = sid
          updateSessionId(sid)
        }
      )

      setStreaming({ text: fullText, debug: lastDebug, done: true, error: null })
      sendStreamMessage(content, fullText, newSessionId)
    } catch (e) {
      console.error('Chat error:', e)
      const errorMessage = e instanceof Error ? e.message : '未知错误'
      setStreaming({ text: '', debug: null, done: true, error: errorMessage })
      addMessage({ role: 'assistant', content: `抱歉，发生了错误：${errorMessage}，请重试。`, timestamp: new Date().toISOString() })
    }
  }

  const allMessages: Message[] = [
    ...messages,
    ...(streaming && !streaming.done
      ? [{ role: 'assistant' as const, content: streaming.text || '思考中...', timestamp: new Date().toISOString() }]
      : []),
  ]

  const rounds = messages.filter(m => m.role === 'user').length

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg">对话测试</h1>
            {sessionId && (
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIntentSelectorEnabled(e => !e)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                intentSelectorEnabled ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500'
              }`}
            >
              {intentSelectorEnabled ? '隐藏意图选择' : '显示意图选择'}
            </button>
            <button
              onClick={() => setShowDebug(d => !d)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                showDebug ? 'bg-gray-100 border-gray-300' : 'border-gray-200'
              }`}
            >
              {showDebug ? '隐藏调试' : '显示调试'}
            </button>
            <button
              onClick={() => {
                clearMessages()
                setStreaming(null)
                setLastDebug(null)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              <Plus size={16} /> 新对话
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {allMessages.length === 0 && !streaming && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>发送消息开始对话</p>
            </div>
          )}

          {allMessages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              intent={i === allMessages.length - 1 ? lastDebug?.intent : undefined}
              latency={i === allMessages.length - 1 ? lastDebug?.latency_ms : undefined}
              isStreaming={!!(streaming && !streaming.done && i === allMessages.length - 1)}
            />
          ))}

          <div ref={bottomRef} />
        </div>

        <ChatInput onSend={handleSend} disabled={!!streaming} intentSelectorEnabled={intentSelectorEnabled} />
      </div>

      <DebugPanel
        debug={lastDebug}
        currentModel={current}
        rounds={rounds}
        collapsed={!showDebug}
      />
    </div>
  )
}
