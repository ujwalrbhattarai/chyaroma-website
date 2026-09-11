import { useEffect, useState } from 'react'

export default function OrderTimer({ createdAt, canCancelUntil }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsedMs = now - new Date(createdAt).getTime()
  const elapsedMin = Math.floor(elapsedMs / 60000)
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000)

  const cancelDeadline = canCancelUntil ? new Date(canCancelUntil).getTime() : null
  const canStillCancel = cancelDeadline && now < cancelDeadline
  const secondsLeft = canStillCancel ? Math.ceil((cancelDeadline - now) / 1000) : 0

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
      <span>⏱ {elapsedMin}m {elapsedSec}s ago</span>
      {canStillCancel && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-[#F5A623]">
          Cancel window: {secondsLeft}s
        </span>
      )}
    </div>
  )
}
