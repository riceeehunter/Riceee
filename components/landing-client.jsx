"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import QuoteSection from "@/components/quote-section";
import { plusJakarta, manrope } from "@/lib/fonts";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const MARQUEE_ITEMS = [
  "Shared Journal",
  "Photo Memories",
  "10 Couple Games",
  "Riceee AI",
  "The Courtroom",
  "Mood Analytics",
  "Sweet Notes",
  "Private Space",
];

const GAME_CHIPS = [
  { name: "Word Duel", emoji: "🔤" },
  { name: "Tic Tac Toe", emoji: "⭕" },
  { name: "Quick Draw", emoji: "🎨" },
  { name: "Truth or Dare", emoji: "🎭" },
  { name: "Snakes & Ladders", emoji: "🐍" },
  { name: "Speed Stacker", emoji: "🧱" },
  { name: "Story Dice", emoji: "🎲" },
  { name: "This or That", emoji: "⚖️" },
  { name: "Treasure Hunt", emoji: "🗺️" },
  { name: "Daily Dare", emoji: "🔥" },
];

const STEPS = [
  {
    icon: "favorite",
    title: "Create your space",
    text: "Sign up and your private little corner of the internet is ready in seconds.",
  },
  {
    icon: "mail",
    title: "Invite your person",
    text: "Send one magic link. They join your space — same journal, same memories, same games.",
  },
  {
    icon: "auto_stories",
    title: "Start your story",
    text: "Write together, play together, and watch your shared scrapbook grow every day.",
  },
];

export default function LandingClient({ isLoggedIn, partnerNames }) {
  const ctaHref = isLoggedIn ? "/journal/write" : "/sign-in";

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
          background:
            radial-gradient(circle at top right, rgba(255, 174, 136, 0.18), transparent 60%),
            radial-gradient(circle at bottom left, rgba(255, 217, 226, 0.22), transparent 60%);
        }
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marqueeScroll 32s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0) rotate(var(--tilt, 0deg)); }
          50% { transform: translateY(-10px) rotate(var(--tilt, 0deg)); }
        }
        .hero-float { animation: heroFloat 7s ease-in-out infinite; }
        @keyframes blobDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -16px) scale(1.06); }
        }
        .blob-drift { animation: blobDrift 9s ease-in-out infinite; }
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.18); }
          28% { transform: scale(1); }
          42% { transform: scale(1.18); }
          70% { transform: scale(1); }
        }
        .heart-beat { animation: heartBeat 2.4s ease-in-out infinite; }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .typing-dot { animation: typingDot 1.2s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      <div className={`${manrope.className} bg-[#fffbff] text-[#393832] relative selection:bg-[#ffae88] selection:text-[#6a2700]`}>
        <div className="fixed inset-0 paper-grain z-[60] pointer-events-none" />

        <main className="pt-28 pb-16 space-y-16 md:space-y-24 overflow-hidden">
          {/* ============ HERO ============ */}
          <section className="page-shell">
            <div className="relative bg-white/40 border border-white/60 rounded-[3rem] p-8 md:p-16 lg:p-20 overflow-hidden shadow-sm">
              <div className="absolute inset-0 hero-gradient -z-0" />
              <div className="blob-drift absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-[#ffae88]/25 to-[#ffd9e2]/20 blur-3xl pointer-events-none" />
              <div className="blob-drift absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-[#ffd9e2]/25 to-[#fed07f]/15 blur-3xl pointer-events-none" style={{ animationDelay: "3s" }} />

              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="relative flex flex-col md:flex-row items-center justify-between gap-14"
              >
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-8">
                  <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ffd9e2]/80 text-[#863655] rounded-full text-[10px] font-extrabold tracking-[0.2em] uppercase">
                    <span className="heart-beat inline-block">❤️</span>
                    Our Sanctuary
                  </motion.div>

                  <motion.h1
                    variants={fadeUp}
                    className={`${plusJakarta.className} text-6xl sm:text-8xl md:text-[8rem] lg:text-[9.5rem] font-extrabold text-[#393832] tracking-tighter leading-[0.9] md:leading-[0.8]`}
                  >
                    {!isLoggedIn ? (
                      <>
                        Riceee <br />
                        <span style={{ whiteSpace: "nowrap" }}>
                          <span className="text-[#ab4400] italic font-light">X</span>{" "}
                          <span className="text-[#9d4867]">Hunter</span>
                        </span>
                      </>
                    ) : (
                      <>
                        {partnerNames.partnerOneName} <br />
                        <span className="text-[#ab4400] italic font-light">x</span>{" "}
                        <span className="text-[#9d4867]">{partnerNames.partnerTwoName}</span>
                      </>
                    )}
                  </motion.h1>

                  <motion.p variants={fadeUp} className="text-lg md:text-xl text-[#66645e] max-w-lg leading-relaxed font-medium">
                    A digital keepsake for your shared laughter, quiet moments, and
                    the beautiful journey of &ldquo;us&rdquo;.
                  </motion.p>

                  <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto">
                    <Link
                      href={ctaHref}
                      className="group bg-[#ab4400] text-white px-9 py-5 rounded-2xl font-bold shadow-2xl shadow-[#ab4400]/30 hover:shadow-[#ab4400]/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 text-lg"
                    >
                      <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">edit_note</span>
                      Start Today&apos;s Story
                    </Link>
                    <a
                      href="#how-it-works"
                      className="px-9 py-5 rounded-2xl font-bold border border-[#ab4400]/20 bg-white/70 text-[#ab4400] hover:bg-[#fff0e8] hover:border-[#ab4400]/40 transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      How it works
                      <span className="material-symbols-outlined text-xl">arrow_downward</span>
                    </a>
                  </motion.div>

                  <motion.div variants={fadeUp} className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9d4867]/60">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">lock</span> Private
                    </span>
                    <span>✦</span>
                    <span>Two hearts</span>
                    <span>✦</span>
                    <span>One space</span>
                  </motion.div>
                </div>

                {/* Scrapbook collage of the app itself */}
                <motion.div variants={fadeUp} className="flex-1 w-full max-w-sm md:max-w-md relative py-10 md:py-6">
                  {/* Journal entry card, peeking from behind */}
                  <div className="hero-float absolute top-2 -left-3 md:-left-14 w-[78%] bg-[#fdf9f4] rounded-[1.75rem] shadow-xl border border-[#ffdfcf] p-6 hidden sm:block" style={{ "--tilt": "-6deg", animationDelay: "1.6s" }}>
                    {/* washi tape */}
                    <div className="absolute -top-3 left-10 w-24 h-6 bg-[#ffae88]/50 rotate-[-4deg] rounded-sm" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-[#fff0e8] text-[#ab4400] border border-[#ffae88]/40 px-3 py-1 rounded-full text-[11px] font-bold">☀️ Golden</span>
                      <span className="text-[10px] text-[#9f8f83] font-bold uppercase tracking-widest">Today&apos;s entry</span>
                    </div>
                    <h5 className={`${plusJakarta.className} text-lg font-bold text-[#393832] leading-snug mb-2`}>
                      Today felt like sunlight
                    </h5>
                    <p className="text-sm text-[#66645e] italic leading-relaxed">
                      We did nothing special — groceries, bad jokes, your laugh in the car.
                      My favourite kind of day.
                    </p>
                    <p className="mt-4 text-[11px] text-[#9d4867]/70 font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      read by both of you
                    </p>
                  </div>

                  {/* Sweet Notes chat card, front */}
                  <div className="hero-float relative ml-auto w-full sm:w-[86%] bg-white/90 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-[#ffdfcf] overflow-hidden z-10" style={{ "--tilt": "2.5deg" }}>
                    <div className="bg-gradient-to-r from-[#ab4400] to-[#9d4867] text-white px-5 py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-white/15 border border-white/40 flex items-center justify-center text-base">💗</div>
                      <div>
                        <p className={`${plusJakarta.className} font-semibold leading-tight`}>Sweet Notes</p>
                        <p className="text-[11px] text-white/85 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active now
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#fffaf6] px-5 py-6 space-y-3">
                      <div className="flex justify-start">
                        <p className="bg-[#ffd9e2] text-[#8c4f68] rounded-[1.25rem] rounded-bl-md px-4 py-2.5 text-sm shadow-sm max-w-[85%]">
                          guess what I&apos;m smiling about 🙈
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <p className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white rounded-[1.25rem] rounded-br-md px-4 py-2.5 text-sm shadow-sm max-w-[85%]">
                          me. it&apos;s me, isn&apos;t it 😌
                        </p>
                      </div>
                      <div className="flex justify-start">
                        <p className="bg-[#ffd9e2] text-[#8c4f68] rounded-[1.25rem] rounded-bl-md px-4 py-2.5 text-sm shadow-sm max-w-[85%]">
                          ...annoyingly, yes ❤️
                        </p>
                      </div>
                      <div className="flex justify-end pt-1">
                        <div className="bg-white border border-[#ffdfcf] rounded-full px-3.5 py-2.5 shadow-sm flex items-center gap-1">
                          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#ab4400] inline-block" />
                          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#ab4400] inline-block" />
                          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#ab4400] inline-block" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day counter sticker */}
                  <div className="hero-float absolute -bottom-4 left-2 md:-left-4 bg-[#fed07f] text-[#634500] rounded-full px-5 py-2.5 shadow-lg z-20 rotate-[-5deg]" style={{ "--tilt": "-5deg", animationDelay: "0.8s" }}>
                    <span className={`${plusJakarta.className} text-sm font-extrabold`}>Day 214 of &ldquo;us&rdquo; 💛</span>
                  </div>

                  {/* Floating love-letter sticker */}
                  <div className="hero-float absolute -top-2 -right-2 md:-right-5 h-14 w-14 rounded-full bg-gradient-to-br from-[#ab4400] to-[#9d4867] shadow-xl shadow-[#ab4400]/30 flex items-center justify-center text-xl z-20" style={{ "--tilt": "8deg", animationDelay: "2.4s" }}>
                    💌
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ============ MARQUEE ============ */}
          <section aria-hidden="true" className="relative -mx-4 sm:-mx-6 md:-mx-8">
            <div className="border-y border-[#ffdfcf] bg-[#fff7f2]/80 backdrop-blur-sm py-4 overflow-hidden">
              <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap">
                {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                  <span key={i} className={`${plusJakarta.className} flex items-center gap-10 text-sm font-extrabold uppercase tracking-[0.3em] text-[#ab4400]/60`}>
                    {item}
                    <span className="text-[#9d4867]/50">✦</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ============ FEATURES BENTO ============ */}
          <section className="page-shell space-y-10">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="flex flex-col items-center text-center space-y-3"
            >
              <motion.h3 variants={fadeUp} className={`${plusJakarta.className} text-xs font-extrabold tracking-[0.4em] uppercase text-[#9d4867]/60`}>
                The Scrapbook Experience
              </motion.h3>
              <motion.h2 variants={fadeUp} className={`${plusJakarta.className} text-4xl md:text-5xl font-extrabold tracking-tight`}>
                Your Digital Keepsake
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[#66645e] max-w-xl font-medium">
                Everything two people need to keep their story in one warm, private place.
              </motion.p>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
            >
              {/* Journal — big card */}
              <motion.div variants={fadeUp} className="md:col-span-6 bg-[#ffae88]/10 p-8 md:p-12 rounded-[2rem] flex flex-col items-center text-center justify-center min-h-[320px] hover:bg-[#ffae88]/20 hover:-translate-y-1 transition-all duration-300 group border border-[#ab4400]/5">
                <div className="w-16 h-16 bg-[#ab4400] rounded-full flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 mb-6 shadow-lg shadow-[#ab4400]/20">
                  <span className="material-symbols-outlined text-3xl">stylus_note</span>
                </div>
                <div className="space-y-3">
                  <h4 className={`${plusJakarta.className} text-2xl font-bold text-[#6a2700]`}>Write Together</h4>
                  <p className="text-[#6a2700]/70 text-base leading-relaxed max-w-md">
                    A distraction-free journal for your deepest thoughts and shared
                    stories — with moods, comments, and collections to keep it all sorted.
                  </p>
                </div>
              </motion.div>

              {/* Memories */}
              <motion.div variants={fadeUp} className="md:col-span-3 bg-[#ebe8df]/40 p-8 md:p-10 rounded-[2rem] flex flex-col items-center text-center justify-center min-h-[320px] hover:shadow-lg hover:shadow-stone-200/50 hover:-translate-y-1 transition-all duration-300 border border-stone-200/40 group">
                <div className="w-14 h-14 bg-[#393832] text-[#fffbff] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                  <span className="material-symbols-outlined text-3xl">photo_library</span>
                </div>
                <div className="space-y-2">
                  <h4 className={`${plusJakarta.className} text-xl font-bold`}>Memories</h4>
                  <p className="text-[#66645e] text-sm leading-relaxed">
                    A polaroid wall of your favourite photos, captioned and kept forever.
                  </p>
                </div>
              </motion.div>

              {/* Riceee AI */}
              <motion.div variants={fadeUp} className="md:col-span-3 bg-[#ffd9e2]/15 p-8 md:p-10 rounded-[2rem] flex flex-col items-center text-center justify-center min-h-[320px] hover:bg-[#ffd9e2]/25 hover:-translate-y-1 transition-all duration-300 border border-[#9d4867]/5 group">
                <div className="w-14 h-14 bg-[#9d4867] text-white rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                </div>
                <div className="space-y-2">
                  <h4 className={`${plusJakarta.className} text-xl font-bold text-[#863655]`}>Riceee AI</h4>
                  <p className="text-[#863655]/70 text-sm leading-relaxed">
                    Your in-house companion — chat, reflect, and even settle disputes in the AI Courtroom.
                  </p>
                </div>
              </motion.div>

              {/* Games — wide card with chips */}
              <motion.div variants={fadeUp} className="md:col-span-7 bg-[#fdf9f4] p-8 md:p-12 rounded-[2rem] flex flex-col md:flex-row gap-10 items-center border border-[#bcb9b1]/10 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/60 transition-all duration-300 group">
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="w-14 h-14 bg-[#815f19] text-white rounded-full flex items-center justify-center mx-auto md:mx-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                    <span className="material-symbols-outlined text-3xl">sports_esports</span>
                  </div>
                  <div>
                    <h4 className={`${plusJakarta.className} text-2xl font-bold`}>10 Couple Games</h4>
                    <p className="text-[#66645e] text-base leading-relaxed">
                      Real-time games built for exactly two players. Open the same
                      game on both phones and the connection happens like magic.
                    </p>
                  </div>
                </div>
                <div className="flex-1 bg-white/60 rounded-2xl p-5 border border-stone-200/30 flex flex-wrap gap-2.5 justify-center">
                  {GAME_CHIPS.map((game) => (
                    <span
                      key={game.name}
                      className="bg-[#fff0e8] text-[#6a2700] border border-[#ffae88]/30 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-[#ffe3d4] hover:scale-105 transition-all cursor-default"
                    >
                      {game.emoji} {game.name}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Tonight's Prompt card */}
              <motion.div variants={fadeUp} className="md:col-span-5 relative overflow-hidden rounded-[2rem] group min-h-[320px] shadow-lg bg-[#393832] p-10 md:p-12 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                <div className="blob-drift absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#ffae88]/15 blur-3xl pointer-events-none" />
                <div className="blob-drift absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#ffd9e2]/10 blur-3xl pointer-events-none" style={{ animationDelay: "2s" }} />

                <div className="relative flex items-center gap-2 text-[#fed07f] text-[11px] font-extrabold uppercase tracking-[0.3em]">
                  <span className="material-symbols-outlined text-lg">tips_and_updates</span>
                  Tonight&apos;s Prompt
                </div>

                <p className={`${plusJakarta.className} relative text-[#fffbff] font-bold text-2xl md:text-[1.7rem] italic leading-snug`}>
                  &ldquo;What tiny moment from this week do you never want to forget?&rdquo;
                </p>

                <div className="relative flex items-center justify-between gap-4">
                  <p className="text-white/55 text-sm">
                    Answer it together tonight — it takes two minutes, and you&apos;ll keep it forever.
                  </p>
                  <span className="material-symbols-outlined text-[#ffae88] text-2xl shrink-0 group-hover:translate-x-1.5 transition-transform">arrow_forward</span>
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* ============ HOW IT WORKS ============ */}
          <section id="how-it-works" className="page-shell scroll-mt-28">
            <div className="relative bg-white/50 border border-[#ffdfcf]/60 rounded-[3rem] p-8 md:p-16 overflow-hidden">
              <div className="blob-drift absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#ffd9e2]/25 blur-3xl pointer-events-none" />
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="relative space-y-12"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <motion.h3 variants={fadeUp} className={`${plusJakarta.className} text-xs font-extrabold tracking-[0.4em] uppercase text-[#9d4867]/60`}>
                    Three Little Steps
                  </motion.h3>
                  <motion.h2 variants={fadeUp} className={`${plusJakarta.className} text-4xl md:text-5xl font-extrabold tracking-tight`}>
                    How It Works
                  </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
                  {STEPS.map((step, i) => (
                    <motion.div key={step.title} variants={fadeUp} className="relative flex flex-col items-center text-center gap-4 px-4">
                      {i < STEPS.length - 1 && (
                        <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-[#ffae88]/40" />
                      )}
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white flex items-center justify-center shadow-lg shadow-[#ab4400]/25 z-10">
                        <span className="material-symbols-outlined text-2xl">{step.icon}</span>
                        <span className={`${plusJakarta.className} absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#fed07f] text-[#634500] text-xs font-extrabold flex items-center justify-center border-2 border-white`}>
                          {i + 1}
                        </span>
                      </div>
                      <h4 className={`${plusJakarta.className} text-xl font-bold`}>{step.title}</h4>
                      <p className="text-[#66645e] text-sm leading-relaxed max-w-xs">{step.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* ============ QUOTES (existing) ============ */}
          <QuoteSection plusJakartaClassName={plusJakarta.className} />

          {/* ============ FINAL CTA ============ */}
          <section className="page-shell">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#ab4400] to-[#9d4867] p-10 md:p-20 text-center shadow-2xl shadow-[#ab4400]/25"
            >
              <div className="blob-drift absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="blob-drift absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" style={{ animationDelay: "2.5s" }} />
              <div className="relative space-y-7">
                <span className="heart-beat inline-block text-5xl">💗</span>
                <h2 className={`${plusJakarta.className} text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight`}>
                  Every love story deserves <br className="hidden md:block" /> a beautiful home.
                </h2>
                <p className="text-white/85 text-lg max-w-xl mx-auto font-medium">
                  Start yours today — it takes less than a minute, and it&apos;s yours forever.
                </p>
                <div className="pt-2">
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-3 bg-white text-[#ab4400] px-10 py-5 rounded-2xl font-extrabold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">favorite</span>
                    Begin Your Story
                  </Link>
                </div>
                <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.25em]">
                  Private ✦ Just for two ✦ Free to start
                </p>
              </div>
            </motion.div>
          </section>
        </main>

        {/* ============ FOOTER ============ */}
        <footer className="w-full py-10 px-10 mt-10 bg-stone-50/70 backdrop-blur-sm border-t border-stone-200/40 text-[12px] font-medium uppercase tracking-wider text-stone-400">
          <div className="page-shell flex flex-col md:flex-row justify-between items-center gap-10">
            <div className={`${plusJakarta.className} font-bold text-stone-700 tracking-tighter normal-case text-lg flex items-center gap-2`}>
              Riceee <span className="heart-beat inline-block text-sm">💗</span>
            </div>
            <div className="flex flex-wrap gap-8 items-center justify-center">
              <Link className="hover:text-[#ab4400] transition-all" href="/journal/write">Journal</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/memories">Memories</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/games">Games</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/riceee-chat">Riceee AI</Link>
              <Link className="hover:text-[#ab4400] transition-all" href="/settings">Settings</Link>
            </div>
            <div className="normal-case text-stone-500">© 2026 Riceee. Handcrafted with love.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
