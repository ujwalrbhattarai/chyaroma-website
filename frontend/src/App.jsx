import { useEffect, useState } from 'react'
import AppRoutes from './routes/AppRoutes'
import BrandingProvider from './context/BrandingContext'
import { getSession } from './services/authService'

export default function App() {
  // Include the query string so QR-scan links like "/?token=<uuid>" keep the
  // table token available to AppRoutes (which routes "/?token=" to the menu).
  const [path, setPath] = useState(() => window.location.pathname + window.location.search)
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const navigate = (nextPath) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname + window.location.search)
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
