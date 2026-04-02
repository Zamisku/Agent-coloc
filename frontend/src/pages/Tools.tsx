import { useState } from 'react'
import { SkillsPanel, MCPToolsPanel } from '../components/skills'
import { Wrench, Server } from 'lucide-react'

type Tab = 'skills' | 'mcp'

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('skills')

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="font-bold text-lg">工具管理</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex px-6">
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === 'skills'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench size={16} />
            Skills
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === 'mcp'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server size={16} />
            MCP Tools
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'skills' ? <SkillsPanel /> : <MCPToolsPanel />}
      </div>
    </div>
  )
}
