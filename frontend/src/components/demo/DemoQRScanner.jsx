/**
 * DemoQRScanner.jsx
 *
 * Wraps html5-qrcode (already installed). The camera opens AUTOMATICALLY as soon as
 * the scanner mounts (the click that opened it is the user gesture that satisfies the
 * browser permission requirement). For devices/browsers without camera support (or when
 * permission is denied) it falls back to a manual "paste the QR link/token" field and a
 * "Continue with Demo Table" shortcut so no one is stuck.
 */
import { useEffect, useRef, useState } from 'react'

export default function DemoQRScanner({ onScanSuccess, onClose, onUseDemoTable }) {
  const [phase, setPhase]     = useState('idle')   // idle | requesting | scanning | error | unsupported
  const [errorMsg, setErrorMsg] = useState('')
  const [manualToken, setManualToken] = useState('')
  const scannerRef = useRef(null)
  const startedRef = useRef(false)
  const divId = 'demo-qr-reader'

  const cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  async function startScanner() {
    if (!cameraSupported) {
      setPhase('unsupported')
      setErrorMsg('This device/browser does not support camera scanning. Enter the QR link or token manually below.')
      return
    }
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
        setErrorMsg('Camera access was denied. Scan manually or continue with the Demo Table.')
      } else {
        setErrorMsg("We couldn't open the camera on this device. Scan manually or continue with the Demo Table.")
      }
    }
  }

  // Auto-open the camera as soon as the scanner opens. Guard against React StrictMode
  // double-invoking the effect in development.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const timer = setTimeout(startScanner, 60)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function handleManualScan() {
    const text = manualToken.trim()
    if (!text) {
      setErrorMsg('Paste the QR link or token above, then tap Use this code.')
      return
    }
    stopScanner()
    onScanSuccess?.(text)
  }

  function handleDemoTable() {
    stopScanner()
    onUseDemoTable?.()
  }

  // Only ever show the fallback when the camera path is unavailable / failed.
  const showManual = phase === 'error' || phase === 'unsupported'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="neo-card relative w-full max-w-sm rounded-3xl border border-amber-500/30 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Scan QR Code</h2>
            <p className="text-xs text-gray-400">
              {cameraSupported ? 'Camera opens automatically' : 'Scan a Chyaroma table QR code'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="neo-btn-secondary flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* html5-qrcode renders into this div. It is ALWAYS mounted so the scanner can attach
            even before React paints the 'scanning' state; it is only hidden in the fallback. */}
        <div
          id={divId}
          className="overflow-hidden rounded-2xl"
          style={{ width: '100%', minHeight: 260, display: showManual ? 'none' : 'block' }}
        />

        {phase === 'requesting' && (
          <p className="mt-3 text-center text-xs text-gray-400">Opening camera…</p>
        )}

        {phase === 'scanning' && (
          <div className="mt-3 space-y-3">
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

        {showManual && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-3xl">
              🔑
            </div>
            {errorMsg && <p className="text-center text-sm font-semibold text-red-400">{errorMsg}</p>}

            {/* Manual fallback: paste the QR link/token */}
            <div className="w-full">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Or paste the QR link / token
              </label>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="e.g. https://…/?token=abc123"
                className="w-full rounded-2xl border border-[#374151] bg-[#0B0F1A] px-3 py-2.5 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handleManualScan}
              className="neo-btn-primary w-full rounded-2xl py-3 text-sm font-extrabold"
            >
              Use this code
            </button>
            <button
              onClick={handleDemoTable}
              className="neo-btn-secondary w-full rounded-2xl py-2.5 text-sm font-bold text-gray-400 hover:text-white"
            >
              🪑 Continue with Demo Table instead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
