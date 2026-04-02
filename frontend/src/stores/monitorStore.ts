import { create } from 'zustand'
import type { MonitorStats, RequestLogEntry } from '../types'
import { api } from '../api/client'

interface MonitorState {
  stats: MonitorStats | null
  logs: RequestLogEntry[]
  health: { status: string; components: Record<string, string> } | null
  loading: boolean
  fetchStats: () => Promise<void>
  fetchLogs: (limit?: number, intent?: string) => Promise<void>
  fetchHealth: () => Promise<void>
}

export const useMonitorStore = create<MonitorState>((set) => ({
  stats: null,
  logs: [],
  health: null,
  loading: false,

  fetchStats: async () => {
    set({ loading: true })
    try {
      const { stats } = await api.getMonitorStats()
      set({ stats })
    } finally {
      set({ loading: false })
    }
  },

  fetchLogs: async (limit = 50, intent?: string) => {
    set({ loading: true })
    try {
      const { logs } = await api.getMonitorLogs(limit, intent)
      set({ logs })
    } finally {
      set({ loading: false })
    }
  },

  fetchHealth: async () => {
    const health = await api.getHealthCheck()
    set({ health })
  },
}))
