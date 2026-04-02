import type { ConfigChange } from '../../types'

interface Props {
  history: ConfigChange[]
}

export function ChangeHistory({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
        暂无变更记录
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-bold text-sm">变更历史</h3>
      </div>
      <div className="p-4">
        <div className="relative">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {history.map((entry, i) => (
              <div key={i} className="relative pl-6">
                <div className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-blue-500" />
                <div className="text-xs text-gray-400 mb-1">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">{entry.key}</span>
                  <div className="text-gray-500 mt-0.5">
                    <span className="line-through text-red-400">{entry.old_value || '(空)'}</span>
                    <span className="mx-1">→</span>
                    <span className="text-green-600">{entry.new_value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
