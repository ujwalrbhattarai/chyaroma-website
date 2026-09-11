import { useEffect, useMemo, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { createBranch, deactivateBranch, listBranches, updateBranch } from '../../services/branchService'

const emptyForm = { name: '', address: '', contactPhone: '', contactEmail: '', taxRate: '0', openingHours: '' }

export default function BranchManagementPage({ navigate, session }) {
	const [branches, setBranches] = useState([])
	const [scope, setScope] = useState('all')
	const [editingId, setEditingId] = useState(null)
	const [form, setForm] = useState(emptyForm)
	const [error, setError] = useState('')

	useEffect(() => {
		listBranches().then(({ branches: loadedBranches }) => setBranches(loadedBranches.filter((b) => !b.isDemo && !b.name?.toLowerCase().includes('demo')))).catch((fetchError) => setError(fetchError.message))
	}, [])

	const scopedBranches = useMemo(() => (scope === 'all' ? branches : branches.filter((branch) => branch.id === scope)), [branches, scope])

	const beginEdit = (branch) => {
		setEditingId(branch.id)
		setScope(branch.id)
		setForm({ name: branch.name, address: branch.address, contactPhone: branch.contactPhone, contactEmail: branch.contactEmail, taxRate: String(branch.taxRate), openingHours: branch.openingHours })
	}

	async function saveBranch(event) {
		event.preventDefault()
		setError('')
		try {
			const payload = { ...form, taxRate: Number(form.taxRate) }
			if (editingId) {
				const { branch } = await updateBranch(editingId, payload)
				setBranches((current) => current.map((item) => (item.id === branch.id ? branch : item)))
			} else {
				const { branch } = await createBranch(payload)
				setBranches((current) => [...current, branch])
				setScope(branch.id)
			}
			setEditingId(null)
			setForm(emptyForm)
		} catch (saveError) {
			setError(saveError.message)
		}
	}

	async function handleDeactivate(branchId) {
		setError('')
		try {
			const { branch } = await deactivateBranch(branchId)
			setBranches((current) => current.map((item) => (item.id === branch.id ? branch : item)))
			if (scope === branch.id) setScope('all')
		} catch (deactivateError) {
			setError(deactivateError.message)
		}
	}

	return <PageShell area="admin" title="Branch Management" description="Create, configure, and switch between cafe branches." navigate={navigate}>
		<div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
			<section className="neo-card rounded-2xl p-6 text-[#F9FAFB]">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2937]/80 pb-4">
					<div>
						<h2 className="text-xl font-bold text-[#F9FAFB]">Branch Switcher</h2>
						<p className="text-xs text-[#9CA3AF] mt-0.5">{session?.role === 'super_admin' ? 'Super Admin view - all cafe locations.' : 'Branch-scoped view.'}</p>
					</div>
					<select 
						className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer" 
						value={scope} 
						onChange={(event) => setScope(event.target.value)}
					>
						<option value="all">All Branches</option>
						{branches.filter((branch) => branch.isActive).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
					</select>
				</div>
				<div className="grid gap-4">
					{scopedBranches.map((branch) => <article className="neo-card rounded-xl p-5 border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-300" key={branch.id}>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="space-y-1">
								<h3 className="text-lg font-bold text-[#F9FAFB] flex items-center gap-2">
									<span>{branch.name}</span>
									{!branch.isActive && <span className="text-xs bg-red-900/50 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
								</h3>
								<p className="text-sm text-[#9CA3AF] font-medium">{branch.address}</p>
								<p className="text-xs text-[#8B93A7]">{branch.contactPhone} · {branch.contactEmail}</p>
								<p className="text-xs text-[#D4AF37] font-semibold">Tax Rate: {branch.taxRate}% · Hours: {branch.openingHours}</p>
							</div>
							<div className="flex gap-2.5">
								<button 
									className="neo-btn-green px-4 py-2 text-xs rounded-xl font-bold tracking-wide cursor-pointer" 
									onClick={() => beginEdit(branch)}
								>
									Edit
								</button>
								<button 
									className="neo-btn-red px-4 py-2 text-xs rounded-xl font-bold tracking-wide cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" 
									disabled={!branch.isActive} 
									onClick={() => handleDeactivate(branch.id)}
								>
									Deactivate
								</button>
							</div>
						</div>
					</article>)}
				</div>
			</section>

			<section className="neo-card rounded-2xl p-6">
				<h2 className="text-xl font-bold text-[#F9FAFB]">{editingId ? 'Edit Branch' : 'Create Branch'}</h2>
				<p className="mt-1 text-xs text-[#9CA3AF]">Stores branch address, contact phone, email, tax rate, and opening hours.</p>
				<form className="mt-6 grid gap-4" onSubmit={saveBranch}>
					<label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
						Branch Name
						<input className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
					</label>
					<label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
						Address
						<input className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} required />
					</label>
					<label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
						Contact Phone
						<input className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} required />
					</label>
					<label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
						Contact Email
						<input className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} required />
					</label>
					<label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
						Tax Rate (%)
						<input className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" type="number" min="0" step="0.01" value={form.taxRate} onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))} required />
					</label>
					<label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
						Opening Hours
						<input className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.openingHours} onChange={(event) => setForm((current) => ({ ...current, openingHours: event.target.value }))} required />
					</label>

					{error && <p className="text-sm text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-800/40" role="alert">{error}</p>}
					
					<div className="mt-2 flex flex-col gap-2.5">
						<button className="neo-btn-green py-3.5 px-5 rounded-xl font-bold text-sm tracking-wide" type="submit">
							{editingId ? 'Save Branch Changes' : 'Create Branch'}
						</button>
						{editingId && (
							<button className="neo-inset py-3 px-5 rounded-xl text-sm font-semibold text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#374151] transition-colors" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setScope('all') }}>
								Cancel Edit
							</button>
						)}
					</div>
				</form>
			</section>
		</div>
	</PageShell>
}


