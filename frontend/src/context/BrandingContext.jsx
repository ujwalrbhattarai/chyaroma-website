import { createContext, useContext, useEffect, useState } from 'react'
import { getSettings } from '../services/settingsService'

// Shared café branding (name + logo) fetched once at the app level, so the
// sidebar/name stays stable across page navigation instead of re-fetching and
// flashing blank every time a new page mounts.
const BrandingContext = createContext({ cafeName: '', logoUrl: '' })
export const useBranding = () => useContext(BrandingContext)

export default function BrandingProvider({ session, children }) {
  const [branding, setBranding] = useState({ cafeName: '', logoUrl: '' })

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((data) => {
        if (cancelled) return
        const s = data?.settings ?? {}
        const name = (s.cafeName || '').trim()
        setBranding({ cafeName: name, logoUrl: s.logoUrl || '' })
        document.title = name || 'Staff Portal'
      })
      .catch(() => {})
    return () => { cancelled = true }
    // Refetch when the logged-in branch changes (e.g. right after login).
  }, [session?.role, session?.branchId])

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}
