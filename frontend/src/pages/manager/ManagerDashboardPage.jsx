import PageShell from '../../components/shared/PageShell'
import DashboardOverview from '../../components/dashboard/DashboardOverview'
import TableTransferPanel from '../../components/staff/TableTransferPanel'
import TableBillBoard from '../../components/staff/TableBillBoard'

export default function ManagerDashboardPage({ navigate, session }) {
  return (
    <PageShell area="manager" title="Branch dashboard" description="A manager's operational overview for their assigned branch." navigate={navigate}>
      <DashboardOverview session={session} />
      <div className="mt-6">
        <TableBillBoard branchId={session?.branchId} />
      </div>
      <div className="mt-6">
        <TableTransferPanel branchId={session?.branchId} />
      </div>
    </PageShell>
  )
}
