import { useEffect, useState, useRef } from 'react'
import { StatCard } from '../components/monitor/StatCard'
import { RequestChart } from '../components/monitor/RequestChart'
import { IntentPieChart } from '../components/monitor/IntentPieChart'
import { RequestLogTable } from '../components/monitor/RequestLogTable'
import { useMonitorStore } from '../stores/monitorStore'
import { RefreshCw, Activity, Clock, AlertTriangle, Zap } from 'lucide-react'

export default function MonitorPage() {
  const { stats, logs, fetchStats, fetchLogs } = useMonitorStore()
  const [intentFilter, setIntentFilter] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    fetchStats()
    fetchLogs(50)
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = window.setInterval(() => {
        fetchStats()
        fetchLogs(50, intentFilter || undefined)
      }, 10000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, intentFilter])

  const handleFilterChange = (intent: string) => {
    setIntentFilter(intent)
    fetchLogs(50, intent || undefined)
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const parts = []
    if (d > 0) parts.push(`${d}d`)
    if (h > 0) parts.push(`${h}h`)
    if (m > 0 || parts.length === 0) parts.push(`${m}m`)
    return parts.join(' ')
  }

  const latencyColor = (ms: number) =>
    ms < 1000 ? 'green' : ms < 3000 ? 'yellow' : 'red'

  const errorColor = (rate: number) =>
    rate < 0.01 ? 'green' : rate < 0.05 ? 'yellow' : 'red'

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">系统监控</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              自动刷新(10s)
            </label>
            <button
              onClick={() => { fetchStats(); fetchLogs(50, intentFilter || undefined) }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} /> 刷新
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="今日请求量"
            value={stats?.today_requests || 0}
            icon={<Activity size={20} />}
          />
          <StatCard
            title="平均延迟"
            value={stats?.avg_latency_ms?.toFixed(0) || '0'}
            suffix="ms"
            color={latencyColor(stats?.avg_latency_ms || 0)}
            icon={<Zap size={20} />}
          />
          <StatCard
            title="错误率"
            value={((stats?.error_rate || 0) * 100).toFixed(2)}
            suffix="%"
            color={errorColor(stats?.error_rate || 0)}
            icon={<AlertTriangle size={20} />}
          />
          <StatCard
            title="运行时间"
            value={formatUptime(stats?.uptime_seconds || 0)}
            icon={<Clock size={20} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RequestChart data={stats?.hourly_requests || []} />
          <IntentPieChart data={stats?.intent_distribution || {}} />
        </div>

        <RequestLogTable
          logs={logs}
          intentFilter={intentFilter}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  )
}
