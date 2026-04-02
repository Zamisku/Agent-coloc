import type { ConfigSchemaEntry } from '../../types'
import { ConfigField } from './ConfigField'

interface Props {
  title: string
  entries: (ConfigSchemaEntry & { key: string })[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function ConfigGroup({ title, entries, values, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      <div className="p-4">
        {entries.map(entry => (
          <ConfigField
            key={entry.key}
            entry={entry}
            value={values[entry.key] || entry.default || ''}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}
