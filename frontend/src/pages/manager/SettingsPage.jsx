import { useEffect, useRef, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { getSettings, updateSettings, uploadLogo } from '../../services/settingsService'

const emptyForm = {
  cafeName: '',
  logoUrl: '',
  taxRate: '',
  receiptFooter: '',
  cancellationWindowMinutes: '',
  lowStockThreshold: '',
}

export default function SettingsPage({ navigate }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    getSettings()
      .then((data) => {
        const s = data.settings ?? {}
        setForm({
          cafeName: s.cafeName ?? '',
          logoUrl: s.logoUrl ?? '',
          taxRate: s.taxRate ?? '',
          receiptFooter: s.receiptFooter ?? '',
          cancellationWindowMinutes: s.cancellationWindowMinutes ?? '',
          lowStockThreshold: s.lowStockThreshold ?? '',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleLogoFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, GIF, or SVG).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo image is too large. Maximum size is 2MB.')
      return
    }
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Failed to read image file.'))
        reader.readAsDataURL(file)
      })
      const { settings } = await uploadLogo(dataUrl)
      setForm((prev) => ({ ...prev, logoUrl: settings.logoUrl ?? dataUrl }))
      setMessage('Logo uploaded successfully.')
    } catch (err) {
      setError(err.message || 'Failed to upload logo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateSettings({
        cafeName: form.cafeName,
        logoUrl: form.logoUrl,
        taxRate: Number(form.taxRate),
        cancellationWindowMinutes: Number(form.cancellationWindowMinutes),
        lowStockThreshold: Number(form.lowStockThreshold),
        receiptFooter: form.receiptFooter,
      })
      setMessage('Settings saved successfully.')
    } catch (err) {
      setError(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell area="manager" title="Cafe Settings" description="Manage your cafe branding and branch configuration." navigate={navigate}>
      {loading ? (
        <p className="text-sm text-[#9CA3AF]">Loading settings…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <section className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#F9FAFB]">Cafe Branding</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">This information appears on receipts and the customer-facing pages.</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                Cafe Name
                <input
                  className="rounded-xl border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.cafeName}
                  onChange={(e) => updateField('cafeName', e.target.value)}
                  placeholder="e.g. My Cafe"
                />
              </label>
              <div className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                <span>Logo</span>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#1F2937] bg-[#0B0F1A]">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo preview" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                    ) : (
                      <span className="text-xs text-[#8B93A7]">No logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="block w-full text-sm text-[#9CA3AF] file:mr-3 file:rounded-lg file:border-0 file:bg-amber-800 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-amber-900"
                      onChange={handleLogoFile}
                    />
                    <p className="text-xs text-[#8B93A7]">Upload a PNG, JPG, WebP, GIF, or SVG (max 2MB).</p>
                    {uploading && <p className="text-xs font-semibold text-[#F5A623]">Uploading…</p>}
                  </div>
                </div>
              </div>
              <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                Logo URL (optional — overrides uploaded logo)
                <input
                  className="rounded-xl border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.logoUrl}
                  onChange={(e) => updateField('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                Receipt Footer
                <textarea
                  rows={2}
                  className="rounded-xl border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.receiptFooter}
                  onChange={(e) => updateField('receiptFooter', e.target.value)}
                  placeholder="Thank you for visiting!"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#F9FAFB]">Branch Configuration</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">Operational settings that affect billing and orders.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                Tax Rate (%)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="rounded-xl border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.taxRate}
                  onChange={(e) => updateField('taxRate', e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                Cancellation Window (minutes)
                <input
                  type="number"
                  min="1"
                  className="rounded-xl border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.cancellationWindowMinutes}
                  onChange={(e) => updateField('cancellationWindowMinutes', e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-[#9CA3AF] sm:col-span-2">
                Low Stock Threshold (Rs)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-xl border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.lowStockThreshold}
                  onChange={(e) => updateField('lowStockThreshold', e.target.value)}
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-xl bg-[#0B0F1A] px-6 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </PageShell>
  )
}