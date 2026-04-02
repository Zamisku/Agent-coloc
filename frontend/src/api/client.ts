import type {
  ModelInfo,
  MonitorStats,
  RequestLogEntry,
  PromptTemplate,
  PromptHistory,
  ConfigSchemaGrouped,
  ConfigValues,
  ConfigChange,
  ChatRequest,
  ChatResponse,
} from '../types'

const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  chat: (data: ChatRequest): Promise<ChatResponse> =>
    request('/api/chat', { method: 'POST', body: JSON.stringify(data) }),

  chatStream: (data: ChatRequest, onMessage: (text: string) => void, onDebug: (debug: unknown) => void) => {
    return fetch(`${BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => {
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) return
          const chunk = decoder.decode(value)
          chunk.split('\n').forEach(line => {
            if (!line.startsWith('event:')) return
            const [, type] = line.split('event:')
            reader.read().then(({ done: d2, value: v2 }) => {
              if (d2) return
              const data = decoder.decode(v2)
              if (type.trim() === 'message') onMessage(data)
              if (type.trim() === 'debug') onDebug(JSON.parse(data))
            })
          })
          read()
        })
      }
      read()
    })
  },

  getModels: (): Promise<{ models: ModelInfo[] }> => request('/api/models'),

  getCurrentModel: (): Promise<{ current: string; provider: string; model: string }> => request('/api/models/current'),

  switchModel: (modelId: string, provider?: string): Promise<{ current: string; provider: string; model: string }> =>
    request('/api/models/current', { method: 'PUT', body: JSON.stringify({ model_id: modelId, provider }) }),

  // Provider APIs
  getProviders: (): Promise<{ providers: any[]; mode: string; active: string; multi: string[] }> =>
    request('/api/providers'),

  getProviderModels: (name: string): Promise<{ provider: string; models: string[]; default: string }> =>
    request(`/api/providers/${name}/models`),

  setLlmMode: (mode: string): Promise<{ mode: string }> =>
    request('/api/llm-mode', { method: 'PUT', body: JSON.stringify({ mode }) }),

  updateProviderConfig: (name: string, config: { api_key?: string; model?: string; base_url?: string }): Promise<any> =>
    request(`/api/providers/${name}/config`, { method: 'PUT', body: JSON.stringify(config) }),

  getProvidersHealth: (): Promise<{ health: Record<string, string> }> =>
    request('/api/providers/health'),

  getMonitorStats: (): Promise<{ stats: MonitorStats }> => request('/api/monitor/stats'),

  getMonitorLogs: (limit = 50, intent?: string): Promise<{ logs: RequestLogEntry[] }> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (intent) params.set('intent', intent)
    return request(`/api/monitor/logs?${params}`)
  },

  getHealthCheck: (): Promise<{ status: string; components: Record<string, string> }> =>
    request('/api/monitor/health'),

  getPrompts: (): Promise<{ prompts: PromptTemplate[] }> => request('/api/prompts'),

  getPrompt: (name: string): Promise<{ prompt: PromptTemplate }> =>
    request(`/api/prompts/${name}`),

  updatePrompt: (name: string, data: { system_prompt?: string; user_template?: string }): Promise<{ prompt: PromptTemplate }> =>
    request(`/api/prompts/${name}`, { method: 'PUT', body: JSON.stringify(data) }),

  testPrompt: (name: string, testInput: string): Promise<{ result: unknown }> =>
    request(`/api/prompts/${name}/test`, { method: 'POST', body: JSON.stringify({ test_input: testInput }) }),

  getPromptHistory: (name: string): Promise<{ history: PromptHistory[] }> =>
    request(`/api/prompts/history/${name}`),

  getSettingsSchema: (): Promise<{ schema: ConfigSchemaGrouped }> =>
    request('/api/settings/schema'),

  getSettings: (): Promise<{ settings: ConfigValues }> => request('/api/settings'),

  updateSettings: (data: Record<string, string>): Promise<{ settings: ConfigValues; restart_required: string[] }> =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  updateSetting: (key: string, value: string): Promise<{ setting: ConfigValues; restart_required: boolean }> =>
    request(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

  getSettingsHistory: (): Promise<{ history: ConfigChange[] }> => request('/api/settings/history'),

  resetSettings: (): Promise<{ settings: ConfigValues }> =>
    request('/api/settings/reset', { method: 'POST', body: JSON.stringify({ confirm: true }) }),
}
