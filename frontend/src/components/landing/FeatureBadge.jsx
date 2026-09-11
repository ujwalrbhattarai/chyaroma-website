export default function FeatureBadge({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/50 hover:border-gold/30 transition-all group">
      <div className="p-2 rounded-xl bg-gradient-to-br from-gold-500/20 to-transparent text-gold-500 shrink-0">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-white group-hover:text-gold-500 transition-colors text-sm">{title}</span>
        <span className="text-xs text-gray-300 leading-tight mt-0.5">{description}</span>
      </div>
    </div>
  )
}
