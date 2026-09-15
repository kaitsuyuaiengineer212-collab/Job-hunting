import { useState } from 'react'
import { AppStoreProvider } from './store'
import { Layout, type TabKey } from './components/Layout'
import { Today } from './components/Today'
import { RecordWorkout } from './components/RecordWorkout'
import { ProgressScreen } from './components/Progress'
import { MenuManager } from './components/MenuManager'

function App() {
  const [tab, setTab] = useState<TabKey>('today')

  return (
    <AppStoreProvider>
      <Layout active={tab} onChange={setTab}>
        {tab === 'today' && <Today onGoToRecord={() => setTab('record')} />}
        {tab === 'record' && <RecordWorkout />}
        {tab === 'progress' && <ProgressScreen />}
        {tab === 'menu' && <MenuManager />}
      </Layout>
    </AppStoreProvider>
  )
}

export default App
