import { Suspense, lazy, useEffect } from 'react'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/auth/LoginPage'

// Heavy pages are lazily loaded per-route so the initial download is small and fast.
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const BranchManagementPage = lazy(() => import('../pages/admin/BranchManagementPage'))
const ManagerDashboardPage = lazy(() => import('../pages/manager/ManagerDashboardPage'))
const MenuManagementPage = lazy(() => import('../pages/manager/MenuManagementPage'))
const StaffManagementPage = lazy(() => import('../pages/manager/StaffManagementPage'))
const InventoryPage = lazy(() => import('../pages/manager/InventoryPage'))
const BillingPage = lazy(() => import('../pages/manager/BillingPage'))
const SettingsPage = lazy(() => import('../pages/manager/SettingsPage'))
const KitchenQueuePage = lazy(() => import('../pages/kitchen/KitchenQueuePage'))
const KitchenTablesPage = lazy(() => import('../pages/kitchen/KitchenTablesPage'))
const TableManagementPage = lazy(() => import('../pages/manager/TableManagementPage'))
const ReportsPage = lazy(() => import('../pages/manager/ReportsPage'))
const CustomerMenuPage = lazy(() => import('../pages/customer/CustomerMenuPage'))
const CustomerOrderStatusPage = lazy(() => import('../pages/customer/CustomerOrderStatusPage'))
const CustomerBillRequestPage = lazy(() => import('../pages/customer/CustomerBillRequestPage'))
const DemoEntryPage = lazy(() => import('../pages/demo/DemoEntryPage'))
const DemoMenuPage = lazy(() => import('../pages/demo/DemoMenuPage'))
const DemoOrderStatusPage = lazy(() => import('../pages/demo/DemoOrderStatusPage'))
const DemoBillPage = lazy(() => import('../pages/demo/DemoBillPage'))
const DemoStatisticsPage = lazy(() => import('../pages/admin/DemoStatisticsPage'))
const SuperAdminManagementPage = lazy(() => import('../pages/admin/SuperAdminManagementPage'))
const CashierDashboardPage = lazy(() => import('../pages/cashier/CashierDashboardPage'))
const WaiterPage = lazy(() => import('../pages/waiter/WaiterPage'))

const routes = {
  '/': { page: LandingPage },
  '/demo': { page: DemoEntryPage },
  '/demo/entry': { page: DemoEntryPage },
  '/demo/menu': { page: DemoMenuPage },
  '/demo/order-status': { page: DemoOrderStatusPage },
  '/demo/bill': { page: DemoBillPage },
  '/login': { page: LoginPage },
  '/admin': { page: AdminDashboardPage, roles: ['super_admin'] },
  '/admin/branches': { page: BranchManagementPage, roles: ['super_admin'] },
  '/admin/staff': { page: StaffManagementPage, roles: ['super_admin'] },
  '/admin/tables': { page: TableManagementPage, roles: ['super_admin'] },
  '/admin/reports': { page: ReportsPage, roles: ['super_admin'] },
  '/admin/demo/stats': { page: DemoStatisticsPage, roles: ['super_admin'] },
  '/admin/super-admins': { page: SuperAdminManagementPage, roles: ['super_admin'] },
  '/manager': { page: ManagerDashboardPage, roles: ['branch_manager'] },
  '/manager/menu': { page: MenuManagementPage, roles: ['branch_manager'] },
  '/manager/staff': { page: StaffManagementPage, roles: ['branch_manager'] },
  '/manager/tables': { page: TableManagementPage, roles: ['branch_manager'] },
  '/manager/reports': { page: ReportsPage, roles: ['branch_manager'] },
  '/manager/inventory': { page: InventoryPage, roles: ['branch_manager'] },
  '/manager/billing': { page: BillingPage, roles: ['branch_manager'] },
  '/manager/settings': { page: SettingsPage, roles: ['branch_manager'] },
  '/cashier': { page: CashierDashboardPage, roles: ['cashier'] },
  '/waiter': { page: WaiterPage, roles: ['waiter'] },
  '/kitchen': { page: KitchenQueuePage, roles: ['branch_manager', 'kitchen_staff'] },
  '/kitchen/queue': { page: KitchenQueuePage, roles: ['branch_manager', 'kitchen_staff'] },
  '/kitchen/tables': { page: KitchenTablesPage, roles: ['branch_manager', 'kitchen_staff'] },
  '/table/menu': { page: CustomerMenuPage },
  '/table/order-status': { page: CustomerOrderStatusPage },
  '/table/request-bill': { page: CustomerBillRequestPage },
}

export default function AppRoutes({ path, navigate, session, setSession, loadingSession }) {
  const [pathname, query = ''] = path.split('?')
  const hasTableToken = new URLSearchParams(query).has('token')
  // New QR links use the reliable site root. /index.html is still supported
  // for QR codes issued before this change or static-host fallback behavior.
  const isTableMenuEntry = hasTableToken && (pathname === '/' || pathname === '/index.html')
  const route = (isTableMenuEntry ? routes['/table/menu'] : routes[pathname]) ?? routes['/']
  const isUnauthorized = Boolean(route.roles && (!session || !route.roles.includes(session.role)))

  useEffect(() => {
    if (!loadingSession && isUnauthorized) {
      if (!session) {
        navigate('/login')
      } else if (session.role === 'cashier') {
        navigate('/cashier')
      } else if (session.role === 'kitchen_staff') {
        navigate('/kitchen')
      } else if (session.role === 'waiter') {
        navigate('/waiter')
      } else if (session.role === 'branch_manager') {
        navigate('/manager')
      } else if (session.role === 'super_admin') {
        navigate('/admin')
      } else {
        navigate('/login')
      }
    }
  }, [isUnauthorized, loadingSession, session, navigate])

  if (route.roles && loadingSession) return null
  if (isUnauthorized) return null
  const Page = route.page
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <Page navigate={navigate} setSession={setSession} session={session} />
    </Suspense>
  )
}
