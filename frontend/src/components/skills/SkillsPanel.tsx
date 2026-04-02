import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface Skill {
  name: string
  description: string
  parameters: Array<{
    name: string
    description: string
    type: string
    required?: boolean
    default?: unknown
  }>
}

interface CallResult {
  success: boolean
  result: string | null
  error: string | null
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [callingSkill, setCallingSkill] = useState<string | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, CallResult>>({})

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const res = await api.getSkills()
      setSkills(res.skills)
    } catch (e) {
      console.error('Failed to load skills:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCallSkill = async (skill: Skill) => {
    setCallingSkill(skill.name)
    setResults(prev => ({ ...prev, [skill.name]: { success: false, result: null, error: null } }))

    try {
      const params: Record<string, unknown> = {}
      for (const param of skill.parameters) {
        const value = paramValues[param.name]
        if (value) {
          // 尝试解析 JSON，否则当作字符串
          try {
            params[param.name] = JSON.parse(value)
          } catch {
            params[param.name] = value
          }
        } else if (param.default !== undefined) {
          params[param.name] = param.default
        }
      }

      const res = await api.callSkill(skill.name, params)
      setResults(prev => ({ ...prev, [skill.name]: res }))
    } catch (e) {
      setResults(prev => ({
        ...prev,
        [skill.name]: { success: false, result: null, error: String(e) },
      }))
    } finally {
      setCallingSkill(null)
    }
  }

  const toggleExpand = (name: string) => {
    setExpandedSkill(prev => prev === name ? null : name)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">可用 Skills</h2>
        <span className="text-sm text-gray-500">{skills.length} 个工具</span>
      </div>

      {skills.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无可用的 Skills
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map(skill => (
            <div key={skill.name} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleExpand(skill.name)}
              >
                <div className="flex items-center gap-2">
                  {expandedSkill === skill.name ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  <span className="font-medium">{skill.name}</span>
                </div>
                <button
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCallSkill(skill)
                  }}
                  disabled={callingSkill !== null}
                >
                  {callingSkill === skill.name ? '调用中...' : '调用'}
                </button>
              </div>

              {expandedSkill === skill.name && (
                <div className="p-4 border-t">
                  <p className="text-gray-600 mb-4">{skill.description}</p>

                  {skill.parameters.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-medium">参数</h4>
                      {skill.parameters.map(param => (
                        <div key={param.name} className="grid grid-cols-3 gap-2 items-center">
                          <label className="text-sm">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type="text"
                            placeholder={param.default !== undefined ? String(param.default) : param.type}
                            className="col-span-2 px-3 py-1 border rounded text-sm"
                            value={paramValues[param.name] || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                          />
                          <div className="col-start-2 col-span-2 text-xs text-gray-400">
                            {param.description} ({param.type})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {results[skill.name] && (
                    <div className={`mt-4 p-3 rounded ${results[skill.name]!.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {results[skill.name]!.success ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {results[skill.name]!.success ? '调用成功' : '调用失败'}
                        </span>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap bg-white p-2 rounded border overflow-auto max-h-40">
                        {results[skill.name]!.result || results[skill.name]!.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
