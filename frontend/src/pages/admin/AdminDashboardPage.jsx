import PageShell from '../../components/shared/PageShell'
import DashboardOverview from '../../components/dashboard/DashboardOverview'

export default function AdminDashboardPage({ navigate, session }) {
  return (
    <PageShell area="admin" title="Admin dashboard" description="A combined view of all branches, sales, and operations." navigate={navigate}>
      <DashboardOverview session={session} />
    </PageShell>
  )
}
