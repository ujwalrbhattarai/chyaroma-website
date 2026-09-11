/**
 * DemoBanner.jsx
 * Reusable top banner shown on all demo pages.
 */
export default function DemoBanner({ onExit }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-5 py-3 shadow-lg">
      {/* Animated shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              Demo Mode
            </p>
            <p className="text-[11px] text-gray-400 leading-tight">
              No real order or payment will be made
            </p>
          </div>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            className="neo-btn-secondary rounded-xl px-4 py-2 text-[11px] font-bold text-gray-400 hover:text-red-400 transition-all"
          >
            ✕ Exit Demo
          </button>
        )}
      </div>
    </div>
  )
}
