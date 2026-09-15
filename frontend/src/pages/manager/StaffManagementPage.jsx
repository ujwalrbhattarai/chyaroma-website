import { useEffect, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import StaffListItem from '../../components/staff/StaffListItem'
import { listStaff, createStaff, deactivateStaff } from '../../services/staffService'
import { listBranches } from '../../services/branchService'

const ROLE_OPTIONS = [
  // ── Login-capable roles (application access required) ──────────────────
  { value: 'branch_manager', label: 'Branch Manager', requiresLogin: true },
  { value: 'kitchen_staff',  label: 'Kitchen Staff',  requiresLogin: true },
  { value: 'cashier',        label: 'Cashier',        requiresLogin: true },
  { value: 'waiter',         label: 'Waiter',         requiresLogin: true },
  // ── Staff-only roles (no application login) ────────────────────────────
  { value: 'barista',  label: 'Barista',  requiresLogin: false },
  { value: 'host',     label: 'Host',     requiresLogin: false },
  { value: 'cleaner',  label: 'Cleaner',  requiresLogin: false },
]

// Roles whose records are also application login accounts
const LOGIN_ROLES = new Set(['super_admin', 'branch_manager', 'kitchen_staff', 'cashier', 'waiter'])

function roleNeedsLogin(roleValue, isCustom) {
  if (isCustom) return false
  return LOGIN_ROLES.has(roleValue)
}

const emptyForm = { name: '', email: '', password: '', role: '', branchId: '' }

export default function StaffManagementPage({ navigate, session }) {
  const [staff, setStaff]       = useState([])
  const [branches, setBranches] = useState([])
  const [form, setForm]         = useState(emptyForm)
  const [customRole, setCustomRole] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(true)

  const isSuperAdmin  = session?.role === 'super_admin'
  const defaultRole   = isSuperAdmin ? 'branch_manager' : 'kitchen_staff'
  const needsPassword = roleNeedsLogin(form.role, customRole)

  useEffect(() => {
    const init = async () => {
      try {
        const { staff: loaded } = await listStaff()
        setStaff(loaded)
        if (isSuperAdmin) {
          const { branches: loadedBranches } = await listBranches()
          setBranches(loadedBranches.filter((b) => b.isActive && !b.isDemo && !b.name?.toLowerCase().includes('demo')))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [isSuperAdmin])

  useEffect(() => {
    setForm((f) => ({ ...f, role: defaultRole, branchId: isSuperAdmin ? '' : (session?.branchId ?? '') }))
    setCustomRole(false)
  }, [defaultRole, isSuperAdmin, session?.branchId])

  function handleRoleSelect(event) {
    const value = event.target.value
    if (value === '__custom__') {
      setCustomRole(true)
      setForm((f) => ({ ...f, role: '', password: '' }))
    } else {
      setCustomRole(false)
      // Clear password when switching to a non-login role
      setForm((f) => ({ ...f, role: value, password: LOGIN_ROLES.has(value) ? f.password : '' }))
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      // Only send password when it's actually needed; send undefined otherwise
      const payload = { ...form }
      if (!needsPassword) delete payload.password
      const { staff: created } = await createStaff(payload)
      setStaff((current) => [...current, created])
      setForm({ ...emptyForm, role: defaultRole, branchId: isSuperAdmin ? '' : (session?.branchId ?? '') })
      setCustomRole(false)
      setSuccess(`${created.name} added successfully.`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeactivate(staffId) {
    setError('')
    setSuccess('')
    try {
      const { staff: updated } = await deactivateStaff(staffId)
      setStaff((current) => current.map((s) => (s.id === updated.id ? updated : s)))
      setSuccess(`${updated.name} deactivated.`)
    } catch (err) {
      setError(err.message)
    }
  }

  const roleOptions  = isSuperAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value !== 'branch_manager')
  const activeStaff  = staff.filter((s) => s.isActive)
  const inactiveStaff = staff.filter((s) => !s.isActive)
  const branchMap    = Object.fromEntries(branches.map((b) => [b.id, b.name]))

  return (
    <PageShell area={isSuperAdmin ? 'admin' : 'manager'} title="Staff Management" description="Manage staff records and application login accounts for your cafe branches." navigate={navigate}>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

        {/* ── Staff list ───────────────────────────────────────────────── */}
        <section className="space-y-4">
          {loading
            ? <div className="py-12 text-center text-[#9CA3AF] animate-pulse">Loading staff…</div>
            : <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#F9FAFB]">Active Staff ({activeStaff.length})</h2>
              </div>
              {activeStaff.length === 0
                ? <p className="neo-card p-6 text-center text-sm text-[#9CA3AF] rounded-2xl">No active staff registered yet.</p>
                : <div className="grid gap-3">
                  {activeStaff.map((s) => (
                    <StaffListItem key={s.id} staff={s} onDeactivate={handleDeactivate} currentUserId={session?.id} branchName={branchMap[s.branchId] ?? null} isSuperAdmin={isSuperAdmin} />
                  ))}
                </div>}
              {inactiveStaff.length > 0 && (
                <details className="mt-6 neo-card rounded-xl p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#9CA3AF] hover:text-[#F5A623]">Show {inactiveStaff.length} inactive staff members</summary>
                  <div className="mt-3 grid gap-3">
                    {inactiveStaff.map((s) => <StaffListItem key={s.id} staff={s} onDeactivate={handleDeactivate} currentUserId={session?.id} branchName={branchMap[s.branchId] ?? null} isSuperAdmin={isSuperAdmin} />)}
                  </div>
                </details>
              )}
            </>}
        </section>

        {/* ── Create form ──────────────────────────────────────────────── */}
        <section className="neo-card rounded-2xl p-6 self-start">
          <h2 className="mb-1 text-lg font-bold text-[#F9FAFB]">Add Staff Member</h2>
          <p className="mb-5 text-xs text-[#9CA3AF] leading-relaxed">
            {isSuperAdmin
              ? 'Create a staff record or an application login account and assign them to a branch.'
              : 'Add a staff member to your branch. Roles marked (App Login) can sign in to the application with the password you set.'}
          </p>

          {error   && <p id="staff-form-error"   className="mb-4 rounded-xl bg-red-950/50 border border-red-800/50 p-3 text-sm text-red-300"     role="alert">{error}</p>}
          {success && <p id="staff-form-success" className="mb-4 rounded-xl bg-emerald-950/50 border border-emerald-800/50 p-3 text-sm text-emerald-300">{success}</p>}

          <form className="grid gap-4" onSubmit={handleCreate} id="create-staff-form">

            {/* ── Staff Information ─────────────────────────────────── */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 grid gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Staff Information</p>

              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                Full Name
                <input
                  id="staff-name"
                  className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                Email Address
                <input
                  id="staff-email"
                  type="email"
                  className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                Staff Role
                <select
                  id="staff-role"
                  className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer"
                  value={customRole ? '__custom__' : form.role}
                  onChange={handleRoleSelect}
                  required
                >
                  {roleOptions.map(({ value, label, requiresLogin }) => (
                    <option key={value} value={value}>
                      {label}{requiresLogin ? ' (App Login)' : ''}
                    </option>
                  ))}
                  <option value="__custom__">Custom role…</option>
                </select>
                <span className="text-[11px] font-normal text-[#8B93A7]">
                  Roles marked <em>(App Login)</em> require a password and can log in.
                </span>
              </label>

              {customRole && (
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                  Custom Role Title
                  <input
                    id="staff-custom-role"
                    className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="e.g. Floor Supervisor, Head Chef"
                    autoFocus
                    required
                  />
                </label>
              )}

              {isSuperAdmin && (
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                  Assign to Branch
                  <select
                    id="staff-branch"
                    className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer"
                    value={form.branchId}
                    onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    required
                  >
                    <option value="">— Select Branch —</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
              )}
            </div>

            {/* ── Access / Login ────────────────────────────────────── */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 grid gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Application Access</p>

              {needsPassword ? (
                <>
                  {/* Login-enabled role — show password field */}
                  <div className="flex items-center gap-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-3 py-2">
                    <span className="text-xs text-[#D4AF37] font-medium">This role can log in to the application.</span>
                  </div>
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                    Temporary Password
                    <input
                      id="staff-password"
                      type="password"
                      className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      minLength={8}
                      required
                    />
                  </label>
                </>
              ) : (
                /* Staff-only role — no password, no login */
                <div className="flex items-center gap-3 rounded-lg bg-[#1E293B] border border-white/5 px-3 py-2.5">
                  
                  <div>
                    <p className="text-xs font-semibold text-[#94A3B8]">No application login</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      This staff member will appear in Staff Management but cannot log in to the app.
                      No password is created or stored.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button id="submit-staff" type="submit" className="neo-btn-green py-3.5 px-5 rounded-xl font-bold text-sm tracking-wide mt-2">
              Add Staff Member
            </button>
          </form>
        </section>

      </div>
    </PageShell>
  )
}
