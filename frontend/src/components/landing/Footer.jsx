import logo from '../../logo.png'
import nayaeraLogo from '../../NAYAERA.png'

// Social media URLs - configure with the café's actual profile URLs or via environment variables
export const FACEBOOK_URL = import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/share/19Mnt5PxWf'
export const TIKTOK_URL = import.meta.env.VITE_TIKTOK_URL || 'https://www.tiktok.com/@chyaroma?_r=1&_t=ZS-99dcRAaga4S'

export default function Footer() {
  return (
    <footer className="bg-black text-gray-400 py-16 border-t border-white/10 relative overflow-hidden">
      {/* Decorative Gold Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Column 1: Cafe Branding */}
          <div className="space-y-6">
            <img src={logo} alt="Chyaroma Logo" className="h-16 w-auto object-contain" />
            <p className="text-[#D4AF37] font-semibold tracking-widest text-sm">GOOD FOOD. GREAT TIME.</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Experience the perfect blend of luxury, comfort, and exceptional flavors in every visit.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors group"
              >
                <span className="sr-only">Facebook</span>
                <svg fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors group"
              >
                <span className="sr-only">TikTok</span>
                <svg fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.04-4.52z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Our Branches */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-4 h-px bg-[#D4AF37]"></span> Our Branches
            </h4>
            <ul className="space-y-6 text-sm">
              <li className="flex items-start gap-3 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <strong className="block text-gray-300 font-medium mb-1">Chyaroma </strong>
                  <span className="text-gray-500">Kamalbinayak, Bhaktapur ( Mainbranch).</span>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <strong className="block text-gray-300 font-medium mb-1">Chyaroma </strong>
                  <span className="text-gray-500">Radhe Radhe, Bhaktapur</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Us */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-4 h-px bg-[#D4AF37]"></span> Contact Us
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +977 9803079967
              </li>
              <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                chyaromaandsekwaroma@gmail.com
              </li>
              <li className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                7:00 AM – 9:00 PM (Daily)
              </li>
            </ul>
          </div>

          {/* Column 4: Links / Optional */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-4 h-px bg-[#D4AF37]"></span> Legal
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom / Copyright */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Chyaroma icon" className="h-6 w-auto opacity-50 grayscale" />
            <span className="text-sm">© 2026 chyaroma. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-sm">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Made by</span>
            <div className="inline-flex items-center gap-2 group">
              <img
                src={nayaeraLogo}
                alt="NAYAERA"
                className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="text-gray-300 font-semibold tracking-wide group-hover:text-white transition-colors">
                NAYAERA TECHNOLOGIES
              </span>
            </div>
            <span className="text-white/20 hidden sm:inline">|</span>
            <a
              href="tel:9862134951"
              className="text-gray-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"
            >
              <span className="text-xs text-gray-500">Contact us:</span>
              <span className="text-gray-200 font-medium tracking-wide">9862134951</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
