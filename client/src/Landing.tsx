import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Stats from './components/Stats'
import Waitlist from './components/Waitlist'
import Footer from './components/Footer'

export default function Landing() {
  return (
    <div
      id="top"
      className="antialiased min-h-screen flex flex-col selection:bg-[#EB4A26]/20 overflow-x-hidden text-zinc-900 font-sans bg-[#F3F4EF] relative"
    >
      {/* Background Effects — box-grid texture + radial brand glow */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-[#EB4A26]/10 blur-[120px] rounded-full"></div>
      </div>

      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Waitlist />
      <Footer />
    </div>
  )
}
