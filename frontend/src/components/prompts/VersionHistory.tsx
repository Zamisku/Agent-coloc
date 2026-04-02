import type { PromptHistory } from '../../types'
import { X } from 'lucide-react'

interface Props {
  history: PromptHistory[]
  onClose: () => void
  onRollback: (version: number) => void
  loading: boolean
}

export function VersionHistory({ history, onClose, onRollback, loading }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold">版本历史</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400">暂无版本历史</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((entry, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">v{entry.version}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.updated_at).toLocaleString()}
                    </span>
                  </div>

                  {entry.changes.system_prompt && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">System Prompt:</span>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 truncate">
                        {entry.changes.system_prompt.old.slice(0, 80)}...
                      </p>
                    </div>
                  )}

                  {entry.changes.user_template && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">User Template:</span>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 truncate">
                        {entry.changes.user_template.old.slice(0, 80)}...
                      </p>
                    </div>
                  )}

                  {i < history.length - 1 && (
                    <button
                      onClick={() => onRollback(entry.version)}
                      disabled={loading}
                      className="mt-2 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      回滚到此版本
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
