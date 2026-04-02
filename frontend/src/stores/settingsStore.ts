import { create } from 'zustand'
import type { ConfigSchemaGrouped, ConfigValues } from '../types'
import { api } from '../api/client'

interface SettingsState {
  schema: ConfigSchemaGrouped
  values: ConfigValues
  history: Array<{ key: string; old_value: string | null; new_value: string; timestamp: string }>
  loading: boolean
  fetchSchema: () => Promise<void>
  fetchValues: () => Promise<void>
  fetchHistory: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  updateBatch: (updates: Record<string, string>) => Promise<void>
  resetAll: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  schema: {},
  values: {},
  history: [],
  loading: false,

  fetchSchema: async () => {
    const { schema } = await api.getSettingsSchema()
    set({ schema })
  },

  fetchValues: async () => {
    set({ loading: true })
    try {
      const { settings } = await api.getSettings()
      set({ values: settings })
    } finally {
      set({ loading: false })
    }
  },

  fetchHistory: async () => {
    const { history } = await api.getSettingsHistory()
    set({ history })
  },

  updateSetting: async (key: string, value: string) => {
    set({ loading: true })
    try {
      const { setting } = await api.updateSetting(key, value)
      set({ values: setting })
    } finally {
      set({ loading: false })
    }
  },

  updateBatch: async (updates: Record<string, string>) => {
    set({ loading: true })
    try {
      const { settings } = await api.updateSettings(updates)
      set({ values: settings })
    } finally {
      set({ loading: false })
    }
  },

  resetAll: async () => {
    set({ loading: true })
    try {
      const { settings } = await api.resetSettings()
      set({ values: settings })
    } finally {
      set({ loading: false })
    }
  },
}))
