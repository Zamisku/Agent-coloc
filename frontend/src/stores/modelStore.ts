import { create } from 'zustand'
import type { ModelInfo } from '../types'
import { api } from '../api/client'

interface ModelState {
  models: ModelInfo[]
  current: string
  loading: boolean
  fetchModels: () => Promise<void>
  fetchCurrent: () => Promise<void>
  switchTo: (id: string) => Promise<void>
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  current: '',
  loading: false,

  fetchModels: async () => {
    set({ loading: true })
    try {
      const { models } = await api.getModels()
      set({ models })
    } finally {
      set({ loading: false })
    }
  },

  fetchCurrent: async () => {
    const { current } = await api.getCurrentModel()
    set({ current })
  },

  switchTo: async (id: string) => {
    set({ loading: true })
    try {
      await api.switchModel(id)
      set({ current: id })
    } finally {
      set({ loading: false })
    }
  },
}))
