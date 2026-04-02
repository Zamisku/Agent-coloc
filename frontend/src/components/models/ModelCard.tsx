import type { ModelInfo } from '../../types'
import { Check } from 'lucide-react'

interface Props {
  model: ModelInfo
  isCurrent: boolean
  onSwitch: (id: string) => void
}

export function ModelCard({ model, isCurrent, onSwitch }: Props) {
  const providerColors: Record<string, string> = {
    deepseek: 'bg-blue-100 text-blue-700',
    minimax: 'bg-orange-100 text-orange-700',
    openai: 'bg-green-100 text-green-700',
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
    </div>
  )
}
