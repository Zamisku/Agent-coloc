import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ChatPage from './pages/Chat'
import ModelsPage from './pages/Models'
import MonitorPage from './pages/Monitor'
import PromptsPage from './pages/Prompts'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<ChatPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
