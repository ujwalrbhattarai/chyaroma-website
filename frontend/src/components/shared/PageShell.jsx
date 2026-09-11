import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function PageShell({ area, title, description, navigate, setSession, children }) {
  if (area === 'customer') {
    return (
      <div className="min-h-screen bg-[#0B0F1A]">
        <TopNav navigate={navigate} />
        <main className="mx-auto max-w-5xl px-5 py-10 animate-neo-appear">
          <PageContent title={title} description={description}>{children}</PageContent>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-[#F9FAFB] md:flex selection:bg-[#D4AF37]/30 selection:text-[#F5A623]">
      <Sidebar area={area} navigate={navigate} setSession={setSession} />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full animate-neo-appear">
        <PageContent title={title} description={description}>{children}</PageContent>
      </main>
    </div>
  )
}

function PageContent({ title, description, children }) {
  return (
    <>
      <header className="mb-8 border-b border-[#1F2937]/60 pb-5">
        <h1 className="text-3xl font-extrabold text-[#F9FAFB] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#F9FAFB] to-[#9CA3AF]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-3xl text-sm md:text-base text-[#9CA3AF] leading-relaxed">{description}</p>}
      </header>
      <div>{children ?? 'This page is under construction.'}</div>
    </>
  )
}

