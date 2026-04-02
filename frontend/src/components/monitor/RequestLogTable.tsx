import { useState } from 'react'
import type { RequestLogEntry } from '../../types'

interface Props {
  logs: RequestLogEntry[]
  intentFilter: string
  onFilterChange: (intent: string) => void
}

const intentColors: Record<string, string> = {
  score_query: 'bg-blue-100 text-blue-700',
  major_info: 'bg-green-100 text-green-700',
  admission_policy: 'bg-purple-100 text-purple-700',
  campus_life: 'bg-yellow-100 text-yellow-700',
  process_guide: 'bg-orange-100 text-orange-700',
  chitchat: 'bg-gray-100 text-gray-700',
  out_of_scope: 'bg-red-100 text-red-700',
  unclear: 'bg-pink-100 text-pink-700',
}

export function RequestLogTable({ logs, intentFilter, onFilterChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const intents = [...new Set(logs.map(l => l.intent).filter((i): i is string => Boolean(i)))]

  const displayLogs = showAll ? logs : logs.slice(0, 20)

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-bold">请求日志</h3>
        <select
          value={intentFilter}
          onChange={e => onFilterChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部意图</option>
          {intents.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">用户问题</th>
              <th className="px-4 py-3 font-medium">意图</th>
              <th className="px-4 py-3 font-medium">领域</th>
              <th className="px-4 py-3 font-medium">延迟</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayLogs.map((log, i) => (
              <>
                <tr
                  key={i}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{log.user_query}</td>
                  <td className="px-4 py-3">
                    {log.intent && (
                      <span className={`px-2 py-0.5 rounded text-xs ${intentColors[log.intent] || 'bg-gray-100'}`}>
                        {log.intent}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{log.domain || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono ${
                      log.total_latency_ms < 1000 ? 'text-green-600' :
                      log.total_latency_ms < 3000 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {log.total_latency_ms}ms
                    </span>
                  </td>
                </tr>
                {expanded === i && (
                  <tr key={`${i}-expanded`}>
                    <td colSpan={5} className="px-4 py-3 bg-gray-50">
                      <div className="text-xs">
                        <p className="font-medium text-gray-700 mb-1">完整回复:</p>
                        <p className="text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                          {log.response_text}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="p-8 text-center text-gray-400">暂无日志数据</div>
        )}

        {logs.length > 20 && !showAll && (
          <div className="p-3 border-t border-gray-200 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              加载更多（还有 {logs.length - 20} 条）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
