import { useRef, useEffect, useState } from 'react'

interface Props {
  systemPrompt: string
  userTemplate: string
  onSystemChange: (v: string) => void
  onTemplateChange: (v: string) => void
  onSave: () => void
  onReset: () => void
  onHistory: () => void
  isDirty: boolean
  saving: boolean
}

export function PromptEditor({
  systemPrompt,
  userTemplate,
  onSystemChange,
  onTemplateChange,
  onSave,
  onReset,
  onHistory,
  isDirty,
  saving,
}: Props) {
  const systemRef = useRef<HTMLTextAreaElement>(null)
  const templateRef = useRef<HTMLTextAreaElement>(null)
  const [stats, setStats] = useState({ system: 0, template: 0 })

  useEffect(() => {
    setStats({
      system: systemPrompt.split('\n').length,
      template: userTemplate.split('\n').length,
    })
  }, [systemPrompt, userTemplate])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const value = e.currentTarget.value
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      if (ref.current === systemRef.current) {
        onSystemChange(newValue)
      } else {
        onTemplateChange(newValue)
      }
      setTimeout(() => {
        if (ref.current) {
          ref.current.selectionStart = ref.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">编辑 Prompt</h2>
          {isDirty && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
              已修改
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onHistory}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            版本历史
          </button>
          <button
            onClick={onReset}
            disabled={!isDirty}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            重置
          </button>
          <button
            onClick={onSave}
            disabled={!isDirty || saving}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">System Prompt</label>
            <span className="text-xs text-gray-400">{stats.system} 行</span>
          </div>
          <textarea
            ref={systemRef}
            value={systemPrompt}
            onChange={e => onSystemChange(e.target.value)}
            onKeyDown={e => handleKeyDown(e, systemRef)}
            className="flex-1 p-4 font-mono text-sm border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">User Template</label>
            <span className="text-xs text-gray-400">{stats.template} 行</span>
          </div>
          <textarea
            ref={templateRef}
            value={userTemplate}
            onChange={e => onTemplateChange(e.target.value)}
            onKeyDown={e => handleKeyDown(e, templateRef)}
            className="flex-1 p-4 font-mono text-sm border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
