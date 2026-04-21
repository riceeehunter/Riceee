import Link from "next/link";
import Header from "@/components/header";
import { plusJakarta, manrope } from "@/lib/fonts";
import QuoteSection from "@/components/quote-section";

export default function LandingPage() {
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');`}</style>
      <style>{`
        .paper-grain {
          background-image: url(https://lh3.googleusercontent.com/aida/ADBb0ugl7r1oOHE4zCR_sKi8RK7Mtdx3ISHK1IZ0MBtT-kJGasZy58BqnL1thgxavaUGY-Qae83LCT7T8K6xu2K2LHofpluC3UyJmRAWpbllLI4KDowKGokcsm5-8mKkzug7L5oOJ3Mu2pZpii4vbrR3533r8g2ISHhzRoNUtduDkDyQ1WppEShT3X4ezOA9kZXltWFh5zCfl6ZOVbRGDF1toBY5l65ZuHp7_55gQriYMJumYHHHZ33pnHUsl5SbLLmlLBmYpp2IHJqe);
          background-size: 600px;
          opacity: 0.25;
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        .hero-gradient {
          background: radial-gradient(circle at top right, rgba(255, 174, 136, 0.15), transparent 60%), radial-gradient(circle at bottom left, rgba(255, 217, 226, 0.2), transparent 60%);
        }
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
      `}</style>

      <div className={`${manrope.className} bg-[#fffbff] text-[#393832] relative selection:bg-[#ffae88] selection:text-[#6a2700]`}>
        <div className="fixed inset-0 paper-grain z-[60] pointer-events-none" />
        <Header />

        <main className="pt-28 pb-16 space-y-16">
          {/* Hero */}
          <section className="page-shell">
            <div className="relative bg-white/40 border border-white/60 rounded-[3rem] p-10 md:p-20 overflow-hidden shadow-sm">
              <div className="absolute inset-0 hero-gradient -z-10" />
              <div className="flex flex-col md:flex-row items-center justify-between gap-16">
                <div className="flex-1 space-y-8">
                  <div className="inline-block px-4 py-1.5 bg-[#ffd9e2]/60 text-[#863655] rounded-full text-xs font-bold tracking-widest uppercase">
                    Our Sanctuary
                  </div>
                  <h1 className={`${plusJakarta.className} text-7xl md:text-[9.5rem] font-extrabold text-[#393832] tracking-tighter leading-[0.8]`}>
                    Aditya <br />
                    <span className="text-[#ab4400] italic font-light">x</span>{" "}
                    <span className="text-[#9d4867]">Tanya</span>
                  </h1>
                  <p className="text-xl text-[#66645e] max-w-lg leading-relaxed font-medium">
                    A digital keepsake for your shared laughter, quiet moments, and the beautiful journey of &ldquo;us&rdquo;.
                  </p>
                  <div className="flex gap-6 pt-4">
                    <Link
                      href="/journal/write"
                      className="bg-[#ab4400] text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-[#ab4400]/20 hover:shadow-[#ab4400]/30 transition-all flex items-center gap-3 text-base"
                    >
                      <span className="material-symbols-outlined">edit_note</span>
                      Start Today&apos;s Story
                    </Link>
                  </div>
                </div>
                <div className="flex-1 w-full max-w-xl">
                  <div className="relative bg-white p-4 rounded-xl shadow-2xl rotate-2 aspect-[4/5] w-full border border-stone-100/50">
                    <img
                      alt="Couple walking"
                      className="w-full h-full object-cover rounded-md"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuChlCZEZt8c-dlbV2ngR3ie3Xbz38C7mA7gN8NWzG2OcFAtgVgXyeFm1_p5rP5nq25UVelWNEwTTu634U_7p8en56dxkim7t4ImP-Di_F6yV9Geun_4Mom48OnNHyBDtd-GFdpyS3IWVE05EBpSk-WKV0oM2T6yS-nvY2SpMFvnafgRDcp4eJq_my13jNOWFPqNcuhGLLV0zXLfW64JK3KZ9UzCZbfegQ_7CKUaWtPlNni7zpmPzHsYVIuXlp9C0A0Y_KrFj_IgoaI"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Animated quotes — client component */}
          <QuoteSection plusJakartaClassName={plusJakarta.className} />

          {/* Features */}
          <section className="page-shell space-y-10">
            <div className="flex flex-col items-center text-center space-y-3">
              <h3 className={`${plusJakarta.className} text-xs font-extrabold tracking-[0.4em] uppercase text-[#9d4867]/60`}>
                The Scrapbook Experience
              </h3>
              <h2 className={`${plusJakarta.className} text-4xl font-extrabold tracking-tight`}>
                Your Digital Keepsake
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              <div className="md:col-span-6 bg-[#ffae88]/10 p-12 rounded-[2rem] flex flex-col items-center text-center justify-center min-h-[320px] hover:bg-[#ffae88]/20 transition-all group border border-[#ab4400]/5">
                <div className="w-16 h-16 bg-[#ab4400] rounded-full flex items-center justify-center text-white group-hover:scale-105 transition-transform mb-6 shadow-lg shadow-[#ab4400]/20">
                  <span className="material-symbols-outlined text-3xl">stylus_note</span>
                </div>
                <div className="space-y-3">
                  <h4 className={`${plusJakarta.className} text-2xl font-bold text-[#6a2700]`}>Express Yourself</h4>
                  <p className="text-[#6a2700]/70 text-base leading-relaxed max-w-md">
                    A distraction-free journaling space for your deepest thoughts and shared stories.
                  </p>
                </div>
              </div>

              <div className="md:col-span-3 bg-[#ebe8df]/40 p-10 rounded-[2rem] flex flex-col items-center text-center justify-center min-h-[320px] hover:shadow-lg hover:shadow-stone-200/50 transition-all border border-stone-200/40">
                <div className="w-14 h-14 bg-[#393832] text-[#fffbff] rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                </div>
                <div className="space-y-2">
                  <h4 className={`${plusJakarta.className} text-xl font-bold`}>Inspiration</h4>
                  <p className="text-[#66645e] text-sm leading-relaxed">
                    Curated quotes and thoughtful prompts to spark deep connection.
                  </p>
                </div>
              </div>

              <div className="md:col-span-3 bg-[#ffd9e2]/15 p-10 rounded-[2rem] flex flex-col items-center text-center justify-center min-h-[320px] hover:bg-[#ffd9e2]/25 transition-all border border-[#9d4867]/5">
                <div className="w-14 h-14 bg-[#9d4867] text-white rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">verified_user</span>
                </div>
                <div className="space-y-2">
                  <h4 className={`${plusJakarta.className} text-xl font-bold text-[#863655]`}>Safe Space</h4>
                  <p className="text-[#863655]/70 text-sm leading-relaxed">
                    End-to-end encryption for your private memories. Your secrets are safe.
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 bg-[#fdf9f4] p-12 rounded-[2rem] flex flex-col md:flex-row gap-10 items-center border border-[#bcb9b1]/10 shadow-sm">
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="w-14 h-14 bg-[#815f19] text-white rounded-full flex items-center justify-center mx-auto md:mx-0">
                    <span className="material-symbols-outlined text-3xl">sports_esports</span>
                  </div>
                  <div>
                    <h4 className={`${plusJakarta.className} text-2xl font-bold`}>Couple Games</h4>
                    <p className="text-[#66645e] text-base leading-relaxed">
                      Bond through play with interactive challenges designed for two.
                    </p>
                  </div>
                </div>
                <div className="flex-1 bg-white/60 rounded-2xl p-6 border border-stone-200/30 flex flex-wrap gap-3 justify-center">
                  <span className="bg-[#ffd9e2] text-[#863655] px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">Quiz Time</span>
                  <span className="bg-[#ffae88] text-[#6a2700] px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">Photo Hunt</span>
                  <span className="bg-[#fed07f] text-[#634500] px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">Dream Map</span>
                </div>
              </div>

              <div className="md:col-span-5 relative overflow-hidden rounded-[2rem] group min-h-[320px] shadow-sm">
                <img
                  alt="Candlelit dinner"
                  className="w-full h-full absolute inset-0 object-cover group-hover:scale-105 transition-transform duration-1000"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD92GzImuNYIDCJs4Sn45hbSmjPSATPIctSE50sI5hwpL-xiqj3XCkOofg4JIaxTBWf4Z9pilrk7BHFiXImGtJ0-PNp6wdXsvcX3b1wJEF6NRX6n_f1q2Tk38XJvzft_qcGp1oOn4n6il6vCRmiQfcyF3e1R4QJT8tX_S5dLmcP0ALm7xkA_xJ_qz8TDWHGkhjFoxEUHvjQdiGp7nOVlYqJeZOzc3a8W1d59OvecJiex_QtBg87isz-qZ2FxbvPUga2MDWXU3RE1qs"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#393832]/90 via-[#393832]/30 to-transparent flex items-end p-12">
                  <p className={`${plusJakarta.className} text-[#fffbff] font-bold text-2xl italic leading-tight`}>
                    &ldquo;Capturing the magic in the mundane.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="w-full py-10 px-10 mt-10 bg-stone-50/70 backdrop-blur-sm border-t border-stone-200/40 text-[12px] font-medium uppercase tracking-wider text-stone-400">
          <div className="page-shell flex flex-col md:flex-row justify-between items-center gap-10">
            <div className={`${plusJakarta.className} font-bold text-stone-700 tracking-tighter normal-case text-lg`}>
              Coupling
            </div>
            <div className="flex gap-10 items-center">
              <Link className="hover:text-[#ab4400] transition-all" href="/settings">Privacy Policy</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/settings">Terms of Use</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/settings">Support</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/dashboard">Our Mission</Link>
            </div>
            <div className="normal-case text-stone-500">© 2026 Coupling. Handcrafted with love.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
