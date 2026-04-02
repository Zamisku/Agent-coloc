import { useEffect, useState } from 'react'
import { ModelCard } from '../components/models/ModelCard'
import { useModelStore } from '../stores/modelStore'
import { useMonitorStore } from '../stores/monitorStore'
import { RefreshCw, Zap, ZapOff } from 'lucide-react'

export default function ModelsPage() {
  const {
    models, currentProvider, currentModel,
    providers, llmMode,
    fetchModels, fetchCurrent, fetchProviders, switchTo, setLlmMode
  } = useModelStore()
  const { stats, fetchStats } = useMonitorStore()
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    fetchModels()
    fetchCurrent()
    fetchProviders()
    fetchStats()
  }, [])

  const handleSwitch = async (modelId: string, provider: string) => {
    setSwitching(true)
    try {
      await switchTo(modelId, provider)
    } finally {
      setSwitching(false)
      setShowConfirm(null)
    }
  }

  const handleModeSwitch = async () => {
    const newMode = llmMode === 'single' ? 'multi' : 'single'
    await setLlmMode(newMode)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">模型管理</h1>
            <p className="text-gray-500 text-sm mt-1">
              当前模型: <span className="font-medium text-blue-600">
                {currentProvider}/{currentModel}
              </span>
              {stats && <span className="ml-4 text-gray-400">今日请求: {stats.today_requests}</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleModeSwitch}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                llmMode === 'multi'
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'border-gray-300 text-gray-600'
              }`}
              title={llmMode === 'single' ? '切换到多源模式' : '切换到单源模式'}
            >
              {llmMode === 'multi' ? <Zap size={16} /> : <ZapOff size={16} />}
              {llmMode === 'multi' ? '多源模式' : '单源模式'}
            </button>
            <button
              onClick={() => { fetchModels(); fetchCurrent(); fetchProviders(); fetchStats() }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={16} /> 刷新
            </button>
          </div>
        </div>

        {/* Provider 列表 */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">可用 Providers</h2>
          <div className="flex gap-2 flex-wrap">
            {providers.map(p => (
              <div
                key={p.name}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  p.name === currentProvider
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {p.display_name} ({p.name})
              </div>
            ))}
          </div>
        </div>

        {/* 模型列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <ModelCard
              key={`${model.provider}:${model.id}`}
              model={model}
              isCurrent={model.id === currentModel && model.provider === currentProvider}
              onSwitch={(id) => setShowConfirm(`${model.provider}:${id}`)}
            />
          ))}
        </div>

        {showConfirm && (() => {
          const [prov, ...modelParts] = showConfirm.split(':')
          const modelId = modelParts.join(':')
          const modelInfo = models.find(m => m.provider === prov && m.id === modelId)
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <h3 className="font-bold text-lg mb-2">确认切换模型</h3>
                <p className="text-gray-600 text-sm mb-4">
                  确定要切换到 {prov}/{modelInfo?.name || modelId} 吗？
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSwitch(modelId, prov)}
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
          )
        })()}
      </div>
    </div>
  )
}
