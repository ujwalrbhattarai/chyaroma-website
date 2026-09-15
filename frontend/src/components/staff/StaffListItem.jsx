const LOGIN_ROLES = new Set(['super_admin', 'branch_manager', 'kitchen_staff', 'cashier', 'waiter'])

const ROLE_LABELS = {
  branch_manager: 'Branch Manager',
  kitchen_staff: 'Kitchen Staff',
  waiter: 'Waiter',
  cashier: 'Cashier',
  barista: 'Barista',
  host: 'Host',
  cleaner: 'Cleaner',
}

function displayRole(role) {
  return ROLE_LABELS[role] ?? (role ? role.charAt(0).toUpperCase() + role.slice(1) : role)
}

export default function StaffListItem({ staff, onDeactivate, currentUserId, branchName, isSuperAdmin }) {
  const isCurrentUser = staff.id === currentUserId
  const hasAppAccess  = staff.canLogin === true || LOGIN_ROLES.has(staff.role)
  const isManager     = staff.role === 'branch_manager'

  return (
    <article
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-300 ${
        staff.isActive ? 'neo-card border-white/5' : 'bg-[#0E1322]/50 border-white/5 opacity-60'
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Name + branch chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="truncate font-semibold text-[#F9FAFB]">{staff.name}</p>
          {branchName && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#1E293B] text-[#94A3B8] border border-white/5">
              {branchName}
            </span>
          )}
        </div>

        {/* Email */}
        <p className="truncate text-xs text-[#9CA3AF] mt-0.5">{staff.email}</p>

        {/* Role + access badges */}
        <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isManager
                ? 'bg-[#D4AF37]/20 text-[#F5A623] border border-[#D4AF37]/30'
                : 'bg-blue-900/40 text-blue-300 border border-blue-500/30'
            }`}
          >
            {displayRole(staff.role)}
          </span>

          {/* Login access indicator */}
          {hasAppAccess ? (
            <span
              title="This staff member has application login credentials"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-500/20"
            >
               App Login
            </span>
          ) : (
            <span
              title="Staff record only — no application login"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#1E293B] text-[#6B7280] border border-white/5"
            >
               No Login
            </span>
          )}
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-3 shrink-0">
        {staff.isActive
          ? <span className="text-xs font-bold text-emerald-400 neo-inset px-2.5 py-1 rounded-full border border-emerald-500/20">Active</span>
          : <span className="text-xs font-medium text-[#8B93A7]">Inactive</span>}

        {staff.isActive && !isCurrentUser && (
          <button
            id={`deactivate-staff-${staff.id}`}
            className="neo-btn-red px-3.5 py-1.5 text-xs rounded-xl font-bold cursor-pointer"
            onClick={() => onDeactivate(staff.id)}
          >
            Deactivate
          </button>
        )}
      </div>
    </article>
  )
}
