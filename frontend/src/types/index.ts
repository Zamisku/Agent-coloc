export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  description: string
}

export interface MonitorStats {
  total_requests: number
  today_requests: number
  avg_latency_ms: number
  error_rate: number
  intent_distribution: Record<string, number>
  hourly_requests: Array<{ hour: string; count: number }>
  current_model: string
  uptime_seconds: number
}

export interface RequestLogEntry {
  session_id: string
  user_query: string
  intent: string | null
  domain: string | null
  response_text: string
  total_latency_ms: number
  timestamp: string
}

export interface PromptTemplate {
  name: string
  description: string
  system_prompt?: string
  user_template?: string
  version: number
}

export interface PromptHistory {
  version: number
  changes: {
    system_prompt?: { old: string; new: string; updated_at: string }
    user_template?: { old: string; new: string; updated_at: string }
  }
  updated_at: string
}

export interface ConfigSchemaEntry {
  group: string
  label: string
  type: 'secret' | 'select' | 'url' | 'number' | 'boolean' | 'text'
  description: string
  required?: boolean
  default?: string
  options?: string[]
  min?: number
  max?: number
  step?: number
  restart_required?: boolean
}

export interface ConfigSchema {
  [key: string]: ConfigSchemaEntry
}

export interface ConfigSchemaGrouped {
  [group: string]: (ConfigSchemaEntry & { key: string })[]
}

export interface ConfigValues {
  [key: string]: string
}

export interface ConfigChange {
  key: string
  old_value: string | null
  new_value: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  session_id?: string
  user_id?: string
}

export interface ChatResponse {
  session_id: string
  reply: string
  sources: Array<{
    content: string
    score: number
    source: string
    metadata: Record<string, unknown>
  }>
  intent?: string
  debug?: {
    intent?: string
    domain?: string
    rewritten_query?: string
    retrieval_quality?: string
    top_relevance_score?: number
    latency_ms?: number
  }
}

export interface DebugInfo {
  intent?: string
  domain?: string
  rewritten_query?: string
  retrieval_quality?: string
  top_relevance_score?: number
  latency_ms?: number
}
