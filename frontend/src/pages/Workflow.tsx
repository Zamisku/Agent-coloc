import { useEffect, useState, useRef } from 'react'
import { Play, RotateCcw, MessageSquare } from 'lucide-react'

interface NodeState {
  name: string
  label: string
  description: string
}

interface NodeStatus {
  name: string
  status: 'pending' | 'active' | 'completed'
  state?: Record<string, unknown>
}

const WORKFLOW_NODES: NodeState[] = [
  { name: 'classify', label: '意图分类', description: '识别用户问题类型' },
  { name: 'rewrite', label: 'Query 改写', description: '优化搜索查询' },
  { name: 'retrieve', label: 'RAG 检索', description: '从知识库检索相关内容' },
  { name: 'evaluate', label: '质量评估', description: '评估检索结果质量' },
  { name: 'generate', label: '答案生成', description: '生成最终回复' },
  { name: 'tool_call', label: '工具调用', description: '执行工具并返回结果' },
  { name: 'clarify', label: '追问生成', description: '引导用户补充信息' },
  { name: 'fallback', label: '兜底回复', description: '无相关内容时的回复' },
]

const MAIN_FLOW = ['classify', 'rewrite', 'retrieve', 'evaluate']

function getInitialStatus(): Record<string, NodeStatus> {
  const status: Record<string, NodeStatus> = {}
  for (const node of WORKFLOW_NODES) {
    status[node.name] = { name: node.name, status: 'pending' }
  }
  return status
}

export default function WorkflowPage() {
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>(getInitialStatus())
  const [currentState, setCurrentState] = useState<Record<string, unknown> | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [response, setResponse] = useState<string | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)

  const reset = () => {
    setNodeStatus(getInitialStatus())
    setCurrentState(null)
    setError(null)
    setLatencyMs(null)
    setResponse(null)
  }

  const runWorkflow = async () => {
    if (!query.trim()) return

    reset()
    setLoading(true)

    try {
      const response = await fetch('/api/workflow/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')
      readerRef.current = reader

      let buffer = ''

      const read = async () => {
        if (!readerRef.current) return
        const { done, value } = await readerRef.current.read()
        if (done) return

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          // 跳过 event: 行，只处理 data: 行
          if (trimmed.startsWith('event:')) {
            continue
          }

          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5))

              if (data.status === 'active' || data.status === 'completed') {
                setNodeStatus(prev => ({
                  ...prev,
                  [data.data]: { name: data.data, status: data.status, state: data.state },
                }))
              }

              if (data.latency_ms) {
                setLatencyMs(data.latency_ms)
              }

              if (data.response) {
                setResponse(data.response)
              }

              if (data.state) {
                setCurrentState(data.state)
              }

              if (data.intent) {
                setCurrentState(prev => prev ? { ...prev, intent: data.intent } : null)
              }

              if (data.error) {
                setError(data.error)
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }

        read()
      }

      read()
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel()
      }
    }
  }, [])

  const statusStyles = {
    pending: 'bg-gray-100 text-gray-400 border-gray-200',
    active: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200 scale-105',
    completed: 'bg-green-500 text-white border-green-500',
  }

  const statusIcons = {
    pending: '',
    active: '◉',
    completed: '✓',
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="font-bold text-lg">工作流程</h1>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-2 max-w-3xl">
          <div className="flex-1 relative">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && runWorkflow()}
              placeholder="输入测试问题..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={runWorkflow}
            disabled={loading || !query.trim()}
            className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            {loading ? '执行中...' : '执行'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* 主流程 */}
          <div className="mb-12">
            <h2 className="text-sm font-medium text-gray-500 mb-4">主流程</h2>
            <div className="flex items-center justify-between">
              {WORKFLOW_NODES.filter(n => MAIN_FLOW.includes(n.name)).map((node, index, arr) => (
                <div key={node.name} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${statusStyles[nodeStatus[node.name]?.status || 'pending']}`}
                    >
                      <span className="text-xs font-medium">{node.label}</span>
                      {nodeStatus[node.name]?.status !== 'pending' && (
                        <span className="text-lg mt-1">{statusIcons[nodeStatus[node.name]?.status || 'pending']}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-2 max-w-[80px] text-center">{node.description}</span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className="w-12 h-0.5 bg-gray-200 mx-2">
                      <div className={`h-full bg-green-500 transition-all duration-300 ${nodeStatus[node.name]?.status === 'completed' ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 分支 */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-4">评估分支</h2>
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center">
                <div className={`w-20 h-0.5 transition-all duration-300 ${nodeStatus['evaluate']?.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
              </div>

              {['generate', 'clarify', 'fallback'].map((branchName, branchIndex) => {
                const branchNode = WORKFLOW_NODES.find(n => n.name === branchName)!
                const status = nodeStatus[branchName]?.status || 'pending'
                const isActive = nodeStatus['evaluate']?.status === 'completed'

                return (
                  <div key={branchName} className="flex flex-col items-center">
                    <div className="h-8 flex items-center">
                      {branchIndex > 0 && (
                        <div className={`w-4 h-0.5 transition-all duration-300 ${isActive && status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div
                      className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${isActive ? statusStyles[status] : 'bg-gray-50 text-gray-300 border-gray-200'}`}
                    >
                      <span className="text-xs font-medium text-center px-2">{branchNode.label}</span>
                      {status !== 'pending' && (
                        <span className="text-lg mt-1">{statusIcons[status]}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-2 max-w-[80px] text-center">{branchNode.description}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 图例 */}
          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-100 border-2 border-gray-200" />
              <span className="text-sm text-gray-500">等待中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500" />
              <span className="text-sm text-gray-500">执行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500" />
              <span className="text-sm text-gray-500">已完成</span>
            </div>
          </div>

          {/* 当前状态 */}
          {currentState && Object.keys(currentState).length > 0 && (
            <div className="mt-8 p-4 bg-gray-900 text-white rounded-xl text-sm font-mono">
              <div className="text-gray-400 mb-2">当前状态:</div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(currentState, null, 2)}</pre>
            </div>
          )}

          {/* 错误 */}
          {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              <div className="font-medium mb-1">执行错误</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* 响应结果 */}
          {response && (
            <div className="mt-8">
              <div className="text-sm font-medium text-gray-500 mb-2">
                生成结果 {latencyMs !== null && `(${latencyMs}ms)`}
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
