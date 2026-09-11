import { useEffect } from 'react'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import BranchManagementPage from '../pages/admin/BranchManagementPage'
import ManagerDashboardPage from '../pages/manager/ManagerDashboardPage'
import MenuManagementPage from '../pages/manager/MenuManagementPage'
import StaffManagementPage from '../pages/manager/StaffManagementPage'
import InventoryPage from '../pages/manager/InventoryPage'
import BillingPage from '../pages/manager/BillingPage'
import SettingsPage from '../pages/manager/SettingsPage'
import KitchenQueuePage from '../pages/kitchen/KitchenQueuePage'
import KitchenTablesPage from '../pages/kitchen/KitchenTablesPage'
import TableManagementPage from '../pages/manager/TableManagementPage'
import ReportsPage from '../pages/manager/ReportsPage'
import CustomerMenuPage from '../pages/customer/CustomerMenuPage'
import CustomerOrderStatusPage from '../pages/customer/CustomerOrderStatusPage'
import CustomerBillRequestPage from '../pages/customer/CustomerBillRequestPage'
import DemoEntryPage from '../pages/demo/DemoEntryPage'
import DemoMenuPage from '../pages/demo/DemoMenuPage'
import DemoOrderStatusPage from '../pages/demo/DemoOrderStatusPage'
import DemoBillPage from '../pages/demo/DemoBillPage'
import DemoStatisticsPage from '../pages/admin/DemoStatisticsPage'
import SuperAdminManagementPage from '../pages/admin/SuperAdminManagementPage'
import CashierDashboardPage from '../pages/cashier/CashierDashboardPage'

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
  '/kitchen': { page: KitchenQueuePage, roles: ['branch_manager', 'kitchen_staff'] },
  '/kitchen/queue': { page: KitchenQueuePage, roles: ['branch_manager', 'kitchen_staff'] },
  '/kitchen/tables': { page: KitchenTablesPage, roles: ['branch_manager', 'kitchen_staff'] },
  '/table/menu': { page: CustomerMenuPage },
  '/table/order-status': { page: CustomerOrderStatusPage },
  '/table/request-bill': { page: CustomerBillRequestPage },
}

export default function AppRoutes({ path, navigate, session, setSession, loadingSession }) {
  const pathname = path.split('?')[0]
  const route = routes[pathname] ?? routes['/']
  const isUnauthorized = Boolean(route.roles && (!session || !route.roles.includes(session.role)))

  useEffect(() => {
    if (!loadingSession && isUnauthorized) {
      if (!session) {
        navigate('/login')
      } else if (session.role === 'cashier') {
        navigate('/cashier')
      } else if (session.role === 'kitchen_staff') {
        navigate('/kitchen')
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
  return <Page navigate={navigate} setSession={setSession} session={session} />
}

