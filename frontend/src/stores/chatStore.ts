import { create } from 'zustand'
import type { Message, ChatResponse } from '../types'
import { api } from '../api/client'

interface ChatState {
  messages: Message[]
  sessionId: string
  loading: boolean
  sendMessage: (content: string) => Promise<void>
  sendStreamMessage: (userContent: string, assistantContent: string, newSessionId?: string) => Promise<void>
  addMessage: (message: Message) => void
  updateSessionId: (sessionId: string) => void
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

  sendStreamMessage: async (userContent: string, assistantContent: string, newSessionId?: string) => {
    set(s => {
      const newMessages = [
        ...s.messages,
        { role: 'user' as const, content: userContent, timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: assistantContent, timestamp: new Date().toISOString() },
      ]
      return {
        messages: newMessages,
        sessionId: newSessionId || s.sessionId,
        loading: false,
      }
    })
  },

  addMessage: (message: Message) => {
    set(s => ({
      messages: [...s.messages, message],
    }))
  },

  updateSessionId: (sessionId: string) => {
    set({ sessionId })
  },

  clearMessages: () => set({ messages: [], sessionId: '' }),
}))
