import React from "react";
import { Space_Grotesk, Inter } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400"] });

export function VerdictCard() {
  return (
    <div className={`w-full max-w-[800px] relative font-sans mx-auto pb-12 ${inter.className}`}>
      {/* Ambient Pulsing Glow Behind Card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[#c4b5fd]/10 blur-[80px] rounded-full pointer-events-none -z-10 animate-pulse"
        style={{ animationDuration: '4s' }}
      ></div>

      {/* The Card Surface */}
      <div className="relative rounded-2xl overflow-hidden bg-[rgba(30,30,47,0.6)] backdrop-blur-[24px] shadow-[0_0_40px_rgba(196,181,253,0.05)] p-6 md:p-10 border border-white/15" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(30,30,47,0.6)' }}>
        {/* Thick Left-Hand Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#c4b5fd] shadow-[0_0_15px_rgba(196,181,253,0.2)]"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 relative z-10 border-b border-white/10 pb-6">
          <h1 className={`text-[32px] font-bold text-[#e3e0f8] tracking-[-0.02em] ${spaceGrotesk.className}`}>The Court's Ruling</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2b] border border-white/5 w-fit">
            <span className="material-symbols-outlined text-[18px] text-[#c4b5fd]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className={`text-[12px] font-bold tracking-[0.1em] uppercase text-[#c4b5fd] ${spaceGrotesk.className}`}>Verified AI Verdict</span>
          </div>
        </div>

        {/* Section 1: The Root Cause */}
        <div className="mb-10 relative z-10">
          <h2 className={`text-[12px] font-bold tracking-[0.1em] uppercase text-[#c4b5fd] mb-3 flex items-center gap-2 ${spaceGrotesk.className}`}>
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'wght' 300" }}>psychiatry</span>
            The Root Cause
          </h2>
          <div className="bg-[#1a1a2b] rounded-xl p-6 border border-white/5 relative overflow-hidden group hover:bg-[#1e1e2f] transition-colors duration-500">
            <p className="text-[18px] text-[#cac4d1] relative z-10 leading-[1.6]">
              The conflict stems from unexpressed expectations regarding domestic emotional labor, masquerading as arguments about scheduling. Both parties are operating from a place of defensive burnout rather than active malice.
            </p>
          </div>
        </div>

        {/* Section 2: Accountability */}
        <div className="mb-10 relative z-10">
          <h2 className={`text-[12px] font-bold tracking-[0.1em] uppercase text-[#c4b5fd] mb-4 flex items-center gap-2 ${spaceGrotesk.className}`}>
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'wght' 300" }}>balance</span>
            Accountability
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Initiator's Role */}
            <div className="bg-[#1e1e2f] rounded-xl p-6 border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#c4b5fd]/10 blur-[30px] rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className={`text-[18px] font-semibold text-[#e3e0f8] mb-5 tracking-[-0.02em] ${spaceGrotesk.className}`}>Initiator's Role</h3>
              <ul className="space-y-4 text-[16px] text-[#cac4d1] relative z-10">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#c4b5fd]/50 text-[20px] mt-0.5 shrink-0">keyboard_arrow_right</span>
                  <span>Relying on absolute statements ("You always...", "You never...") which force the respondent into a defensive posture.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#c4b5fd]/50 text-[20px] mt-0.5 shrink-0">keyboard_arrow_right</span>
                  <span>Expecting anticipation of needs without providing explicit, structured communication.</span>
                </li>
              </ul>
            </div>

            {/* Respondent's Role */}
            <div className="bg-[#1e1e2f] rounded-xl p-6 border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#c4b5fd]/10 blur-[30px] rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className={`text-[18px] font-semibold text-[#e3e0f8] mb-5 tracking-[-0.02em] ${spaceGrotesk.className}`}>Respondent's Role</h3>
              <ul className="space-y-4 text-[16px] text-[#cac4d1] relative z-10">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#c4b5fd]/50 text-[20px] mt-0.5 shrink-0">keyboard_arrow_right</span>
                  <span>Defaulting to immediate defensiveness instead of pausing to acknowledge the underlying frustration being expressed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#c4b5fd]/50 text-[20px] mt-0.5 shrink-0">keyboard_arrow_right</span>
                  <span>Inconsistent follow-through on minor agreed-upon tasks, which incrementally erodes foundational trust.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 3: The Way Forward */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#1a1a2b] flex items-center justify-center border border-white/5 shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              <span className="material-symbols-outlined text-[#c4b5fd] text-[22px]" style={{ fontVariationSettings: "'wght' 300" }}>volunteer_activism</span>
            </div>
            <h2 className={`text-[22px] font-semibold text-[#e3e0f8] tracking-[-0.02em] ${spaceGrotesk.className}`}>The Way Forward</h2>
          </div>
          <div className="space-y-3">
            {[
              "Establish a mandatory 10-minute weekly \"sync\" on Sunday evenings to divide upcoming domestic tasks explicitly, removing the burden of assumption.",
              "Initiator must consciously replace all absolute statements (\"always/never\") with specific \"I feel\" statements starting immediately.",
              "Respondent commits to one specific, unprompted act of service per week to actively demonstrate engagement and rebuild trust."
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-[#1e1e2f] border border-white/5 hover:bg-[#29283a] transition-all duration-300">
                <div className={`w-6 h-6 shrink-0 rounded-full bg-[#c4b5fd] text-[#121222] flex items-center justify-center text-[10px] font-bold mt-0.5 shadow-[0_0_10px_rgba(196,181,253,0.3)] ${spaceGrotesk.className}`}>{i + 1}</div>
                <p className="text-[16px] text-[#cac4d1]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action / Acknowledgment */}
        <div className="mt-10 pt-8 border-t border-white/10 flex justify-end relative z-10">
          <button className={`bg-[#c4b5fd] text-[#121222] text-[12px] font-bold tracking-[0.1em] uppercase px-8 py-3.5 rounded-lg hover:shadow-[0_0_20px_rgba(196,181,253,0.4)] transition-all duration-300 flex items-center gap-2 ${spaceGrotesk.className}`}>
            Accept Verdict
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
