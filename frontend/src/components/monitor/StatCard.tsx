import type { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  color?: 'default' | 'green' | 'yellow' | 'red'
  suffix?: string
  icon?: ReactNode
}

export function StatCard({ title, value, color = 'default', suffix, icon }: Props) {
  const colorStyles = {
    default: 'bg-white border-gray-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
  }

  const valueColors = {
    default: 'text-gray-800',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorStyles[color]}`}>
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${valueColors[color]}`}>{value}</span>
        {suffix && <span className="text-gray-400 text-sm">{suffix}</span>}
      </div>
      {icon && <div className="mt-2 text-gray-400">{icon}</div>}
    </div>
  )
}
