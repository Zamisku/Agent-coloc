type IntentMode = 'auto' | 'force' | 'suggest'

interface Props {
  selected: string | null
  mode: IntentMode
  onSelect: (intent: string | null) => void
  onModeChange: (mode: IntentMode) => void
}

const intents: { value: string; label: string }[] = [
  { value: 'score_query', label: '成绩查询' },
  { value: 'major_info', label: '专业信息' },
  { value: 'admission_policy', label: '招生政策' },
  { value: 'campus_life', label: '校园生活' },
  { value: 'process_guide', label: '流程指南' },
  { value: 'chitchat', label: '闲聊' },
  { value: 'out_of_scope', label: '超出范围' },
  { value: 'unclear', label: '不明确' },
]

const modeLabels: Record<IntentMode, string> = {
  auto: 'Auto',
  force: 'LLMs',
  suggest: '强制模型输出',
}

export function IntentSelector({ selected, mode, onSelect, onModeChange }: Props) {
  return (
    <div className="border-b border-gray-200 bg-gray-50 p-3">
      <div className="flex gap-2 mb-2">
        {(Object.keys(modeLabels) as IntentMode[]).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              mode === m
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {mode !== 'auto' && (
        <div className="flex flex-wrap gap-1.5">
          {intents.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onSelect(selected === value ? null : value)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                selected === value
                  ? 'bg-blue-100 border border-blue-400 text-blue-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
