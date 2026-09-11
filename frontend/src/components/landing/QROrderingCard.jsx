export default function QROrderingCard({ navigate }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center transform transition duration-500 hover:scale-[1.02] hover:shadow-[#D4AF37]/20 group">

      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-[#D4AF37] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
        <div className="bg-white p-4 rounded-2xl shadow-inner relative z-10 border-4 border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-colors">
          {/* Mock QR Code Image */}
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
            {/* QR Pattern Placeholder */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-black opacity-90">
              <rect x="10" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="15" y="15" width="15" height="15" fill="currentColor" />
              <rect x="65" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="70" y="15" width="15" height="15" fill="currentColor" />
              <rect x="10" y="65" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="15" y="70" width="15" height="15" fill="currentColor" />
              <rect x="40" y="40" width="20" height="20" fill="currentColor" className="text-[#D4AF37]" />
              <rect x="65" y="65" width="25" height="25" fill="currentColor" opacity="0.8" />
            </svg>

            {/* Scanning Line Animation */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Ready to Order?</h3>
      <p className="text-gray-300 mb-8 text-sm">Find the QR code on your table to access our menu instantly.</p>

      <button
        onClick={() => navigate('/demo')}
        className="w-full py-4 rounded-xl font-bold text-black text-lg flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group/btn cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-[#D4AF37]/20"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)' }}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
        <span className="relative z-10">Try Demo Menu</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative z-10 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>


    </div>
  )
}
