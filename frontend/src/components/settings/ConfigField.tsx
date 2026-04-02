import { useState } from 'react'
import type { ConfigSchemaEntry } from '../../types'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  entry: ConfigSchemaEntry & { key: string }
  value: string
  onChange: (key: string, value: string) => void
}

export function ConfigField({ entry, value, onChange }: Props) {
  const [showSecret, setShowSecret] = useState(false)

  const renderInput = () => {
    switch (entry.type) {
      case 'secret':
        return (
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={value}
              onChange={e => onChange(entry.key, e.target.value)}
              className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <input
              type="number"
              min={entry.min}
              max={entry.max}
              step={entry.step}
              value={value}
              onChange={e => onChange(entry.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {entry.min !== undefined && entry.max !== undefined && (
              <input
                type="range"
                min={entry.min}
                max={entry.max}
                step={entry.step}
                value={Number(value)}
                onChange={e => onChange(entry.key, e.target.value)}
                className="w-full"
              />
            )}
          </div>
        )

      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={e => onChange(entry.key, e.target.checked ? 'true' : 'false')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={e => onChange(entry.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {entry.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={e => onChange(entry.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => onChange(entry.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
    }
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{entry.label}</label>
            {entry.restart_required && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                需重启
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{entry.description}</p>
        </div>
        <div className="w-48 shrink-0">{renderInput()}</div>
      </div>
    </div>
  )
}
