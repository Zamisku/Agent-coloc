import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, { type: string; description?: string; default?: unknown }>
    required?: string[]
  }
}

interface CallResult {
  content?: Array<{ type: string; text: string }>
  isError?: boolean
  result?: any
  error?: any
}

export function MCPToolsPanel() {
  const [tools, setTools] = useState<MCPTool[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTool, setExpandedTool] = useState<string | null>(null)
  const [callingTool, setCallingTool] = useState<string | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, CallResult>>({})

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const res = await api.getMcpTools()
      setTools(res.tools)
    } catch (e) {
      console.error('Failed to load MCP tools:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCallTool = async (tool: MCPTool) => {
    setCallingTool(tool.name)

    try {
      const args: Record<string, unknown> = {}
      const properties = tool.inputSchema.properties || {}

      for (const [key, param] of Object.entries(properties)) {
        const value = paramValues[key]
        if (value) {
          try {
            args[key] = JSON.parse(value)
          } catch {
            args[key] = value
          }
        } else if (param.default !== undefined) {
          args[key] = param.default
        }
      }

      const res = await api.callMcpTool(tool.name, args)
      setResults(prev => ({ ...prev, [tool.name]: res.result || res }))
    } catch (e) {
      setResults(prev => ({ ...prev, [tool.name]: { error: String(e) } }))
    } finally {
      setCallingTool(null)
    }
  }

  const toggleExpand = (name: string) => {
    setExpandedTool(prev => prev === name ? null : name)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">MCP Tools</h2>
        <span className="text-sm text-gray-500">{tools.length} 个工具</span>
      </div>

      {tools.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无可用的 MCP Tools
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map(tool => (
            <div key={tool.name} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleExpand(tool.name)}
              >
                <div className="flex items-center gap-2">
                  {expandedTool === tool.name ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  <span className="font-medium">{tool.name}</span>
                </div>
                <button
                  className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCallTool(tool)
                  }}
                  disabled={callingTool !== null}
                >
                  {callingTool === tool.name ? '调用中...' : '调用'}
                </button>
              </div>

              {expandedTool === tool.name && (
                <div className="p-4 border-t">
                  <p className="text-gray-600 mb-4">{tool.description}</p>

                  {tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-medium">参数</h4>
                      {Object.entries(tool.inputSchema.properties).map(([key, param]) => (
                        <div key={key} className="grid grid-cols-3 gap-2 items-center">
                          <label className="text-sm">
                            {key}
                            {tool.inputSchema.required?.includes(key) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            placeholder={param.default !== undefined ? String(param.default) : param.type}
                            className="col-span-2 px-3 py-1 border rounded text-sm"
                            value={paramValues[key] || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                          <div className="col-start-2 col-span-2 text-xs text-gray-400">
                            {param.description || param.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {results[tool.name] !== undefined && (
                    <div className={`mt-4 p-3 rounded ${
                      results[tool.name]?.isError || results[tool.name]?.error
                        ? 'bg-red-50'
                        : 'bg-green-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {results[tool.name]?.isError || results[tool.name]?.error ? (
                          <XCircle size={16} className="text-red-500" />
                        ) : (
                          <CheckCircle size={16} className="text-green-500" />
                        )}
                        <span className="text-sm font-medium">
                          {results[tool.name]?.isError || results[tool.name]?.error ? '调用失败' : '调用成功'}
                        </span>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap bg-white p-2 rounded border overflow-auto max-h-40">
                        {results[tool.name]?.content?.[0]?.text ||
                         results[tool.name]?.result ||
                         results[tool.name]?.error ||
                         JSON.stringify(results[tool.name], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
