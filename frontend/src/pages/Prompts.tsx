import { useEffect, useState } from 'react'
import { PromptSelector } from '../components/prompts/PromptSelector'
import { PromptEditor } from '../components/prompts/PromptEditor'
import { TestPanel } from '../components/prompts/TestPanel'
import { VersionHistory } from '../components/prompts/VersionHistory'
import { api } from '../api/client'
import type { PromptTemplate, PromptHistory } from '../types'

interface TestResult {
  type: string
  data: Record<string, unknown>
  timestamp: string
}

export default function PromptsPage() {
  const { fetchPrompts, prompts } = usePromptsStore()
  const [selected, setSelected] = useState('classifier')
  const [promptData, setPromptData] = useState<PromptTemplate | null>(null)
  const [editSystem, setEditSystem] = useState('')
  const [editTemplate, setEditTemplate] = useState('')
  const [originalSystem, setOriginalSystem] = useState('')
  const [originalTemplate, setOriginalTemplate] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<PromptHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    fetchPrompts()
  }, [])

  useEffect(() => {
    if (prompts.length > 0) {
      loadPrompt(selected)
    }
  }, [selected, prompts])

  const loadPrompt = async (name: string) => {
    try {
      const { prompt } = await api.getPrompt(name)
      setPromptData(prompt)
      setEditSystem(prompt.system_prompt || '')
      setEditTemplate(prompt.user_template || '')
      setOriginalSystem(prompt.system_prompt || '')
      setOriginalTemplate(prompt.user_template || '')
      setIsDirty(false)
    } catch (e) {
      console.error('Failed to load prompt:', e)
    }
  }

  const handleSystemChange = (v: string) => {
    setEditSystem(v)
    setIsDirty(v !== originalSystem || editTemplate !== originalTemplate)
  }

  const handleTemplateChange = (v: string) => {
    setEditTemplate(v)
    setIsDirty(editSystem !== originalSystem || v !== originalTemplate)
  }

  const handleSave = async () => {
    if (!promptData || !isDirty) return
    setSaving(true)
    try {
      const { prompt } = await api.updatePrompt(selected, {
        system_prompt: editSystem,
        user_template: editTemplate,
      })
      setPromptData(prompt)
      setOriginalSystem(prompt.system_prompt || '')
      setOriginalTemplate(prompt.user_template || '')
      setIsDirty(false)
      await fetchPrompts()
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setEditSystem(originalSystem)
    setEditTemplate(originalTemplate)
    setIsDirty(false)
  }

  const handleTest = async (input: string) => {
    setTesting(true)
    try {
      const { result } = await api.testPrompt(selected, input)
      setTestResults(prev => [
        ...prev,
        { type: selected, data: result as Record<string, unknown>, timestamp: new Date().toISOString() },
      ])
    } catch (e) {
      console.error('Test failed:', e)
    } finally {
      setTesting(false)
    }
  }

  const handleHistory = async () => {
    setShowHistory(true)
    setHistoryLoading(true)
    try {
      const { history } = await api.getPromptHistory(selected)
      setHistory(history)
    } catch (e) {
      console.error('Failed to load history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleRollback = async (version: number) => {
    const entry = history.find(h => h.version === version)
    if (!entry) return
    if (entry.changes.system_prompt) {
      setEditSystem(entry.changes.system_prompt.old)
    }
    if (entry.changes.user_template) {
      setEditTemplate(entry.changes.user_template.old)
    }
    setIsDirty(true)
    setShowHistory(false)
  }

  return (
    <div className="h-full flex">
      <PromptSelector
        prompts={prompts}
        selected={selected}
        onSelect={setSelected}
      />

      <PromptEditor
        systemPrompt={editSystem}
        userTemplate={editTemplate}
        onSystemChange={handleSystemChange}
        onTemplateChange={handleTemplateChange}
        onSave={handleSave}
        onReset={handleReset}
        onHistory={handleHistory}
        isDirty={isDirty}
        saving={saving}
      />

      <TestPanel
        onTest={handleTest}
        results={testResults}
        testing={testing}
      />

      {showHistory && (
        <VersionHistory
          history={history}
          onClose={() => setShowHistory(false)}
          onRollback={handleRollback}
          loading={historyLoading}
        />
      )}
    </div>
  )
}

function usePromptsStore() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])

  const fetchPrompts = async () => {
    try {
      const { prompts: list } = await api.getPrompts()
      setPrompts(list)
    } catch (e) {
      console.error('Failed to fetch prompts:', e)
    }
  }

  return { prompts, setPrompts, fetchPrompts }
}
