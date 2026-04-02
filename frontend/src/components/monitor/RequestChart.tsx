import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ hour: string; count: number }>
}

export function RequestChart({ data }: Props) {
  const chartData = data.map(d => ({
    ...d,
    hour: d.hour.split(' ')[1] || d.hour,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-bold mb-4">请求量趋势（24小时）</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
