import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { DebugInfo } from '../types'

interface NodeStatus {
  name: string
  label: string
  status: 'pending' | 'active' | 'completed'
  description?: string
}

const WORKFLOW_NODES: { name: string; label: string; description: string }[] = [
  { name: 'classify', label: '意图分类', description: '识别用户问题类型' },
  { name: 'rewrite', label: 'Query 改写', description: '优化搜索查询' },
  { name: 'retrieve', label: 'RAG 检索', description: '从知识库检索相关内容' },
  { name: 'evaluate', label: '质量评估', description: '评估检索结果质量' },
  { name: 'generate', label: '答案生成', description: '生成最终回复' },
  { name: 'clarify', label: '追问生成', description: '引导用户补充信息' },
  { name: 'fallback', label: '兜底回复', description: '无相关内容时的回复' },
]

const BRANCH_NODES = ['generate', 'clarify', 'fallback']

function getInitialNodes(): NodeStatus[] {
  return WORKFLOW_NODES.map(n => ({
    ...n,
    status: 'pending',
  }))
}

function updateNodeStatus(nodes: NodeStatus[], activeName: string): NodeStatus[] {
  const activeIndex = nodes.findIndex(n => n.name === activeName)
  if (activeIndex === -1) return nodes

  return nodes.map((node, index) => {
    if (index < activeIndex) return { ...node, status: 'completed' }
    if (index === activeIndex) return { ...node, status: 'active' }
    return { ...node, status: 'pending' }
  })
}

export default function WorkflowPage() {
  const [nodes, setNodes] = useState<NodeStatus[]>(getInitialNodes())
  const [currentDebug, setCurrentDebug] = useState<DebugInfo | null>(null)

  useEffect(() => {
    // 模拟实时更新：每 3 秒轮询一次当前 debug 状态
    const interval = setInterval(async () => {
      try {
        // 这里简化处理，实际应该从全局状态获取
        // 暂时保持初始状态
      } catch (e) {
        console.error('Failed to fetch workflow status:', e)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const simulateWorkflow = async () => {
    setNodes(getInitialNodes())

    for (let i = 0; i < WORKFLOW_NODES.length; i++) {
      const node = WORKFLOW_NODES[i]
      setNodes(prev => updateNodeStatus(prev, node.name))

      // 跳过分支节点
      if (!BRANCH_NODES.includes(node.name)) {
        await new Promise(resolve => setTimeout(resolve, 800))
      } else {
        break
      }
    }

    // 模拟 evaluate 后的分支
    setNodes(prev => {
      const evaluateIndex = prev.findIndex(n => n.name === 'evaluate')
      if (evaluateIndex === -1) return prev

      return prev.map((node, index) => {
        if (index < evaluateIndex) return { ...node, status: 'completed' }
        if (index === evaluateIndex) return { ...node, status: 'completed' }
        if (node.name === 'generate') return { ...node, status: 'active' }
        return node
      })
    })

    await new Promise(resolve => setTimeout(resolve, 1000))

    // 完成 generate
    setNodes(prev => prev.map(n => ({
      ...n,
      status: n.status === 'active' ? 'completed' : n.status,
    })))
  }

  const statusStyles = {
    pending: 'bg-gray-100 text-gray-400 border-gray-200',
    active: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200 scale-105',
    completed: 'bg-green-500 text-white border-green-500',
  }

  const statusIcons = {
    pending: '',
    active: '◉',
    completed: '✓',
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="font-bold text-lg">工作流程</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setNodes(getInitialNodes())}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            重置
          </button>
          <button
            onClick={simulateWorkflow}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            模拟运行
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* 主流程 */}
          <div className="mb-12">
            <h2 className="text-sm font-medium text-gray-500 mb-4">主流程</h2>
            <div className="flex items-center justify-between">
              {WORKFLOW_NODES.filter(n => !BRANCH_NODES.includes(n.name)).map((node, index, arr) => (
                <div key={node.name} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${statusStyles[nodes.find(n => n.name === node.name)?.status || 'pending']}`}
                    >
                      <span className="text-xs font-medium">{node.label}</span>
                      {nodes.find(n => n.name === node.name)?.status !== 'pending' && (
                        <span className="text-lg mt-1">{statusIcons[nodes.find(n => n.name === node.name)?.status || 'pending']}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-2 max-w-[80px] text-center">{node.description}</span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className="w-12 h-0.5 bg-gray-200 mx-2">
                      <div className={`h-full bg-green-500 transition-all duration-300 ${nodes.find(n => n.name === node.name)?.status === 'completed' ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 分支 */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-4">评估分支</h2>
            <div className="flex items-center justify-center gap-8">
              {/* Arrow from evaluate */}
              <div className="flex items-center">
                <div className={`w-20 h-0.5 transition-all duration-300 ${nodes.find(n => n.name === 'evaluate')?.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
              </div>

              {['generate', 'clarify', 'fallback'].map((branchName, branchIndex) => {
                const branchNode = WORKFLOW_NODES.find(n => n.name === branchName)!
                const status = nodes.find(n => n.name === branchName)?.status || 'pending'
                const isActive = nodes.find(n => n.name === 'evaluate')?.status === 'completed'

                return (
                  <div key={branchName} className="flex flex-col items-center">
                    <div className="h-8 flex items-center">
                      {branchIndex > 0 && (
                        <div className={`w-4 h-0.5 transition-all duration-300 ${isActive && status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div
                      className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${isActive ? statusStyles[status] : 'bg-gray-50 text-gray-300 border-gray-200'}`}
                    >
                      <span className="text-xs font-medium text-center px-2">{branchNode.label}</span>
                      {status !== 'pending' && (
                        <span className="text-lg mt-1">{statusIcons[status]}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-2 max-w-[80px] text-center">{branchNode.description}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 图例 */}
          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-100 border-2 border-gray-200" />
              <span className="text-sm text-gray-500">等待中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500" />
              <span className="text-sm text-gray-500">执行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500" />
              <span className="text-sm text-gray-500">已完成</span>
            </div>
          </div>

          {/* Debug 信息 */}
          {currentDebug && (
            <div className="mt-8 p-4 bg-gray-900 text-white rounded-xl text-sm font-mono">
              <div className="text-gray-400 mb-2">当前状态:</div>
              <pre>{JSON.stringify(currentDebug, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
