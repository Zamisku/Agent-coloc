import { create } from 'zustand'
import type { ModelInfo } from '../types'
import { api } from '../api/client'

interface ProviderInfo {
  name: string
  display_name: string
  models: string[]
  default_model: string
  current_model: string
  base_url: string
}

interface ModelState {
  models: ModelInfo[]
  current: string
  currentProvider: string
  currentModel: string
  providers: ProviderInfo[]
  llmMode: 'single' | 'multi'
  multiProviders: string[]
  loading: boolean
  fetchModels: () => Promise<void>
  fetchCurrent: () => Promise<void>
  fetchProviders: () => Promise<void>
  switchTo: (modelId: string, provider?: string) => Promise<void>
  setLlmMode: (mode: 'single' | 'multi') => Promise<void>
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  current: '',
  currentProvider: '',
  currentModel: '',
  providers: [],
  llmMode: 'single',
  multiProviders: [],
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
    try {
      const data = await api.getCurrentModel()
      set({
        current: data.current,
        currentProvider: data.provider,
        currentModel: data.model
      })
    } catch (e) {
      console.error('Failed to fetch current model:', e)
    }
  },

  fetchProviders: async () => {
    try {
      const data = await api.getProviders()
      set({
        providers: data.providers,
        llmMode: data.mode as 'single' | 'multi',
        multiProviders: data.multi
      })
    } catch (e) {
      console.error('Failed to fetch providers:', e)
    }
  },

  switchTo: async (modelId: string, provider?: string) => {
    set({ loading: true })
    try {
      const prov = provider || get().currentProvider
      await api.switchModel(modelId, prov)
      set({ current: `${prov}:${modelId}`, currentProvider: prov, currentModel: modelId })
    } finally {
      set({ loading: false })
    }
  },

  setLlmMode: async (mode: 'single' | 'multi') => {
    set({ loading: true })
    try {
      await api.setLlmMode(mode)
      set({ llmMode: mode })
      await get().fetchProviders()
    } finally {
      set({ loading: false })
    }
  },
}))
