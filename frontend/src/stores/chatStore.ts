import { create } from 'zustand'
import type { Message, ChatResponse } from '../types'
import { api } from '../api/client'

interface ChatState {
  messages: Message[]
  sessionId: string
  loading: boolean
  sendMessage: (content: string) => Promise<void>
  sendStreamMessage: (content: string, onToken: (t: string) => void) => Promise<void>
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

  sendStreamMessage: async (content: string, onToken: (t: string) => void) => {
    set({ loading: true })
    const { sessionId } = get()
    let full = ''
    try {
      await api.chatStream(
        { message: content, session_id: sessionId || undefined },
        token => {
          full += token
          onToken(token)
        },
        () => {}
      )
      set(s => ({
        messages: [
          ...s.messages,
          { role: 'user', content, timestamp: new Date().toISOString() },
          { role: 'assistant', content: full, timestamp: new Date().toISOString() },
        ],
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },

  clearMessages: () => set({ messages: [], sessionId: '' }),
}))
