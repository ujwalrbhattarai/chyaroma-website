import logo from '../../logo.png'

export default function Navbar({ navigate }) {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Chyaroma Logo" className="h-12 w-auto object-contain" />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-gold-500/50 hover:bg-gold-500/10 text-white transition-all backdrop-blur-sm group cursor-pointer hover:scale-105"
          style={{ borderColor: '#D4AF37' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-semibold text-sm tracking-wide text-white">Staff Login</span>
          </div>
        </button>
      </div>
    </nav>
  )
}
