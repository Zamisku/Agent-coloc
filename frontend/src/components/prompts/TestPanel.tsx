import { useState } from 'react'

interface TestResult {
  type: string
  data: Record<string, unknown>
  timestamp: string
}

interface Props {
  onTest: (input: string) => Promise<void>
  results: TestResult[]
  testing: boolean
}

export function TestPanel({ onTest, results, testing }: Props) {
  const [input, setInput] = useState('')

  const handleTest = () => {
    if (input.trim() && !testing) {
      onTest(input.trim())
    }
  }

  const formatResult = (result: TestResult) => {
    if (result.type === 'classifier') {
      const d = result.data as { intent?: string; domain?: string }
      return (
        <div className="space-y-1">
          {d.intent && (
            <div className="flex gap-2">
              <span className="text-gray-500">意图:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">{d.intent}</span>
            </div>
          )}
          {d.domain && (
            <div className="flex gap-2">
              <span className="text-gray-500">领域:</span>
              <span>{d.domain}</span>
            </div>
          )}
        </div>
      )
    }
    if (result.type === 'rewriter') {
      const d = result.data as { rewritten_query?: string }
      return (
        <div className="font-mono text-sm bg-gray-50 p-2 rounded border">
          {d.rewritten_query || '无输出'}
        </div>
      )
    }
    if (result.type === 'generator') {
      const d = result.data as { response?: string; sources?: string[] }
      return (
        <div className="space-y-2">
          <p className="text-sm whitespace-pre-wrap">{d.response || '无输出'}</p>
          {d.sources && d.sources.length > 0 && (
            <div className="text-xs text-gray-400">
              来源: {d.sources.join(', ')}
            </div>
          )}
        </div>
      )
    }
    return <pre className="text-xs">{JSON.stringify(result.data, null, 2)}</pre>
  }

  return (
    <div className="w-72 border-l border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-sm mb-3">测试面板</h3>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入测试内容..."
          rows={3}
          className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleTest}
          disabled={!input.trim() || testing}
          className="w-full mt-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          {testing ? '测试中...' : '运行测试'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">暂无测试记录</p>
        )}
        {results.slice(-5).reverse().map((result, i) => (
          <div key={i} className="bg-white rounded-lg border p-3 text-sm">
            <div className="text-xs text-gray-400 mb-2">
              {new Date(result.timestamp).toLocaleTimeString()}
            </div>
            {formatResult(result)}
          </div>
        ))}
      </div>
    </div>
  )
}
