import { useEffect, useMemo, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { getIngredients, createIngredient, adjustIngredientStock, getRecipes, createRecipe, getLowStock, getPurchases, createPurchase } from '../../services/inventoryService'
import { getMenu } from '../../services/menuService'
import { listBranches } from '../../services/branchService'

const TABS = ['Stock', 'Low Stock', 'Recipes', 'Restocks']
const emptyIngredient = { name: '', unit: '', stockQuantity: '', lowStockThreshold: '0' }
const emptyPurchase = { ingredientId: '', quantity: '' }
const newRecipeSlot = () => ({ ingredientId: '', quantityUsed: '' })

export default function InventoryPage({ navigate, session }) {
  const isSuperAdmin = session?.role === 'super_admin'
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState(isSuperAdmin ? '' : (session?.branchId ?? ''))
  const [tab, setTab] = useState('Stock')
  const [ingredients, setIngredients] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [recipes, setRecipes] = useState([])
  const [purchases, setPurchases] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [ingForm, setIngForm] = useState(emptyIngredient)
  const [recipeItemId, setRecipeItemId] = useState('')
  const [recipeSlots, setRecipeSlots] = useState([{ ingredientId: '', quantityUsed: '' }])
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase)
  const [adjustStock, setAdjustStock] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const targetBranchId = isSuperAdmin ? branchId : session?.branchId
  const itemMap = useMemo(() => Object.fromEntries(menuItems.map((i) => [i.id, i.name])), [menuItems])
  const ingredientMap = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  async function reload() {
    if (!targetBranchId) return
    setError('')
    try {
      const [ing, low, rec, pur, menu] = await Promise.all([
        getIngredients(targetBranchId),
        getLowStock(targetBranchId),
        getRecipes(targetBranchId),
        getPurchases(targetBranchId),
        getMenu(targetBranchId),
      ])
      setIngredients(ing.ingredients ?? [])
      setLowStock(low.ingredients ?? [])
      setRecipes(rec.recipes ?? [])
      setPurchases(pur.purchases ?? [])
      setMenuItems(menu.items ?? [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      if (isSuperAdmin) {
        try {
          const { branches: loaded } = await listBranches()
          const active = loaded.filter((b) => b.isActive && !b.isDemo && !b.name?.toLowerCase().includes('demo'))
          setBranches(active)
          if (!branchId && active.length) setBranchId(active[0].id)
        } catch {}
      }
      await reload()
      setLoading(false)
    })()
  }, [targetBranchId, isSuperAdmin])

  const stats = {
    total: ingredients.length,
    low: lowStock.length,
    out: ingredients.filter((i) => Number(i.stockQuantity) <= 0).length,
  }

  async function run(label, fn) {
    setSaving(label)
    setError('')
    setSuccess('')
    try {
      await fn()
      await reload()
      setSuccess(label)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving('')
    }
  }

  async function addIngredient(e) {
    e.preventDefault()
    await run('Ingredient added', () =>
      createIngredient(
        {
          name: ingForm.name.trim(),
          unit: ingForm.unit.trim(),
          stockQuantity: Number(ingForm.stockQuantity || 0),
          lowStockThreshold: Number(ingForm.lowStockThreshold || 0),
        },
        targetBranchId,
      ),
    )
    if (!error) setIngForm(emptyIngredient)
  }

  async function saveStock(id, name) {
    await run(`Stock for ${name} updated`, () => adjustIngredientStock(id, Number(adjustStock[id]), targetBranchId))
  }

  async function addRecipe(e) {
    e.preventDefault()
    const slots = recipeSlots.filter((s) => s.ingredientId && s.quantityUsed !== '')
    if (!recipeItemId) {
      setError('Choose a menu item first.')
      return
    }
    if (slots.length === 0) {
      setError('Add at least one ingredient with a quantity.')
      return
    }
    setSaving('Recipe saved')
    setError('')
    setSuccess('')
    try {
      for (const s of slots) {
        await createRecipe({ itemId: recipeItemId, ingredientId: s.ingredientId, quantityUsed: Number(s.quantityUsed) }, targetBranchId)
      }
      await reload()
      setSuccess(`Recipe for "${itemMap[recipeItemId] ?? 'item'}" saved (${slots.length} ingredient${slots.length > 1 ? 's' : ''}).`)
      setRecipeItemId('')
      setRecipeSlots([newRecipeSlot()])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving('')
    }
  }

  function updateRecipeSlot(idx, patch) {
    setRecipeSlots((slots) => slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  function addRecipeSlot() {
    setRecipeSlots((slots) => [...slots, newRecipeSlot()])
  }

  function removeRecipeSlot(idx) {
    setRecipeSlots((slots) => slots.filter((_, i) => i !== idx))
  }

  // Simplified stock addition: Only ingredient, unit, and quantity added
  async function addPurchase(e) {
    e.preventDefault()
    const selectedIng = ingredientMap[purchaseForm.ingredientId]
    const qty = Number(purchaseForm.quantity)
    if (!purchaseForm.ingredientId) {
      setError('Please select an ingredient.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Please enter a positive quantity received.')
      return
    }
    await run(`Added ${qty} ${selectedIng?.unit || ''} to ${selectedIng?.name || 'ingredient'}`, () =>
      createPurchase(
        {
          ingredientId: purchaseForm.ingredientId,
          quantity: qty,
        },
        targetBranchId,
      ),
    )
    setPurchaseForm(emptyPurchase)
  }

  const activePurchaseIngredient = ingredientMap[purchaseForm.ingredientId]

  return (
    <PageShell area="manager" title="Inventory Management" description="Monitor ingredient stock levels, receive new inventory, and manage item recipe requirements." navigate={navigate}>
      <div className="space-y-5">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-[#0B0F1A] text-white' : 'bg-[#151B2B] text-[#9CA3AF] border border-[#374151] hover:bg-[#0B0F1A]'}`}>{t}</button>
            ))}
          </div>
          {isSuperAdmin && (
            <label className="flex items-center gap-2 text-sm font-semibold text-[#9CA3AF]">
              Branch
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg border border-[#374151] px-3 py-1.5">
                <option value="">Select…</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
        </div>

        {tab === 'Stock' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-4">
              <p className="text-xs uppercase text-[#8B93A7]">Ingredients</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase text-[#F5A623]">Low stock</p>
              <p className="text-2xl font-bold text-[#F5A623]">{stats.low}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs uppercase text-red-500">Out of stock</p>
              <p className="text-2xl font-bold text-red-700">{stats.out}</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-[#9CA3AF]">Loading inventory…</p>
        ) : (
          <>
            {/* ── Tab: Stock ────────────────────────────────────────────── */}
            {tab === 'Stock' && (
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <section className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm">
                  <h2 className="mb-1 text-lg font-semibold text-[#F9FAFB]">Current Ingredient Stock</h2>
                  <p className="mb-4 text-sm text-[#9CA3AF]">Active stock levels by ingredient. Stock automatically decreases only when orders are completed.</p>
                  {ingredients.length === 0 ? (
                    <p className="text-sm text-[#8B93A7]">No ingredients registered yet — add one on the right.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-[#8B93A7]">
                          <tr>
                            <th className="py-2 pr-4">Ingredient</th>
                            <th className="py-2 pr-4">Unit</th>
                            <th className="py-2 pr-4">Current Stock</th>
                            <th className="py-2 pr-4">Low Stock Alert</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2">Set Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredients.map((ing) => {
                            const stock = Number(ing.stockQuantity)
                            const out = stock <= 0
                            const low = out || stock <= Number(ing.lowStockThreshold)
                            return (
                              <tr key={ing.id} className="border-t border-[#1E2435]">
                                <td className="py-3 pr-4 font-medium text-[#F9FAFB]">{ing.name}</td>
                                <td className="py-3 pr-4 text-[#9CA3AF]">{ing.unit}</td>
                                <td className="py-3 pr-4 font-bold text-[#F9FAFB]">{stock}</td>
                                <td className="py-3 pr-4 text-[#9CA3AF]">{Number(ing.lowStockThreshold)}</td>
                                <td className="py-3 pr-4">
                                  {out ? (
                                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>
                                  ) : low ? (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-[#F5A623]">Low stock</span>
                                  ) : (
                                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">In stock</span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      className="w-20 rounded-lg border border-[#374151] px-2 py-1 text-sm text-white"
                                      placeholder={String(stock)}
                                      value={adjustStock[ing.id] ?? ''}
                                      onChange={(e) => setAdjustStock((s) => ({ ...s, [ing.id]: e.target.value }))}
                                    />
                                    <button
                                      id={`adjust-stock-${ing.id}`}
                                      onClick={() => saveStock(ing.id, ing.name)}
                                      disabled={saving}
                                      className="rounded-lg bg-[#0B0F1A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2A3348] disabled:opacity-50"
                                    >
                                      Set
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <aside className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm self-start">
                  <h2 className="mb-3 text-lg font-semibold text-[#F9FAFB]">Add New Ingredient</h2>
                  <form className="grid gap-3" onSubmit={addIngredient}>
                    <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                      Ingredient Name
                      <input
                        className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white"
                        value={ingForm.name}
                        onChange={(e) => setIngForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Milk, Coffee beans, Sugar"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                      Measurement Unit
                      <input
                        className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white"
                        value={ingForm.unit}
                        onChange={(e) => setIngForm((f) => ({ ...f, unit: e.target.value }))}
                        placeholder="e.g. Litres, g, kg, ml"
                        required
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                        Initial Stock
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white"
                          value={ingForm.stockQuantity}
                          onChange={(e) => setIngForm((f) => ({ ...f, stockQuantity: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                        Low Stock Alert At
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white"
                          value={ingForm.lowStockThreshold}
                          onChange={(e) => setIngForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                        />
                      </label>
                    </div>
                    <button type="submit" disabled={saving} className="rounded-lg bg-[#0B0F1A] py-2.5 text-sm font-semibold text-white hover:bg-[#2A3348] disabled:opacity-50">
                      Add Ingredient
                    </button>
                  </form>
                </aside>
              </div>
            )}

            {/* ── Tab: Low Stock ────────────────────────────────────────── */}
            {tab === 'Low Stock' && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <h2 className="text-lg font-semibold text-[#F5A623]">Low stock &amp; out of stock alerts</h2>
                <p className="mb-4 text-sm text-[#F5A623]">Ingredients at or below their low-stock threshold. Restock them using the <b>Restocks</b> tab.</p>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]">All ingredients are currently above their low-stock threshold. 🎉</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {lowStock.map((ing) => {
                      const stock = Number(ing.stockQuantity)
                      const out = stock <= 0
                      return (
                        <div key={ing.id} className={`rounded-xl border p-4 ${out ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-[#151B2B]'}`}>
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-[#F9FAFB]">{ing.name}</p>
                            {out ? (
                              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-[#F5A623]">Low stock</span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-[#9CA3AF]">
                            Current stock: <b className="text-white">{stock} {ing.unit}</b> (Alert threshold: {Number(ing.lowStockThreshold)} {ing.unit})
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ── Tab: Recipes ──────────────────────────────────────────── */}
            {tab === 'Recipes' && (
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <section className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm">
                  <h2 className="mb-1 text-lg font-semibold text-[#F9FAFB]">Menu Item Recipes</h2>
                  <p className="mb-4 text-sm text-[#9CA3AF]">Configured recipe formulas. When an order with these items transitions to <b>COMPLETED</b>, inventory is automatically decreased exactly once.</p>
                  {recipes.length === 0 ? (
                    <p className="text-sm text-[#8B93A7]">No recipes linked yet — map a menu item to its ingredients on the right.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-[#8B93A7]">
                          <tr>
                            <th className="py-2 pr-4">Menu item</th>
                            <th className="py-2 pr-4">Ingredient</th>
                            <th className="py-2">Quantity Used</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipes.map((r) => (
                            <tr key={r.id} className="border-t border-[#1E2435]">
                              <td className="py-2.5 pr-4 font-medium text-[#F9FAFB]">{itemMap[r.itemId] ?? '—'}</td>
                              <td className="py-2.5 pr-4 text-[#9CA3AF]">{ingredientMap[r.ingredientId]?.name ?? '—'}</td>
                              <td className="py-2.5 text-[#9CA3AF] font-semibold">
                                {Number(r.quantityUsed)} {ingredientMap[r.ingredientId]?.unit ?? ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <aside className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm self-start">
                  <h2 className="mb-3 text-lg font-semibold text-[#F9FAFB]">Link Recipe Formula</h2>
                  <form className="grid gap-3" onSubmit={addRecipe}>
                    <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                      Menu Item
                      <select
                        className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white bg-[#151B2B]"
                        value={recipeItemId}
                        onChange={(e) => {
                          setRecipeItemId(e.target.value)
                          setRecipeSlots([newRecipeSlot()])
                        }}
                        required
                      >
                        <option value="">Select menu item…</option>
                        {menuItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </label>

                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">Ingredients Formula</p>
                    {recipeSlots.map((slot, idx) => (
                      <div key={idx} className="grid gap-2 rounded-lg border border-[#1F2937] p-3">
                        <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                          Ingredient {idx + 1}
                          <select
                            className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white bg-[#151B2B]"
                            value={slot.ingredientId}
                            onChange={(e) => updateRecipeSlot(idx, { ingredientId: e.target.value })}
                          >
                            <option value="">Select ingredient…</option>
                            {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                          Quantity Per Item
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            className="w-full rounded-lg border border-[#374151] px-3 py-2 text-white"
                            value={slot.quantityUsed}
                            onChange={(e) => updateRecipeSlot(idx, { quantityUsed: e.target.value })}
                            placeholder="e.g. 200 or 0.2"
                          />
                        </label>
                        {recipeSlots.length > 1 && (
                          <button type="button" onClick={() => removeRecipeSlot(idx)} className="justify-self-start rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addRecipeSlot} className="rounded-lg border border-[#374151] px-3 py-2 text-sm font-semibold text-[#9CA3AF] hover:bg-[#0B0F1A]">
                      + Add another ingredient
                    </button>
                    <button type="submit" disabled={saving} className="rounded-lg bg-[#0B0F1A] py-2.5 text-sm font-semibold text-white hover:bg-[#2A3348] disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save recipe'}
                    </button>
                  </form>
                </aside>
              </div>
            )}

            {/* ── Tab: Restocks (Simplified — NO supplier/source info) ──── */}
            {tab === 'Restocks' && (
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <section className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm">
                  <h2 className="mb-1 text-lg font-semibold text-[#F9FAFB]">Stock Addition History</h2>
                  <p className="mb-4 text-sm text-[#9CA3AF]">Log of received inventory. Every stock addition increases the current quantity automatically.</p>
                  {purchases.length === 0 ? (
                    <p className="text-sm text-[#8B93A7]">No stock additions recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-[#8B93A7]">
                          <tr>
                            <th className="py-2.5 pr-4">Date &amp; Time Added</th>
                            <th className="py-2.5 pr-4">Ingredient</th>
                            <th className="py-2.5 pr-4">Quantity Received</th>
                            <th className="py-2.5">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2435]">
                          {purchases.map((p) => {
                            const ing = ingredientMap[p.ingredientId]
                            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString() : new Date(p.purchaseDate).toLocaleDateString()
                            return (
                              <tr key={p.id}>
                                <td className="py-3 pr-4 text-[#9CA3AF] text-xs">{dateStr}</td>
                                <td className="py-3 pr-4 font-semibold text-white">{ing?.name ?? '—'}</td>
                                <td className="py-3 pr-4 font-bold text-emerald-400">+ {Number(p.quantity)}</td>
                                <td className="py-3 text-[#9CA3AF]">{ing?.unit ?? '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <aside className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm self-start">
                  <h2 className="mb-1 text-lg font-semibold text-[#F9FAFB]">Add Inventory Stock</h2>
                  <p className="mb-4 text-xs text-[#9CA3AF]">Record received stock to increase inventory.</p>

                  {ingredients.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF]">Add an ingredient first in the Stock tab.</p>
                  ) : (
                    <form className="grid gap-3.5" onSubmit={addPurchase} id="add-stock-form">
                      {/* Ingredient Selection */}
                      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                        Ingredient
                        <select
                          id="stock-ingredient-select"
                          className="rounded-xl border border-[#374151] px-3.5 py-2.5 text-sm text-white bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                          value={purchaseForm.ingredientId}
                          onChange={(e) => setPurchaseForm((f) => ({ ...f, ingredientId: e.target.value }))}
                          required
                        >
                          <option value="">Select ingredient…</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} (Current: {Number(ing.stockQuantity)} {ing.unit})
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* Unit (Automatically shown based on selected ingredient) */}
                      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                        Unit of Measurement
                        <input
                          type="text"
                          readOnly
                          value={activePurchaseIngredient ? activePurchaseIngredient.unit : 'Select an ingredient above'}
                          className="rounded-xl border border-white/10 px-3.5 py-2.5 text-sm text-[#9CA3AF] bg-[#090C15] cursor-not-allowed"
                        />
                      </label>

                      {/* Quantity Received */}
                      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
                        Quantity Received
                        <input
                          id="stock-quantity-input"
                          type="number"
                          min="0.01"
                          step="any"
                          className="w-full rounded-xl border border-[#374151] px-3.5 py-2.5 text-sm text-white bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                          value={purchaseForm.quantity}
                          onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))}
                          placeholder="e.g. 20"
                          required
                        />
                      </label>

                      {/* Date Note */}
                      <p className="text-[11px] text-[#6B7280]">
                        🕒 The current date and timestamp will be automatically recorded upon addition.
                      </p>

                      <button
                        id="add-stock-btn"
                        type="submit"
                        disabled={saving}
                        className="neo-btn-primary mt-1 py-3 text-sm font-bold tracking-wide transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {Number(purchaseForm.quantity || 0) > 0 && activePurchaseIngredient
                          ? `Add ${purchaseForm.quantity} ${activePurchaseIngredient.unit} to Stock`
                          : 'Add to Stock'}
                      </button>
                    </form>
                  )}
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
