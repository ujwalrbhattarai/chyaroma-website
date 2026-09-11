import QROrderingCard from './QROrderingCard'
import FeatureBadge from './FeatureBadge'
import heroBg from '../../assets/hero-bg.jpg'

export default function HeroSection({ navigate }) {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden bg-black">
      {/* Background Image & Overlays */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBg} 
          alt="Cafe Central Interior" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side Content */}
        <div className="lg:col-span-7 flex flex-col space-y-8 max-w-2xl text-left">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-light text-white leading-tight">
              <span className="block opacity-90 text-2xl md:text-4xl mb-2">Welcome to</span>
              <span className="font-bold text-[#D4AF37] tracking-wider drop-shadow-lg">Chyaroma</span>
            </h1>
            
            <div className="w-24 h-1 bg-gradient-to-r from-[#D4AF37] to-transparent rounded-full"></div>
            
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-xl font-light drop-shadow-md">
              Scan the QR code on your table to browse our menu, place your order, and enjoy a seamless dining experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <FeatureBadge 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
              title="No Waiters"
              description="Ordering is completely digital."
            />
            <FeatureBadge 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Quick Service"
              description="Orders go directly to the kitchen."
            />
            <FeatureBadge 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Digital Billing"
              description="Request and receive your bill digitally."
            />
          </div>
        </div>

        {/* Right Side QR Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <QROrderingCard navigate={navigate} />
        </div>

      </div>
    </section>
  )
}
