import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import HowItWorks from '../components/landing/HowItWorks'
import Footer from '../components/landing/Footer'

export default function LandingPage({ navigate }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar navigate={navigate} />
      <HeroSection navigate={navigate} />
      <HowItWorks />
      <Footer />
    </div>
  )
}
