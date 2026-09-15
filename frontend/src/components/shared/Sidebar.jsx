import { useBranding } from '../../context/BrandingContext'
import logo from '../../logo.png'
import { logout } from '../../services/authService'

// Main navigation items per area
const mainNavByArea = {
  admin: [
    ['Home', '/admin'],
    ['Branches', '/admin/branches'],
    ['Staff', '/admin/staff'],
    ['Tables & QR', '/admin/tables'],
    ['Reports', '/admin/reports'],
  ],
  manager: [
    ['Home', '/manager'],
    ['Menu', '/manager/menu'],
    ['Tables & QR', '/manager/tables'],
    ['Inventory', '/manager/inventory'],
    ['Kitchen', '/kitchen'],
    ['Billing', '/manager/billing'],
    ['Staff', '/manager/staff'],
    ['Reports', '/manager/reports'],
    ['Settings', '/manager/settings'],
  ],
  kitchen: [
    ['Kitchen Queue', '/kitchen'],
    ['Table Status', '/kitchen/tables'],
  ],
  cashier: [
    ['Dashboard / Billing', '/cashier'],
  ],
  waiter: [
    ['Waiter Home', '/waiter'],
  ],
}

// Demo section items — shown only in the admin area, below a divider
const demoNavItems = [
  ['Demo Statistics', '/admin/demo/stats'],
]

// Administration section items — shown only in the admin area
const adminNavItems = [
  ['Super Admins', '/admin/super-admins'],
]

export default function Sidebar({ area, navigate, setSession }) {
  const { cafeName, logoUrl } = useBranding()
  const currentPath = window.location.pathname

  const displayLogo = logoUrl || logo

  async function handleLogout() {
    try {
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      if (setSession) setSession(null)
      navigate('/login')
    }
  }

  function isActive(path) {
    return (
      currentPath === path ||
      (path !== '/admin' && path !== '/manager' && path !== '/kitchen' && path !== '/cashier' && currentPath.startsWith(path))
    )
  }

  const mainNav = mainNavByArea[area] ?? []
  const showDemoSection = area === 'admin'

  return (
    <aside className="w-full bg-[#0B0F1A] border-r border-[#1F2937]/50 px-5 py-6 text-[#D1D5DB] md:min-h-screen md:w-64 shadow-2xl no-scrollbar flex flex-col justify-between">
      <div>
        <button
          className="mb-6 flex items-center gap-3 text-left group cursor-pointer transition-transform hover:scale-105"
          onClick={() => navigate(area === 'kitchen' ? '/kitchen' : area === 'cashier' ? '/cashier' : area === 'waiter' ? '/waiter' : '/')}
        >
          <img src={displayLogo} alt="Chyaroma Logo" className="h-10 w-10 object-contain rounded-lg drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]" />
          <span className="text-[#D4AF37] text-2xl font-bold tracking-wide font-serif truncate">Chyaroma</span>
        </button>

        {area === 'kitchen' && (
          <div className="mb-4 px-2 text-[11px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#1F2937]/60 pb-2">
            KITCHEN OPERATIONS
          </div>
        )}

        {area === 'cashier' && (
          <div className="mb-4 px-2 text-[11px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#1F2937]/60 pb-2">
            CASHIER OPERATIONS
          </div>
        )}

        {area === 'waiter' && (
          <div className="mb-4 px-2 text-[11px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#1F2937]/60 pb-2">
            WAITER OPERATIONS
          </div>
        )}

        {/* Main navigation */}
        <nav className="flex gap-2 overflow-x-auto md:flex-col no-scrollbar">
          {mainNav.map(([label, path]) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium cursor-pointer transition-all duration-200 ${
                isActive(path)
                  ? 'neo-gold-active font-semibold shadow-md'
                  : 'text-[#9CA3AF] hover:bg-[#151B2B] hover:text-[#F5A623] hover:translate-x-1 hover:shadow-sm'
              }`}
            >
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Administration section — admin only, Super Admin management */}
        {showDemoSection && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="flex-1 h-px bg-[#1F2937]/80" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] whitespace-nowrap">
                Administration
              </span>
              <div className="flex-1 h-px bg-[#1F2937]/80" />
            </div>

            <nav className="flex gap-2 overflow-x-auto md:flex-col no-scrollbar">
              {adminNavItems.map(([label, path]) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium cursor-pointer transition-all duration-200 ${
                    isActive(path)
                      ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30 font-semibold shadow-md'
                      : 'text-[#6B7280] hover:bg-amber-950/30 hover:text-amber-300 hover:translate-x-1 hover:shadow-sm border border-transparent'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Demo Environment section — admin only, separated by a labeled divider */}
        {showDemoSection && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="flex-1 h-px bg-[#1F2937]/80" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] whitespace-nowrap">
                Demo Environment
              </span>
              <div className="flex-1 h-px bg-[#1F2937]/80" />
            </div>

            <nav className="flex gap-2 overflow-x-auto md:flex-col no-scrollbar">
              {demoNavItems.map(([label, path]) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium cursor-pointer transition-all duration-200 ${
                    isActive(path)
                      ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 font-semibold shadow-md'
                      : 'text-[#6B7280] hover:bg-indigo-950/40 hover:text-indigo-300 hover:translate-x-1 hover:shadow-sm border border-transparent'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-[#1F2937]/60">
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all duration-200 cursor-pointer"
        >
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
