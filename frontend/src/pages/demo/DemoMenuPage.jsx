/**
 * DemoMenuPage.jsx
 *
 * Mirrors the real CustomerMenuPage but operates entirely within a demo session.
 * All orders go to /api/demo/orders — never to real branch kitchen queues.
 */
import { useEffect, useMemo, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import DemoBanner from '../../components/demo/DemoBanner'
import { createDemoSession, getDemoMenu, placeDemoOrder, getSessionId, clearSessionId } from '../../services/demoService'
import { imageUrl } from '../../services/menuService'

function exitDemo(navigate) {
  clearSessionId()
  navigate('/')
}

export default function DemoMenuPage({ navigate }) {
  const [sessionId, setSessionId] = useState(getSessionId)
  const [menuData, setMenuData]   = useState({ categories: [], menu: [], table: null })
  const [cart, setCart]           = useState({})
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    async function loadMenu() {
      setLoading(true)
      setError('')
      let currentSessionId = sessionId
      try {
        if (!currentSessionId) {
          const session = await createDemoSession()
          currentSessionId = session.sessionId
          localStorage.setItem('cc_demo_session_id', currentSessionId)
          setSessionId(currentSessionId)
        }
        const data = await getDemoMenu(currentSessionId)
        setMenuData(data)
      } catch (err) {
        setError(err.message || 'Failed to load demo menu.')
      } finally {
        setLoading(false)
      }
    }
    loadMenu()
  }, [sessionId])

  const categories = menuData.categories || []
  const menuItems  = menuData.menu || []

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

  const cartList       = Object.values(cart)
  const totalItemCount = cartList.reduce((sum, e) => sum + e.quantity, 0)
  const totalPrice     = cartList.reduce((sum, e) => sum + Number(e.item.price) * e.quantity, 0)

  async function handlePlaceDemoOrder() {
    if (cartList.length === 0 || !sessionId) return
    setSubmitting(true)
    setError('')
    try {
      await placeDemoOrder({
        sessionId,
        items: cartList.map((e) => ({ itemId: e.item.id, quantity: e.quantity, notes: '' })),
        notes,
      })
      setCart({})
      navigate(`/demo/order-status?sessionId=${encodeURIComponent(sessionId)}`)
    } catch (err) {
      setError(err.message || 'Failed to place demo order.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageShell area="customer" title="Demo Menu" description="" navigate={navigate}>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent shadow-lg shadow-amber-500/20" />
          <p className="mt-4 text-sm font-semibold tracking-wide text-[#9CA3AF]">Loading Demo Menu…</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell area="customer" title="" description="" navigate={navigate}>
      <div className="pb-28">
        {/* Top nav */}
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group neo-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-[#9CA3AF] transition-all hover:text-amber-400 active:scale-95"
          >
            <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Demo banner */}
        <DemoBanner onExit={() => exitDemo(navigate)} />

        {/* Demo table card */}
        <div className="neo-card mb-7 overflow-hidden rounded-3xl p-6 sm:p-7 border border-amber-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30 neo-inset">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Demo Table
              </span>
              <h1 className="mt-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Table DEMO-01
              </h1>
              <p className="mt-1 text-sm text-[#9CA3AF]">Virtual demonstration table</p>
            </div>
            <div className="rounded-2xl neo-inset px-4 py-2.5 text-center border border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Demo Mode</p>
              <p className="text-xs font-bold text-white">No real order placed</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400 shadow-md" role="alert">
            ⚠️ {error}
            {!sessionId && (
              <button onClick={() => navigate('/demo')} className="ml-2 underline text-amber-400 hover:text-amber-300">
                Start new demo
              </button>
            )}
          </div>
        )}

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="mb-7 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-2xl px-5 py-2.5 text-xs font-extrabold tracking-wide whitespace-nowrap transition-all duration-300 ${selectedCategory === 'all' ? 'neo-btn-primary shadow-lg scale-[1.02]' : 'neo-btn-secondary text-[#9CA3AF] hover:text-white'}`}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-2xl px-5 py-2.5 text-xs font-extrabold tracking-wide whitespace-nowrap transition-all duration-300 ${selectedCategory === cat.id ? 'neo-btn-primary shadow-lg scale-[1.02]' : 'neo-btn-secondary text-[#9CA3AF] hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu items grid */}
        {filteredItems.length === 0 ? (
          <div className="neo-card rounded-3xl border border-dashed border-white/10 p-14 text-center">
            <p className="text-base font-bold text-[#9CA3AF]">No items in this category.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const qty = cart[item.id]?.quantity || 0
              return (
                <article
                  key={item.id}
                  className={`neo-card flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${qty > 0 ? 'border-amber-500/50 shadow-[0_0_25px_rgba(245,166,35,0.15)] scale-[1.01]' : 'border-white/10 hover:border-amber-500/30 hover:scale-[1.01]'}`}
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
                            {qty} in cart
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-extrabold text-white text-lg tracking-tight">{item.name}</h3>
                        <span className="font-black text-[#F5A623] text-base whitespace-nowrap">Rs {item.price}</span>
                      </div>
                      {item.description && <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed line-clamp-2">{item.description}</p>}
                      {item.prepTimeMinutes && (
                        <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-[#F5A623] border border-amber-500/20 neo-inset">
                          ⏱ ~{item.prepTimeMinutes} mins prep
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-5 pb-5 flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs font-semibold text-[#6B7280]">{qty > 0 ? `${qty} added` : 'Select quantity'}</span>
                    {qty === 0 ? (
                      <button type="button" onClick={() => updateQuantity(item, 1)} className="neo-btn-primary rounded-xl px-4 py-2 text-xs font-extrabold">+ Add</button>
                    ) : (
                      <div className="flex items-center gap-2 neo-inset rounded-xl p-1 border border-amber-500/30">
                        <button type="button" onClick={() => updateQuantity(item, -1)} className="neo-btn-secondary flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-[#9CA3AF] hover:text-white">-</button>
                        <span className="w-6 text-center text-xs font-extrabold text-white">{qty}</span>
                        <button type="button" onClick={() => updateQuantity(item, 1)} className="neo-btn-primary flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black">+</button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Kitchen notes */}
        {totalItemCount > 0 && (
          <div className="neo-card mt-7 rounded-3xl p-5 border border-white/10">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">
              Special instructions (Optional)
            </label>
            <textarea
              className="neo-input w-full rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-[#6B7280]"
              rows="2"
              placeholder="e.g. Extra hot, less sugar…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Floating bottom bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl animate-neo-appear">
          <div className="neo-card flex items-center justify-between gap-4 rounded-3xl p-4 sm:p-5 border border-amber-500/30 backdrop-blur-xl shadow-2xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} · Demo Order
              </p>
              <p className="text-xl sm:text-2xl font-black text-[#F5A623]">Rs {totalPrice}</p>
            </div>
            <button
              onClick={handlePlaceDemoOrder}
              disabled={submitting}
              className="neo-btn-primary flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-extrabold transition-all disabled:opacity-50"
            >
              {submitting ? 'Placing Demo Order…' : 'Place Demo Order →'}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
