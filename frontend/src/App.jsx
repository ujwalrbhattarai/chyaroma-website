import { useEffect, useState } from 'react'
import AppRoutes from './routes/AppRoutes'
import BrandingProvider from './context/BrandingContext'
import { getSession } from './services/authService'

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const navigate = (nextPath) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    getSession().then(({ user }) => setSession(user)).catch(() => setSession(null)).finally(() => setLoadingSession(false))
  }, [])

  return (
    <BrandingProvider session={session}>
      <AppRoutes path={path} navigate={navigate} session={session} setSession={setSession} loadingSession={loadingSession} />
    </BrandingProvider>
  )
}
