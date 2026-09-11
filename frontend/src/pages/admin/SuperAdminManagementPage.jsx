import { useEffect, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { createSuperAdmin, deactivateSuperAdmin, listSuperAdmins } from '../../services/superAdminService'

const emptyForm = { name: '', email: '', password: '', confirmPassword: '' }

export default function SuperAdminManagementPage({ navigate, session }) {
  const [superAdmins, setSuperAdmins] = useState([])
  const [form, setForm]               = useState(emptyForm)
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [listError, setListError]     = useState('')
  const [formError, setFormError]     = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Confirmation dialog state
  const [confirmTarget, setConfirmTarget] = useState(null)   // { id, name } or null
  const [removing, setRemoving]           = useState(false)
  const [removeError, setRemoveError]     = useState('')

  useEffect(() => {
    listSuperAdmins()
      .then(({ superAdmins: loaded }) => setSuperAdmins(loaded))
      .catch((err) => setListError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFormError('')
    setFormSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.name.trim()) return setFormError('Full name is required.')
    if (!form.email.trim()) return setFormError('Email address is required.')
    if (!form.password) return setFormError('Password is required.')
    if (form.password.length < 8) return setFormError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setFormError('Passwords do not match.')

    setSubmitting(true)
    try {
      const { superAdmin } = await createSuperAdmin({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      setSuperAdmins((current) => [...current, superAdmin])
      setForm(emptyForm)
      setFormSuccess(`Super Admin "${superAdmin.name}" created successfully.`)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Open the confirmation dialog for a target admin
  function handleRemoveClick(admin) {
    setRemoveError('')
    setConfirmTarget(admin)
  }

  function handleCancelRemove() {
    setConfirmTarget(null)
    setRemoveError('')
  }

  async function handleConfirmRemove() {
    if (!confirmTarget) return
    setRemoving(true)
    setRemoveError('')
    try {
      const { superAdmin: updated } = await deactivateSuperAdmin(confirmTarget.id)
      setSuperAdmins((current) =>
        current.map((a) => (a.id === updated.id ? updated : a)),
      )
      setConfirmTarget(null)
    } catch (err) {
      setRemoveError(err.message)
    } finally {
      setRemoving(false)
    }
  }

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const activeAdminCount = superAdmins.filter((a) => a.isActive).length

  return (
    <PageShell
      area="admin"
      title="Super Admin Management"
      description="Create and manage independent Super Admin accounts. Each account has its own credentials and login session."
      navigate={navigate}
    >
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">

        {/* ── Existing Super Admins ───────────────────────────────────────── */}
        <section className="neo-card rounded-2xl p-6 text-[#F9FAFB]">
          <div className="mb-5 border-b border-[#1F2937]/80 pb-4">
            <h2 className="text-xl font-bold text-[#F9FAFB]">Existing Super Admins</h2>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              All accounts with global Super Admin access. Each has independent credentials.
            </p>
          </div>

          {listError && (
            <p className="mb-4 rounded-xl border border-red-800/40 bg-red-950/40 p-3 text-sm text-red-400" role="alert">
              {listError}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-[#6B7280] animate-pulse">Loading accounts…</p>
          ) : superAdmins.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No Super Admin accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1F2937]/60">
                    <th className="pb-3 text-left text-xs font-black uppercase tracking-wider text-[#6B7280]">Name</th>
                    <th className="pb-3 text-left text-xs font-black uppercase tracking-wider text-[#6B7280]">Email</th>
                    <th className="pb-3 text-left text-xs font-black uppercase tracking-wider text-[#6B7280]">Status</th>
                    <th className="pb-3 text-left text-xs font-black uppercase tracking-wider text-[#6B7280]">Created</th>
                    <th className="pb-3 text-left text-xs font-black uppercase tracking-wider text-[#6B7280]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/40">
                  {superAdmins.map((admin) => {
                    const isSelf      = session?.id === admin.id
                    // Show Remove only when: account is active AND not self
                    // AND there's more than one active admin (last-admin guard hint in UI)
                    const canRemove   = admin.isActive && !isSelf && activeAdminCount > 1

                    return (
                      <tr
                        key={admin.id}
                        className={`transition-colors duration-150 hover:bg-[#151B2B]/60 ${
                          isSelf ? 'bg-[#D4AF37]/5' : ''
                        } ${!admin.isActive ? 'opacity-50' : ''}`}
                      >
                        <td className="py-3.5 pr-4 font-semibold text-[#F9FAFB]">
                          <span className="flex items-center gap-2">
                            {admin.name}
                            {isSelf && (
                              <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                                You
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-[#9CA3AF]">{admin.email}</td>
                        <td className="py-3.5 pr-4">
                          {admin.isActive ? (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full border border-red-500/30 bg-red-900/30 px-2.5 py-0.5 text-xs font-bold text-red-400">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-xs text-[#6B7280]">{formatDate(admin.createdAt)}</td>
                        <td className="py-3.5">
                          {canRemove ? (
                            <button
                              id={`remove-super-admin-${admin.id}`}
                              className="neo-btn-red px-3 py-1.5 text-xs rounded-lg font-bold cursor-pointer"
                              onClick={() => handleRemoveClick(admin)}
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-[#374151]">
                              {isSelf ? '— Self' : !admin.isActive ? '—' : activeAdminCount <= 1 ? '— Last Admin' : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Create Super Admin ──────────────────────────────────────────── */}
        <section className="neo-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#F9FAFB]">Create Super Admin</h2>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            The new account will have immediate global access. No branch assignment — Super Admins are branch-less by design.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit} id="create-super-admin-form">

            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Full Name
              <input
                id="super-admin-name"
                name="name"
                className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="e.g. Admin Two"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Email Address
              <input
                id="super-admin-email"
                name="email"
                type="email"
                className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="admin@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Password
              <input
                id="super-admin-password"
                name="password"
                type="password"
                className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Confirm Password
              <input
                id="super-admin-confirm-password"
                name="confirmPassword"
                type="password"
                className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </label>

            {formError && (
              <p className="rounded-xl border border-red-800/40 bg-red-950/40 p-3 text-sm text-red-400" role="alert">
                {formError}
              </p>
            )}

            {formSuccess && (
              <p className="rounded-xl border border-emerald-700/40 bg-emerald-950/40 p-3 text-sm text-emerald-400" role="status">
                {formSuccess}
              </p>
            )}

            <div className="mt-2">
              <button
                id="create-super-admin-btn"
                type="submit"
                disabled={submitting}
                className="neo-btn-green w-full rounded-xl py-3.5 px-5 text-sm font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? 'Creating…' : 'Create Super Admin'}
              </button>
            </div>
          </form>

          <div className="mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4">
            <p className="text-xs text-[#8B93A7] leading-relaxed">
              <span className="font-bold text-[#D4AF37]">Note:</span> The new account will log in through the standard login page using their own email and password. Each Super Admin maintains a completely independent session.
            </p>
          </div>
        </section>

      </div>

      {/* ── Confirmation Dialog ─────────────────────────────────────────────── */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-title"
        >
          <div className="neo-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-red-900/30">
            <h3 id="confirm-remove-title" className="text-lg font-bold text-[#F9FAFB] mb-1">
              Remove Super Admin?
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-1">
              You are about to remove <span className="font-semibold text-[#F9FAFB]">{confirmTarget.name}</span>.
            </p>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-5">
              This will disable their application access immediately. Any active sessions will be invalidated.
              Their account and records will be kept for audit purposes — this is not a permanent deletion.
            </p>

            {removeError && (
              <p className="mb-4 rounded-xl border border-red-800/40 bg-red-950/40 p-3 text-sm text-red-400" role="alert">
                {removeError}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                id="cancel-remove-super-admin"
                className="neo-btn px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                onClick={handleCancelRemove}
                disabled={removing}
              >
                Cancel
              </button>
              <button
                id="confirm-remove-super-admin"
                className="neo-btn-red px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirmRemove}
                disabled={removing}
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
