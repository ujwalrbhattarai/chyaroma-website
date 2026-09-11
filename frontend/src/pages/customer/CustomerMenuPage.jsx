import { useEffect, useMemo, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { getPublicMenu, placeOrder } from '../../services/orderService'
import { releaseTable } from '../../services/tableService'
import { imageUrl } from '../../services/menuService'

function getTokenFromLocation() {
  const param = new URLSearchParams(window.location.search).get('token')
  if (param) {
    sessionStorage.setItem('cc_table_token', param)
    return param
  }
  return sessionStorage.getItem('cc_table_token') ?? ''
}

export default function CustomerMenuPage({ navigate }) {
  const [token, setToken] = useState(getTokenFromLocation())
  const [menuData, setMenuData] = useState({ categories: [], menu: [], table: null })
  const [cart, setCart] = useState({}) // { [itemId]: { item, quantity } }
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [manualTokenInput, setManualTokenInput] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [releaseMessage, setReleaseMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setManualTokenInput(true)
      return
    }
    setLoading(true)
    setError('')
    getPublicMenu(token)
      .then((res) => {
        setMenuData(res)
        setManualTokenInput(false)
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired QR token.')
        setManualTokenInput(true)
      })
      .finally(() => setLoading(false))
  }, [token])

  const categories = menuData.categories || []
  const menuItems = menuData.menu || []
  const table = menuData.table

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return menuItems
    return menuItems.filter((i) => i.categoryId === selectedCategory)
  }, [menuItems, selectedCategory])

  const updateQuantity = (item, delta) => {
    setCart((prev) => {
      const current = prev[item.id]?.quantity || 0
      const next = current + delta
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[item.id]
        return copy
      }
      return { ...prev, [item.id]: { item, quantity: next } }
    })
  }

  const cartList = Object.values(cart)
  const totalItemCount = cartList.reduce((sum, entry) => sum + entry.quantity, 0)
  const totalPrice = cartList.reduce((sum, entry) => sum + Number(entry.item.price) * entry.quantity, 0)

  async function handlePlaceOrder() {
    if (cartList.length === 0 || !token) return
    setSubmitting(true)
    setError('')
    try {
      const itemsPayload = cartList.map((entry) => ({
        itemId: entry.item.id,
        quantity: entry.quantity,
        notes: '',
      }))
      await placeOrder({ token, items: itemsPayload, notes })
      setCart({})
      navigate(`/table/order-status?token=${encodeURIComponent(token)}`)
    } catch (err) {
      setError(err.message || 'Failed to place order.')
      setSubmitting(false)
    }
  }

  async function handleRelease() {
    if (!token) return
    setReleasing(true)
    setError('')
    setReleaseMessage('')
    try {
      await releaseTable(token)
      sessionStorage.removeItem('cc_table_token')
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to release table.')
      setReleasing(false)
    }
  }

  if (loading) {
    return (
      <PageShell area="customer" title="Loading Menu..." description="" navigate={navigate}>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent shadow-lg shadow-amber-500/20"></div>
          <p className="mt-4 text-sm font-semibold tracking-wide text-[#9CA3AF]">Opening Chyaroma table menu…</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell area="customer" title="" description="" navigate={navigate}>
      <div className="pb-28">
        {/* Navigation Bar / Back to Home Page Header Button */}
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group neo-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-[#9CA3AF] transition-all hover:text-amber-400 active:scale-95"
          >
            <svg
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home Page</span>
          </button>
        </div>

        {/* Table Banner */}
        {table ? (
          <div className="neo-card mb-7 overflow-hidden rounded-3xl p-6 sm:p-7 border border-amber-500/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30 neo-inset">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                  Active Table
                </span>
                <h1 className="mt-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Table #{table.tableNumber}
                </h1>
                {table.label && <p className="mt-1 text-sm text-[#9CA3AF]">{table.label}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl neo-inset px-4 py-2.5 text-center border border-white/5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Scan Verified</p>
                  <p className="text-xs font-bold text-white">Order directly</p>
                </div>
                <button
                  onClick={handleRelease}
                  disabled={releasing}
                  className="neo-btn-secondary rounded-2xl px-4 py-2.5 text-xs font-extrabold text-[#9CA3AF] transition-all hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {releasing ? 'Releasing…' : 'Release Table'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          manualTokenInput && (
            <div className="neo-card mb-7 rounded-3xl p-5 border border-amber-500/20">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">
                Enter Table Token manually
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="neo-input flex-1 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#6B7280]"
                  placeholder="Paste table QR token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button
                  className="neo-btn-primary rounded-2xl px-5 py-2.5 text-xs font-extrabold"
                  onClick={() => setToken(token)}
                >
                  Load
                </button>
              </div>
            </div>
          )
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400 shadow-md" role="alert">
            ⚠️ {error}
          </div>
        )}
        {releaseMessage && !error && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400 shadow-md" role="status">
            ✓ {releaseMessage}
          </div>
        )}

        {/* Category Neumorphic Pills */}
        {categories.length > 0 && (
          <div className="mb-7 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-2xl px-5 py-2.5 text-xs font-extrabold tracking-wide whitespace-nowrap transition-all duration-300 ${
                selectedCategory === 'all'
                  ? 'neo-btn-primary shadow-lg scale-[1.02]'
                  : 'neo-btn-secondary text-[#9CA3AF] hover:text-white'
              }`}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-2xl px-5 py-2.5 text-xs font-extrabold tracking-wide whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'neo-btn-primary shadow-lg scale-[1.02]'
                    : 'neo-btn-secondary text-[#9CA3AF] hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu Items Neumorphism Grid */}
        {filteredItems.length === 0 ? (
          <div className="neo-card rounded-3xl border border-dashed border-white/10 p-14 text-center">
            <p className="text-base font-bold text-[#9CA3AF]">No items available in this category right now.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const qty = cart[item.id]?.quantity || 0
              return (
                <article
                  key={item.id}
                  className={`neo-card flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
                    qty > 0
                      ? 'border-amber-500/50 shadow-[0_0_25px_rgba(245,166,35,0.15)] scale-[1.01]'
                      : 'border-white/10 hover:border-amber-500/30 hover:scale-[1.01]'
                  }`}
                >
                  <div>
                    {item.imageUrl && (
                      <div className="h-48 w-full overflow-hidden bg-[#0D121E] relative">
                        <img
                          src={imageUrl(item.imageUrl)}
                          alt={item.name}
                          className="h-full w-full object-cover transition transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#131926] via-transparent to-transparent opacity-80" />
                        {qty > 0 && (
                          <span className="absolute top-3 right-3 neo-gold-active rounded-full px-3 py-1 text-xs font-extrabold shadow-lg">
                            {qty} In Cart
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-extrabold text-white text-lg tracking-tight">{item.name}</h3>
                        <span className="font-black text-[#F5A623] text-base whitespace-nowrap drop-shadow-[0_0_6px_rgba(245,166,35,0.3)]">
                          Rs {item.price}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed line-clamp-2">{item.description}</p>
                      )}
                      {item.prepTimeMinutes && (
                        <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-[#F5A623] border border-amber-500/20 neo-inset">
                          ⏱ ~{item.prepTimeMinutes} mins prep
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs font-semibold text-[#6B7280]">
                      {qty > 0 ? `${qty} added` : 'Select quantity'}
                    </span>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, 1)}
                        className="neo-btn-primary rounded-xl px-4 py-2 text-xs font-extrabold transition-all"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 neo-inset rounded-xl p-1 border border-amber-500/30">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item, -1)}
                          className="neo-btn-secondary flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-[#9CA3AF] transition-all hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-white">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item, 1)}
                          className="neo-btn-primary flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black transition-all"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Kitchen Special Instructions Neumorphic Card */}
        {totalItemCount > 0 && (
          <div className="neo-card mt-7 rounded-3xl p-5 border border-white/10">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">
              Special instructions for kitchen (Optional)
            </label>
            <textarea
              className="neo-input w-full rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-[#6B7280]"
              rows="2"
              placeholder="e.g. Extra hot, less sugar, serve beverage first..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Neumorphic Floating Bottom Order Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl animate-neo-appear">
          <div className="neo-card flex items-center justify-between gap-4 rounded-3xl p-4 sm:p-5 border border-amber-500/30 backdrop-blur-xl shadow-2xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} in order
              </p>
              <p className="text-xl sm:text-2xl font-black text-[#F5A623] drop-shadow-[0_0_8px_rgba(245,166,35,0.4)]">
                Rs {totalPrice}
              </p>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="neo-btn-primary flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-extrabold transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Sending to Kitchen…' : 'Place Order →'}</span>
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}

