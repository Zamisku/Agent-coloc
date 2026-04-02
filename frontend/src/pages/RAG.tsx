import { useState } from 'react'
import { Search, Database, Settings, Copy, Check } from 'lucide-react'

interface RetrievedDoc {
  content: string
  score: number
  source: string
  metadata: Record<string, unknown>
}

export default function RAGPage() {
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('admission')
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RetrievedDoc[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [mockEnabled, setMockEnabled] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      // 调用后端测试接口
      const response = await fetch('/api/rag/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain, top_k: topK }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResults(data.documents || [])
    } catch (e) {
      console.error('RAG search failed:', e)
      setError(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const copyContent = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const domains = [
    { value: 'admission', label: '招生录取' },
    { value: 'academic', label: '学术专业' },
    { value: 'career', label: '职业就业' },
    { value: 'general', label: '综合咨询' },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="font-bold text-lg">RAG 检索测试</h1>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            showConfig ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Settings size={14} />
          {showConfig ? '隐藏配置' : '显示配置'}
        </button>
      </div>

      {showConfig && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4 max-w-3xl">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">模式</label>
              <select
                value={mockEnabled ? 'mock' : 'real'}
                onChange={e => setMockEnabled(e.target.value === 'mock')}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mock">Mock 模式</option>
                <option value="real">真实服务</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">领域</label>
              <select
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {domains.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Top K</label>
              <input
                type="number"
                value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                min={1}
                max={20}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">相关性阈值</label>
              <input
                type="number"
                placeholder="0.6"
                min={0}
                max={1}
                step={0.05}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">
              RAG 服务地址：
            </span>
            <code className="text-xs bg-gray-200 px-2 py-0.5 rounded">
              http://localhost:8081/api
            </code>
            <button className="text-xs text-blue-500 hover:text-blue-600">修改</button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-2 max-w-3xl">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="输入查询内容..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '检索中...' : '检索'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            检索失败: {error}
          </div>
        )}

        {results.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Database size={48} className="mb-4" />
            <p>输入查询内容开始检索</p>
            <p className="text-sm mt-1">或使用右侧配置调整检索参数</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">找到 {results.length} 条相关文档</span>
              <span className="text-xs text-gray-400">
                {mockEnabled ? 'Mock 模式' : '真实服务'}
              </span>
            </div>

            {results.map((doc, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      #{index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      相似度: {(doc.score * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">{doc.source}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyContent(doc.content, index)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="复制内容"
                    >
                      {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-800 leading-relaxed">{doc.content}</p>

                {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(doc.metadata).map(([key, value]) => (
                        <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              检索中...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
