import { useEffect, useRef, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import MenuCategoryList from '../../components/menu/MenuCategoryList'
import {
  getMenu, createCategory, updateCategory, deactivateCategory,
  createMenuItem, updateMenuItem, toggleAvailability, imageUrl,
} from '../../services/menuService'
import { getIngredients, getRecipes, replaceRecipe } from '../../services/inventoryService'

const emptyCategoryForm = { name: '', sortOrder: '0' }
const emptyItemForm = { name: '', price: '', description: '', prepTimeMinutes: '0', categoryId: '', isAvailable: true }

export default function MenuManagementPage({ navigate, session }) {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Panel modes: null | 'category' | 'item'
  const [panelMode, setPanelMode] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [pendingCategoryId, setPendingCategoryId] = useState(null) // for new item
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [toggling, setToggling] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const imageInputRef = useRef(null)

  // Formula (recipe) state — the ingredients used to make a menu item.
  const [ingredients, setIngredients] = useState([])
  const [recipesByItem, setRecipesByItem] = useState({}) // itemId -> recipe lines
  const [formula, setFormula] = useState([]) // { ingredientId, quantityUsed }

  const branchId = session?.role === 'super_admin' ? undefined : undefined // manager uses own branchId server-side

  async function reload() {
    try {
      const [data, inv, rec] = await Promise.all([getMenu(), getIngredients(), getRecipes()])
      setCategories(data.categories ?? [])
      setItems(data.items ?? [])
      setIngredients(inv.ingredients ?? [])
      const map = {}
      for (const r of rec.recipes ?? []) { (map[r.itemId] ||= []).push(r) }
      setRecipesByItem(map)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  // --- Category actions ---
  function openNewCategory() {
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm)
    setPanelMode('category')
  }

  function openEditCategory(cat) {
    setEditingCategory(cat)
    setCategoryForm({ name: cat.name, sortOrder: String(cat.sortOrder ?? 0) })
    setPanelMode('category')
  }

  async function handleCategorySubmit(event) {
    event.preventDefault()
    setError('')
    const payload = { name: categoryForm.name, sortOrder: Number(categoryForm.sortOrder) }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
      } else {
        await createCategory(payload)
      }
      await reload()
      setPanelMode(null)
    } catch (err) { setError(err.message) }
  }

  async function handleDeactivateCategory(catId) {
    setError('')
    try { await deactivateCategory(catId); await reload() } catch (err) { setError(err.message) }
  }

  // --- Item actions ---
  function openNewItem(cat) {
    setEditingItem(null)
    setPendingCategoryId(cat.id)
    setItemForm({ ...emptyItemForm, categoryId: cat.id })
    setImageFile(null)
    setImagePreview('')
    setFormula([newFormulaRow()])
    setPanelMode('item')
  }

  function openEditItem(item) {
    setEditingItem(item)
    setItemForm({
      name: item.name, price: String(item.price), description: item.description ?? '',
      prepTimeMinutes: String(item.prepTimeMinutes ?? 0), categoryId: item.categoryId, isAvailable: item.isAvailable,
    })
    setImageFile(null)
    setImagePreview('')
    const current = recipesByItem[item.id] || []
    setFormula(
      current.length
        ? current.map((r) => ({ ingredientId: r.ingredientId, quantityUsed: String(r.quantityUsed) }))
        : [newFormulaRow()],
    )
    setPanelMode('item')
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : '')
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview('')
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handleItemSubmit(event) {
    event.preventDefault()
    setError('')
    const payload = {
      name: itemForm.name, price: Number(itemForm.price), description: itemForm.description,
      prepTimeMinutes: Number(itemForm.prepTimeMinutes), categoryId: itemForm.categoryId,
      isAvailable: itemForm.isAvailable,
    }
    try {
      let savedItemId = editingItem ? editingItem.id : null
      if (editingItem) {
        await updateMenuItem(editingItem.id, payload, imageFile)
      } else {
        const created = await createMenuItem(payload, imageFile)
        savedItemId = created?.item?.id ?? created?.id
      }

      // Save the formula (ingredient lines) for this item — empty array clears it.
      const lines = formula
        .filter((f) => f.ingredientId && f.quantityUsed !== '' && f.quantityUsed !== null)
        .map((f) => ({ ingredientId: f.ingredientId, quantityUsed: Number(f.quantityUsed) }))
      if (savedItemId) {
        try {
          await replaceRecipe(savedItemId, lines)
        } catch (recipeErr) {
          setError(`Item saved, but the formula could not be saved: ${recipeErr.message}`)
        }
      }

      setImageFile(null)
      setImagePreview('')
      await reload()
      setPanelMode(null)
    } catch (err) { setError(err.message) }
  }

  function newFormulaRow() { return { ingredientId: '', quantityUsed: '' } }
  function updateFormula(index, key, value) { setFormula((f) => f.map((row, i) => (i === index ? { ...row, [key]: value } : row))) }
  function addFormulaRow() { setFormula((f) => [...f, newFormulaRow()]) }
  function removeFormulaRow(index) { setFormula((f) => f.filter((_, i) => i !== index)) }

  async function handleToggle(itemId, isAvailable) {
    setToggling(itemId)
    setError('')
    try { await toggleAvailability(itemId, isAvailable); await reload() }
    catch (err) { setError(err.message) }
    finally { setToggling(null) }
  }

  // Group items by category
  const itemsByCategory = new Map(categories.map((c) => [c.id, []]))
  for (const item of items) {
    if (itemsByCategory.has(item.categoryId)) itemsByCategory.get(item.categoryId).push(item)
  }
  const formulaCount = {}
  for (const item of items) formulaCount[item.id] = (recipesByItem[item.id] || []).length

  return (
    <PageShell area="manager" title="Menu management" description="Manage categories, items, prices, and availability for your branch menu." navigate={navigate}>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Category + item list */}
        <div className="grid gap-4 content-start">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#9CA3AF]">{categories.filter((c) => c.isActive).length} active categories · {items.filter((i) => i.isAvailable).length} available items</p>
            <button id="add-category-btn" className="rounded-lg bg-[#0B0F1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A3348]" onClick={openNewCategory}>
              + Category
            </button>
          </div>
          {loading
            ? <p className="text-[#8B93A7]">Loading menu…</p>
            : categories.length === 0
              ? <p className="rounded-xl border border-dashed border-[#374151] p-8 text-center text-[#8B93A7]">No categories yet. Add one to get started.</p>
              : categories.map((cat) => (
                <MenuCategoryList
                  key={cat.id}
                  category={cat}
                  items={itemsByCategory.get(cat.id) ?? []}
                  onEditCategory={openEditCategory}
                  onDeactivateCategory={handleDeactivateCategory}
                  onAddItem={openNewItem}
                  onEditItem={openEditItem}
                  onToggleAvailability={handleToggle}
                  toggling={toggling}
                  formulaCount={formulaCount}
                />
              ))}
        </div>

        {/* Side panel: category or item form */}
        {panelMode && (
          <aside className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm self-start">
            {panelMode === 'category' && (
              <>
                <h2 className="mb-4 text-lg font-semibold text-[#F9FAFB]">{editingCategory ? 'Edit category' : 'New category'}</h2>
                <form id="category-form" className="grid gap-4" onSubmit={handleCategorySubmit}>
                  <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                    Name
                    <input id="category-name" className="rounded-lg border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]" value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} required />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                    Sort order
                    <input id="category-sort" type="number" min="0" className="rounded-lg border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((f) => ({ ...f, sortOrder: e.target.value }))} />
                  </label>
                  <div className="flex gap-2">
                    <button id="save-category" type="submit" className="flex-1 rounded-lg bg-[#0B0F1A] py-2 text-sm font-semibold text-white hover:bg-[#2A3348]">{editingCategory ? 'Save' : 'Create'}</button>
                    <button type="button" className="rounded-lg border border-[#374151] px-4 py-2 text-sm" onClick={() => setPanelMode(null)}>Cancel</button>
                  </div>
                </form>
              </>
            )}

            {panelMode === 'item' && (
              <>
                <h2 className="mb-4 text-lg font-semibold text-[#F9FAFB]">{editingItem ? 'Edit item' : 'New item'}</h2>
                <form id="item-form" className="grid gap-4" onSubmit={handleItemSubmit}>
                  <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                    Name
                    <input id="item-name" className="rounded-lg border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]" value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} required />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                    Price (Rs)
                    <input id="item-price" type="number" min="0" step="0.01" className="rounded-lg border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]" value={itemForm.price} onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))} required />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                    Description
                    <textarea id="item-description" rows="2" className="rounded-lg border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]" value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#9CA3AF]">
                    Prep time (minutes)
                    <input id="item-prep" type="number" min="0" className="rounded-lg border border-[#374151] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F5A623]" value={itemForm.prepTimeMinutes} onChange={(e) => setItemForm((f) => ({ ...f, prepTimeMinutes: e.target.value }))} />
                  </label>
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-[#9CA3AF]">Photo</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        id="item-image-button"
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-semibold text-[#F5A623] hover:bg-amber-100"
                      >
                        {imageFile || editingItem?.imageUrl ? 'Change photo' : '📷 Upload photo'}
                      </button>
                      <input
                        id="item-image"
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      {(imageFile || editingItem?.imageUrl) && (
                        <button type="button" onClick={clearImage} className="text-sm text-red-600 hover:underline">Remove</button>
                      )}
                    </div>
                    {(imagePreview || (editingItem?.imageUrl && !imagePreview)) ? (
                      <div className="rounded-lg border border-[#1F2937] p-2">
                        <img src={imagePreview || imageUrl(editingItem.imageUrl)} alt={`${itemForm.name} preview`} className="h-32 w-full rounded-md object-cover" />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#374151] px-4 py-6 text-center text-xs text-[#8B93A7]">
                        No photo yet — click “Upload photo” to add one from your device.
                      </div>
                    )}
                    <span className="text-xs font-normal text-[#8B93A7]">Upload a photo of this item from your device (optional).</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[#9CA3AF]">
                    <input id="item-available" type="checkbox" className="h-4 w-4 rounded" checked={itemForm.isAvailable} onChange={(e) => setItemForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
                    Available immediately
                  </label>

                  {/* Formula (ingredients) editor */}
                  <fieldset className="rounded-xl border border-[#1F2937] bg-[#101524] p-3">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Formula (ingredients)</legend>
                    <p className="mb-3 text-xs text-[#8B93A7]">
                      Ingredients used to make this item. Inventory is deducted automatically when an order for it is completed.
                    </p>
                    {formula.length === 0 && (
                      <p className="mb-2 text-xs text-[#8B93A7]">No ingredients yet — add the ingredients this item needs.</p>
                    )}
                    <div className="grid gap-2">
                      {formula.map((row, i) => {
                        const rowIng = ingredients.find((ing) => ing.id === row.ingredientId)
                        return (
                          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] items-center">
                            <select
                              className="rounded-lg border border-[#374151] bg-[#0B0F1A] px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                              value={row.ingredientId}
                              onChange={(e) => updateFormula(i, 'ingredientId', e.target.value)}
                            >
                              <option value="">Select ingredient…</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1 text-xs text-[#8B93A7]">
                              Qty
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-20 rounded-lg border border-[#374151] bg-[#0B0F1A] px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                                placeholder="0.25"
                                value={row.quantityUsed}
                                onChange={(e) => updateFormula(i, 'quantityUsed', e.target.value)}
                              />
                              <span>{rowIng?.unit || ''}</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeFormulaRow(i)}
                              className="rounded-lg border border-[#374151] px-2 py-2 text-sm text-[#9CA3AF] hover:bg-[#0B0F1A]"
                              title="Remove ingredient"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    {ingredients.length > 0 ? (
                      <button
                        type="button"
                        onClick={addFormulaRow}
                        className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        + Ingredient
                      </button>
                    ) : (
                      <p className="mt-3 text-xs text-[#8B93A7]">
                        No ingredients found. Add ingredients in the Inventory page first to build a formula.
                      </p>
                    )}
                  </fieldset>
                  <div className="flex gap-2">
                    <button id="save-item" type="submit" className="flex-1 rounded-lg bg-[#0B0F1A] py-2 text-sm font-semibold text-white hover:bg-[#2A3348]">{editingItem ? 'Save' : 'Create'}</button>
                    <button type="button" className="rounded-lg border border-[#374151] px-4 py-2 text-sm" onClick={() => setPanelMode(null)}>Cancel</button>
                  </div>
                </form>
              </>
            )}
          </aside>
        )}
      </div>
    </PageShell>
  )
}
