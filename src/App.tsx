import { useEffect, useState } from 'react'
import { DateProvider } from './lib/dateContext'
import { StoreProvider, useStore } from './store/store'
import type { ViewKey } from './types'
import { applyBrandTheme } from './lib/brand'
import { applyDeviceClasses } from './lib/device'
import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './components/dashboard/Dashboard'
import { MembersPage } from './components/members/MembersPage'
import { AttendancePage } from './components/attendance/AttendancePage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { NotificationsPage } from './components/notifications/NotificationsPage'
import { ImportPage } from './components/import/ImportPage'
import { RoutinesPage } from './components/routines/RoutinesPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { LoginScreen } from './components/auth/LoginScreen'
import { StudentView } from './components/student/StudentView'
import { ConnectionBadge } from './components/layout/ConnectionBadge'

function BrandTheme() {
  const brand = useStore().settings.brand
  useEffect(() => {
    applyBrandTheme(brand)
    return () => applyBrandTheme({ ...brand, enableAutoTheme: false })
  }, [brand])
  return null
}

function AuthGate() {
  const { session } = useStore()
  if (session === 'admin') return <AdminLayout />
  if (session === 'student') return <StudentView />
  return <LoginScreen />
}

function AdminLayout() {
  const [view, setView] = useState<ViewKey>('dashboard')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const navigate = (v: ViewKey) => {
    setView(v)
    setSelectedMemberId(null)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink-900 text-fog">
      <Sidebar view={view} onNavigate={navigate} />
      <main className="flex min-w-0 flex-1 flex-col bg-ink-900">
        {view === 'dashboard' && (
          <Dashboard onNavigate={setView} onSelectMember={(id) => { setSelectedMemberId(id); setView('members') }} />
        )}
        {view === 'members' && (
          <MembersPage onSelectMemberId={setSelectedMemberId} selectedMemberId={selectedMemberId} />
        )}
        {view === 'attendance' && <AttendancePage />}
        {view === 'calendar' && <CalendarPage />}
        {view === 'notifications' && <NotificationsPage onGoToMembers={() => navigate('members')} />}
        {view === 'import' && <ImportPage />}
        {view === 'routines' && <RoutinesPage />}
        {view === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    applyDeviceClasses()
  }, [])

  return (
    <DateProvider>
      <StoreProvider>
        <BrandTheme />
        <AuthGate />
        <ConnectionBadge />
      </StoreProvider>
    </DateProvider>
  )
}