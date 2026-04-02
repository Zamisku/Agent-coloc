import { NavLink } from 'react-router-dom'
import { MessageSquare, Cpu, BarChart3, FileCode, Settings, Wrench, GitBranch } from 'lucide-react'

const nav = [
  { to: '/chat', icon: MessageSquare, label: '对话测试' },
  { to: '/models', icon: Cpu, label: '模型管理' },
  { to: '/monitor', icon: BarChart3, label: '系统监控' },
  { to: '/prompts', icon: FileCode, label: 'Prompt 管理' },
  { to: '/workflow', icon: GitBranch, label: '工作流程' },
  { to: '/tools', icon: Wrench, label: '工具管理' },
  { to: '/settings', icon: Settings, label: '系统设置' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="font-bold text-lg">招生 Agent 控制台</h1>
          <p className="text-xs text-slate-400 mt-1">Agent Orchestration</p>
        </div>

        <nav className="flex-1 py-4">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
          v1.0.0 · 2026
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
