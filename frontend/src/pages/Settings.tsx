import { useEffect, useState } from 'react'
import { ConfigGroup } from '../components/settings/ConfigGroup'
import { ChangeHistory } from '../components/settings/ChangeHistory'
import { api } from '../api/client'
import type { ConfigSchemaGrouped, ConfigValues, ConfigChange } from '../types'
import { RotateCcw, Check, X } from 'lucide-react'

export default function SettingsPage() {
  const [schema, setSchema] = useState<ConfigSchemaGrouped>({})
  const [values, setValues] = useState<ConfigValues>({})
  const [originalValues, setOriginalValues] = useState<ConfigValues>({})
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<ConfigChange[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'warning'; message: string } | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [{ schema: s }, { settings: v }, { history: h }] = await Promise.all([
        api.getSettingsSchema(),
        api.getSettings(),
        api.getSettingsHistory(),
      ])
      setSchema(s)
      setValues(v)
      setOriginalValues(v)
      setHistory(h)
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    if (value !== originalValues[key]) {
      setChanges(prev => ({ ...prev, [key]: value }))
    } else {
      setChanges(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { settings, restart_required } = await api.updateSettings(changes)
      setValues(settings)
      setOriginalValues(settings)
      setChanges({})
      await loadData()

      if (restart_required && restart_required.length > 0) {
        setToast({
          type: 'warning',
          message: `以下配置需重启服务生效: ${restart_required.join(', ')}`,
        })
      } else {
        setToast({ type: 'success', message: '保存成功' })
      }
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Failed to save:', e)
      setToast({ type: 'warning', message: '保存失败' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setValues(originalValues)
    setChanges({})
  }

  const handleReset = async () => {
    try {
      const { settings } = await api.resetSettings()
      setValues(settings)
      setOriginalValues(settings)
      setChanges({})
      await loadData()
      setShowResetConfirm(false)
      setToast({ type: 'success', message: '已重置为默认值' })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Failed to reset:', e)
    }
  }

  const groupTitles: Record<string, string> = {
    'LLM 配置': 'LLM 配置',
    'RAG 配置': 'RAG 配置',
    '对话配置': '对话配置',
    '基础设施': '基础设施',
    '系统配置': '系统配置',
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">系统设置</h1>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw size={16} /> 重置为默认
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(schema).map(([group, entries]) => (
            <ConfigGroup
              key={group}
              title={groupTitles[group] || group}
              entries={entries}
              values={values}
              onChange={handleChange}
            />
          ))}
        </div>

        <ChangeHistory history={history} />
      </div>

      {Object.keys(changes).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-white rounded-xl shadow-lg border border-gray-200">
          <span className="text-sm text-gray-600">
            {Object.keys(changes).length} 项已修改
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X size={16} /> 取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              <Check size={16} /> {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-2">确认重置</h3>
            <p className="text-gray-600 text-sm mb-4">
              确定要将所有配置重置为默认值吗？此操作不可撤销。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                确认重置
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
