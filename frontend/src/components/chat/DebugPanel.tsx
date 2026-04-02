import type { DebugInfo } from '../../types'

interface Props {
  debug: DebugInfo | null
  currentModel: string
  rounds: number
  collapsed?: boolean
}

export function DebugPanel({ debug, currentModel, rounds, collapsed }: Props) {
  if (collapsed) return null

  return (
    <div className="w-60 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto text-xs font-mono">
      <h3 className="font-bold text-gray-700 mb-3 text-sm">调试信息</h3>

      <div className="space-y-2">
        <div>
          <span className="text-gray-500">模型:</span>
          <span className="ml-2 text-gray-800">{currentModel}</span>
        </div>
        <div>
          <span className="text-gray-500">轮数:</span>
          <span className="ml-2 text-gray-800">{rounds}</span>
        </div>

        {debug && (
          <>
            <div className="border-t border-gray-200 pt-2 mt-2">
              {debug.intent && (
                <div>
                  <span className="text-gray-500">意图:</span>
                  <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {debug.intent}
                  </span>
                </div>
              )}
              {debug.domain && (
                <div>
                  <span className="text-gray-500">领域:</span>
                  <span className="ml-2 text-gray-800">{debug.domain}</span>
                </div>
              )}
              {debug.rewritten_query && (
                <div>
                  <span className="text-gray-500">改写:</span>
                  <p className="ml-2 text-gray-700 bg-white p-1.5 rounded mt-1 border">
                    {debug.rewritten_query}
                  </p>
                </div>
              )}
              {debug.retrieval_quality && (
                <div>
                  <span className="text-gray-500">检索质量:</span>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded ${
                      debug.retrieval_quality === 'sufficient'
                        ? 'bg-green-100 text-green-700'
                        : debug.retrieval_quality === 'need_clarify'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {debug.retrieval_quality}
                  </span>
                </div>
              )}
              {debug.top_relevance_score != null && (
                <div>
                  <span className="text-gray-500">最高分:</span>
                  <span className="ml-2 text-gray-800">{debug.top_relevance_score.toFixed(3)}</span>
                </div>
              )}
              {debug.latency_ms && (
                <div>
                  <span className="text-gray-500">耗时:</span>
                  <span className="ml-2 text-gray-800">{debug.latency_ms}ms</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
