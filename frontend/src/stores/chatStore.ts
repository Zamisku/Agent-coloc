import { create } from 'zustand'
import type { Message, ChatResponse } from '../types'
import { api } from '../api/client'

interface ChatState {
  messages: Message[]
  sessionId: string
  loading: boolean
  sendMessage: (content: string) => Promise<void>
  sendStreamMessage: (userContent: string, assistantContent: string) => Promise<void>
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: '',
  loading: false,

  sendMessage: async (content: string) => {
    set({ loading: true })
    const { sessionId } = get()
    try {
      const res: ChatResponse = await api.chat({ message: content, session_id: sessionId || undefined })
      set(s => ({
        messages: [
          ...s.messages,
          { role: 'user', content, timestamp: new Date().toISOString() },
          { role: 'assistant', content: res.reply, timestamp: new Date().toISOString() },
        ],
        sessionId: res.session_id,
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },

  sendStreamMessage: async (userContent: string, assistantContent: string) => {
    // userContent 和 assistantContent 已经在 Chat.tsx 的 handleSend 中通过流式读取收集完毕
    // 这里直接使用已收集的内容更新 messages
    set(s => ({
      messages: [
        ...s.messages,
        { role: 'user', content: userContent, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() },
      ],
      loading: false,
    }))
  },

  clearMessages: () => set({ messages: [], sessionId: '' }),
}))
