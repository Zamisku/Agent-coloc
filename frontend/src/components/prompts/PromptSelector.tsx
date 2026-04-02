import type { PromptTemplate } from '../../types'

interface Props {
  prompts: PromptTemplate[]
  selected: string
  onSelect: (name: string) => void
}

const descriptions: Record<string, string> = {
  classifier: '意图分类',
  rewriter: 'Query 改写',
  generator: '回答生成',
  clarification: '追问生成',
  fallback: '兜底回复',
}

export function PromptSelector({ prompts, selected, onSelect }: Props) {
  return (
    <div className="w-48 border-r border-gray-200 bg-gray-50">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-bold text-sm text-gray-700">Prompt 列表</h3>
      </div>
      <div className="py-2">
        {prompts.map(prompt => (
          <button
            key={prompt.name}
            onClick={() => onSelect(prompt.name)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
              selected === prompt.name
                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="font-medium text-sm">{descriptions[prompt.name] || prompt.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {prompt.name} · v{prompt.version}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
