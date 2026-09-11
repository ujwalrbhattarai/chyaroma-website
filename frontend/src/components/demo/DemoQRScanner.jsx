/**
 * DemoQRScanner.jsx
 *
 * Wraps html5-qrcode (already installed).
 * Camera is ONLY activated after the user explicitly clicks "Start Scanning".
 * Cleans up camera stream on unmount / close.
 */
import { useEffect, useRef, useState } from 'react'

export default function DemoQRScanner({ onScanSuccess, onClose }) {
  const [phase, setPhase]     = useState('idle')   // idle | requesting | scanning | error
  const [errorMsg, setErrorMsg] = useState('')
  const scannerRef = useRef(null)
  const divId = 'demo-qr-reader'

  async function startScanner() {
    setPhase('requesting')
    setErrorMsg('')
    try {
      // Dynamically import to avoid SSR issues and only load when needed
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(divId)
      scannerRef.current = scanner
      setPhase('scanning')
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanner()
          onScanSuccess?.(decodedText)
        },
        () => { /* ignore per-frame errors */ },
      )
    } catch (err) {
      setPhase('error')
      if (err?.message?.toLowerCase().includes('permission')) {
        setErrorMsg('Camera access was denied. You can continue with the Demo Table instead.')
      } else {
        setErrorMsg("We couldn't access the camera. You can continue with the Demo Table instead.")
      }
    }
  }

  function stopScanner() {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    } catch {}
    scannerRef.current = null
  }

  // Ensure camera is released when component unmounts
  useEffect(() => () => stopScanner(), [])

  function handleClose() {
    stopScanner()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="neo-card relative w-full max-w-sm rounded-3xl border border-amber-500/30 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Scan QR Code</h2>
            <p className="text-xs text-gray-400">Scan a Chyaroma table QR code</p>
          </div>
          <button
            onClick={handleClose}
            className="neo-btn-secondary flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Camera area */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-4xl">
              📷
            </div>
            <p className="text-center text-sm text-gray-300 leading-relaxed max-w-xs">
              This will activate your camera to scan a Chyaroma QR code.
            </p>
            <button
              onClick={startScanner}
              className="neo-btn-primary w-full rounded-2xl py-3 text-sm font-extrabold"
            >
              Allow Camera & Start Scanning
            </button>
          </div>
        )}

        {phase === 'requesting' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <p className="text-sm text-gray-400">Requesting camera permission…</p>
          </div>
        )}

        {phase === 'scanning' && (
          <div className="space-y-3">
            {/* html5-qrcode renders into this div */}
            <div
              id={divId}
              className="overflow-hidden rounded-2xl"
              style={{ width: '100%', minHeight: 260 }}
            />
            <p className="text-center text-xs text-gray-400">
              Point your camera at a Chyaroma table QR code
            </p>
            <button
              onClick={handleClose}
              className="neo-btn-secondary w-full rounded-2xl py-2.5 text-xs font-bold text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-3xl">
              📷
            </div>
            <p className="text-center text-sm font-semibold text-red-400">{errorMsg}</p>
            <button
              onClick={handleClose}
              className="neo-btn-secondary w-full rounded-2xl py-2.5 text-sm font-bold"
            >
              Continue with Demo Table
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
