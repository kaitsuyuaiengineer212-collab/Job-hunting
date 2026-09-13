import { useState } from 'react'
import { AppStoreProvider } from './store'
import { Layout, type TabKey } from './components/Layout'
import { RecordWorkout } from './components/RecordWorkout'
import { History } from './components/History'
import { ProgressCharts } from './components/ProgressCharts'
import { MenuManager } from './components/MenuManager'
import { Dashboard } from './components/Dashboard'

function App() {
  const [tab, setTab] = useState<TabKey>('dashboard')

  return (
    <AppStoreProvider>
      <Layout active={tab} onChange={setTab}>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'record' && <RecordWorkout />}
        {tab === 'history' && <History />}
        {tab === 'charts' && <ProgressCharts />}
        {tab === 'menu' && <MenuManager />}
      </Layout>
    </AppStoreProvider>
  )
}

export default App
