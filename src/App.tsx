import { useEffect, useState } from 'react'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { logout } from './services/authService'
import { TaskDashboard } from './components/TaskDashboard'

function App() {
  const { session, loading, clearSession } = useAuth()
  const [path, setPath] = useState(window.location.pathname)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      clearSession()
      navigate('/login')
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out.')
    } finally {
      setLoggingOut(false)
    }
  }

  function renderDashboard() {
    if (!session) return null
    return (
      <TaskDashboard
        userName={session.user?.name ?? undefined}
        loggingOut={loggingOut}
        logoutError={logoutError}
        onLogout={handleLogout}
        onUnauthorized={clearSession}
      />
    )
  }

  if (loading) {
    return <main className="auth-layout"><div className="loading">Checking session...</div></main>
  }

  if (!session && path === '/tasks') {
    window.history.replaceState({}, '', '/login')
    return <LoginPage navigate={navigate} />
  }

  if (session && (path === '/' || path === '/login' || path === '/register')) {
    window.history.replaceState({}, '', '/tasks')
    return renderDashboard()
  }

  if (path === '/register') {
    return <RegisterPage navigate={navigate} />
  }

  if (path === '/tasks') {
    return renderDashboard()
  }

  return <LoginPage navigate={navigate} />
}

export default App
