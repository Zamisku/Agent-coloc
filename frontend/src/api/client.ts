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

const BASE = import.meta.env.VITE_API_BASE || ''

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

      let eventType = ''
      let dataBuffer = ''

      const processEvent = () => {
        if (eventType === 'message') {
          onMessage(dataBuffer)
        } else if (eventType === 'debug') {
          try {
            onDebug(JSON.parse(dataBuffer))
          } catch {}
        }
        eventType = ''
        dataBuffer = ''
      }

      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) return
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('event:')) {
              // 如果有之前的 event 但没有遇到空行，先处理它
              if (eventType && dataBuffer) {
                processEvent()
              }
              eventType = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              dataBuffer = line.slice(5).trim()
            } else if (line === '') {
              // 空行表示事件结束
              if (eventType && dataBuffer) {
                processEvent()
              }
            }
          }
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

  // Skills APIs
  getSkills: (): Promise<{ skills: Array<{ name: string; description: string; parameters: any[] }> }> =>
    request('/api/skills'),

  callSkill: (skill: string, params: Record<string, unknown>): Promise<{ success: boolean; result: string | null; error: string | null }> =>
    request('/api/skills/call', { method: 'POST', body: JSON.stringify({ skill, params }) }),

  // MCP APIs
  getMcpTools: (): Promise<{ tools: Array<{ name: string; description: string; inputSchema: any }> }> =>
    request('/api/mcp/tools'),

  callMcpTool: (name: string, arguments_: Record<string, unknown> = {}): Promise<any> =>
    request('/api/mcp/call', { method: 'POST', body: JSON.stringify({ name, arguments: arguments_ }) }),
}
