import { useEffect, useState } from 'react'
import { ModelCard } from '../components/models/ModelCard'
import { useModelStore } from '../stores/modelStore'
import { useMonitorStore } from '../stores/monitorStore'
import { RefreshCw } from 'lucide-react'

export default function ModelsPage() {
  const { models, current, fetchModels, fetchCurrent, switchTo } = useModelStore()
  const { stats, fetchStats } = useMonitorStore()
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    fetchModels()
    fetchCurrent()
    fetchStats()
  }, [])

  const handleSwitch = async (modelId: string) => {
    setSwitching(true)
    try {
      await switchTo(modelId)
      await fetchCurrent()
    } finally {
      setSwitching(false)
      setShowConfirm(null)
    }
  }

  const handleCustomConfig = async (id: string, baseUrl: string, modelName: string) => {
    console.log('Custom config:', { id, baseUrl, modelName })
  }

  const currentModel = models.find(m => m.id === current)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">模型管理</h1>
            <p className="text-gray-500 text-sm mt-1">
              当前模型: <span className="font-medium text-blue-600">{currentModel?.name || current}</span>
              {stats && <span className="ml-4 text-gray-400">今日请求: {stats.today_requests}</span>}
            </p>
          </div>
          <button
            onClick={() => { fetchModels(); fetchCurrent(); fetchStats() }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw size={16} /> 刷新
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              isCurrent={current === model.id}
              onSwitch={id => setShowConfirm(id)}
              onCustomConfig={handleCustomConfig}
            />
          ))}
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="font-bold text-lg mb-2">确认切换模型</h3>
              <p className="text-gray-600 text-sm mb-4">
                确定要切换到 {models.find(m => m.id === showConfirm)?.name} 吗？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSwitch(showConfirm)}
                  disabled={switching}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {switching ? '切换中...' : '确认'}
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
