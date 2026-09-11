// Stable per-browser device id used to lock a customer's tab to a table and to
// detect when the same phone tries to open a tab on a different table.
export function getDeviceId() {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem('cc_device_id')
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('cc_device_id', id)
    }
    return id.slice(0, 64)
  } catch {
    return ''
  }
}