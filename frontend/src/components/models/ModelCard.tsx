import { useState } from 'react'
import type { ModelInfo } from '../../types'
import { Check } from 'lucide-react'

interface Props {
  model: ModelInfo
  isCurrent: boolean
  onSwitch: (id: string) => void
  onCustomConfig?: (id: string, baseUrl: string, modelName: string) => void
}

export function ModelCard({ model, isCurrent, onSwitch, onCustomConfig }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [modelName, setModelName] = useState('')

  const providerColors: Record<string, string> = {
    openai: 'bg-green-100 text-green-700',
    custom: 'bg-purple-100 text-purple-700',
  }

  const handleCustomSubmit = () => {
    if (onCustomConfig && baseUrl && modelName) {
      onCustomConfig(model.id, baseUrl, modelName)
      setShowCustom(false)
    }
  }

  return (
    <div
      className={`relative rounded-xl border-2 p-5 transition-all ${
        isCurrent
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Check size={12} /> 当前
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg">{model.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${providerColors[model.provider] || 'bg-gray-100'}`}>
          {model.provider}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4">{model.description}</p>

      {model.id === 'custom' ? (
        showCustom ? (
          <div className="space-y-2">
            <input
              type="url"
              placeholder="API Base URL"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="模型名称"
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!baseUrl || !modelName}
                className="flex-1 bg-blue-500 text-white text-sm py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                保存
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full text-sm text-blue-500 hover:text-blue-600"
          >
            配置自建模型 →
          </button>
        )
      ) : (
        <button
          onClick={() => onSwitch(model.id)}
          disabled={isCurrent}
          className={`w-full py-2 text-sm rounded-lg transition-colors ${
            isCurrent
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isCurrent ? '当前使用' : '切换使用'}
        </button>
      )}
    </div>
  )
}
